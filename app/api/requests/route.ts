import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { findRequestIdsByText } from '@/lib/search'
import { RequestCreateSchema } from '@/lib/validators'
import { Prisma, RequestStatus } from '@prisma/client'
import { logAudit } from '@/lib/audit'
import { sendRequestCreated } from '@/lib/email'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const search = sp.get('search') || ''
  const status = sp.get('status') || ''
  const type = sp.get('type') || ''
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const limit = Math.min(50, parseInt(sp.get('limit') || '20'))
  const skip = (page - 1) * limit

  const where: Prisma.RequestWhereInput = { isCorrection: false }
  if (search) {
    const ids = await findRequestIdsByText(search)
    where.id = { in: ids }
  }
  if (status) where.status = status as RequestStatus
  if (type) where.type = type as Prisma.EnumTitleTypeFilter
  const isUpdate = sp.get("isUpdate")
  if (isUpdate === "true") where.isUpdate = true
  if (isUpdate === "false") where.isUpdate = false
  const priority = sp.get("priority")
  if (priority === "true") where.priority = true
  const from = sp.get("from")
  const to = sp.get("to")
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const sort = sp.get('sort') || 'recent'

  // Count-sorted path for MOVIE type (raw SQL with window-style CTE)
  if (type === 'MOVIE' && sort === 'count' && !search) {
    const statusParam = status || null
    const isUpdateBool = isUpdate === 'false' ? false : isUpdate === 'true' ? true : null
    const priorityBool = priority === 'true' ? true : null

    const [countRows, idRows] = await Promise.all([
      prisma.$queryRaw<[{ n: bigint }]>`
        SELECT COUNT(*)::bigint AS n FROM "Request"
        WHERE "isCorrection" = false AND type = 'MOVIE'
          AND (${statusParam}::text IS NULL OR status::text = ${statusParam})
          AND (${isUpdateBool}::boolean IS NULL OR "isUpdate" = ${isUpdateBool})
          AND (${priorityBool}::boolean IS NULL OR priority = ${priorityBool})
      `,
      prisma.$queryRaw<{ id: string; cnt: number }[]>`
        WITH movie_counts AS (
          SELECT "tmdbId", COUNT(*)::int AS cnt FROM "Request"
          WHERE type = 'MOVIE' AND "isCorrection" = false AND status != 'CONCLUIDO' AND "tmdbId" IS NOT NULL
          GROUP BY "tmdbId"
        )
        SELECT r.id, COALESCE(mc.cnt, 1)::int AS cnt FROM "Request" r
        LEFT JOIN movie_counts mc ON mc."tmdbId" = r."tmdbId"
        WHERE r."isCorrection" = false AND r.type = 'MOVIE'
          AND (${statusParam}::text IS NULL OR r.status::text = ${statusParam})
          AND (${isUpdateBool}::boolean IS NULL OR r."isUpdate" = ${isUpdateBool})
          AND (${priorityBool}::boolean IS NULL OR r.priority = ${priorityBool})
        ORDER BY r.priority DESC, COALESCE(mc.cnt, 1) DESC, r."createdAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `,
    ])

    const total = Number(countRows[0].n)
    const idOrder = idRows.map(r => r.id)
    const countById: Record<string, number> = Object.fromEntries(idRows.map(r => [r.id, r.cnt]))

    const fullRequests = await prisma.request.findMany({
      where: { id: { in: idOrder } },
      include: {
        createdBy: { select: { name: true, email: true } },
        linkedTitle: { select: { id: true, title: true } },
        completedBy: { select: { name: true } },
      },
    })

    const enrichedRequests = idOrder
      .map(id => fullRequests.find(r => r.id === id))
      .filter((r): r is NonNullable<typeof r> => r != null)
      .map(r => ({ ...r, requestCount: countById[r.id] }))

    return NextResponse.json({ requests: enrichedRequests, total, page, limit, pages: Math.ceil(total / limit) })
  }

  const [total, requests] = await Promise.all([
    prisma.request.count({ where }),
    prisma.request.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
      include: {
        createdBy: { select: { name: true, email: true } },
        linkedTitle: { select: { id: true, title: true } },
        completedBy: { select: { name: true } },
      },
    }),
  ])

  // Annotate movie requests with request count per tmdbId
  let requestCountMap: Record<number, number> = {}
  if (type === 'MOVIE') {
    const counts = await prisma.request.groupBy({
      by: ['tmdbId'],
      where: { type: 'MOVIE', isCorrection: false, status: { not: 'CONCLUIDO' as RequestStatus }, tmdbId: { not: null } },
      _count: { id: true },
    })
    requestCountMap = Object.fromEntries(
      counts.filter(c => c.tmdbId != null).map(c => [c.tmdbId!, c._count.id])
    )
  }

  const enriched = type === 'MOVIE'
    ? requests.map(r => ({ ...r, requestCount: r.tmdbId != null ? (requestCountMap[r.tmdbId] ?? 1) : 1 }))
    : requests

  return NextResponse.json({ requests: enriched, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const parsed = RequestCreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { requestedTitle, type, notes, preferredSystem, tmdbId, posterUrl, isUpdate, seasonNumber, audioType, linkedTitleId, source, status, priority } = parsed.data

  const request = await prisma.request.create({
    data: {
      requestedTitle,
      type,
      notes: notes ?? null,
      preferredSystem: preferredSystem ?? null,
      tmdbId: tmdbId ?? null,
      posterUrl: posterUrl ?? null,
      isUpdate,
      seasonNumber: seasonNumber ?? null,
      audioType: audioType ?? null,
      linkedTitleId: linkedTitleId ?? null,
      source,
      priority,
      createdById: session!.user.id,
      ...(status ? { status } : {}),
    },
  })

  logAudit({ entityType: 'Request', entityId: request.id, action: 'CREATE', userId: session!.user.id, after: request })

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true, name: true } })
  const createdBy = await prisma.user.findUnique({ where: { id: session!.user.id }, select: { name: true } })
  sendRequestCreated({
    adminEmails: admins.map(a => a.email),
    requestTitle: requestedTitle,
    requestedByName: createdBy?.name ?? session!.user.email ?? 'Usuário',
    type,
    notes,
  })

  return NextResponse.json(request, { status: 201 })
}