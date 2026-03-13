import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { Prisma, RequestStatus } from '@prisma/client'
import { z } from 'zod'

const StatusFilterSchema = z.enum([
  '', 'PEDIDOS', 'EM_ANDAMENTO', 'INCOMPLETAS',
  'SOLICITADO_VITRINE', 'ATUALIZADO_RECENTEMENTE', 'CONCLUIDAS',
])

// Séries FINALIZADA com episódios faltando E sem pedido isUpdate CONCLUIDO
async function getIncompleteIds(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT t.id FROM "Title" t
    LEFT JOIN (
      SELECT "titleId", COUNT(*)::int AS cnt FROM "TitleEpisode" GROUP BY "titleId"
    ) e ON e."titleId" = t.id
    WHERE t.type = 'TV'
    AND t."tvStatus" = 'FINALIZADA'
    AND (
      (t."tvEpisodes" IS NOT NULL AND t."tvEpisodes" > 0 AND COALESCE(e.cnt, 0) < t."tvEpisodes")
      OR COALESCE(e.cnt, 0) = 0
    )
    AND NOT EXISTS (
      SELECT 1 FROM "Request" r
      WHERE r."linkedTitleId" = t.id
      AND r."isUpdate" = true
      AND r.status = 'CONCLUIDO'
    )
  `
  return rows.map(r => r.id)
}

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
  const sp = req.nextUrl.searchParams
  const search = sp.get('search') || ''
  const statusRaw = sp.get('status') || ''
  const statusParsed = StatusFilterSchema.safeParse(statusRaw)
  if (!statusParsed.success) {
    return NextResponse.json({ error: 'Filtro de status inválido' }, { status: 400 })
  }
  const statusFilter = statusParsed.data
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const limit = Math.min(50, parseInt(sp.get('limit') || '20'))
  const skip = (page - 1) * limit

  const needsIncomplete = statusFilter === 'INCOMPLETAS'
  const incompleteIds = needsIncomplete ? await getIncompleteIds() : []

  // Short-circuit: INCOMPLETAS with no candidates
  if (needsIncomplete && incompleteIds.length === 0) {
    return NextResponse.json({ series: [], total: 0, page, limit, pages: 0 })
  }

  // Search: get matching IDs
  let searchIds: string[] | null = null
  if (search) {
    const matches = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Title"
      WHERE type = 'TV'
        AND unaccent(lower(title)) LIKE unaccent(lower(${`%${search}%`}))
      LIMIT 100
    `
    if (matches.length === 0) {
      return NextResponse.json({ series: [], total: 0, page, limit, pages: 0 })
    }
    searchIds = matches.map(r => r.id)
  }

  // Build composable SQL filter condition
  let filter = Prisma.sql`TRUE`

  if (searchIds !== null) {
    filter = Prisma.sql`${filter} AND t.id IN (${Prisma.join(searchIds)})`
  }

  if (statusFilter === 'PEDIDOS') {
    filter = Prisma.sql`${filter} AND EXISTS (
      SELECT 1 FROM "Request" r2 WHERE r2."linkedTitleId" = t.id
        AND r2."isUpdate" = true AND r2.source = 'PEDIDO'
        AND r2.status IN ('ABERTO', 'EM_ANDAMENTO', 'EM_PROGRESSO')
    )`
  } else if (statusFilter === 'EM_ANDAMENTO') {
    filter = Prisma.sql`${filter} AND t."tvStatus" = 'EM_ANDAMENTO'`
  } else if (statusFilter === 'INCOMPLETAS') {
    filter = Prisma.sql`${filter} AND t.id IN (${Prisma.join(incompleteIds)})`
  } else if (statusFilter === 'SOLICITADO_VITRINE') {
    filter = Prisma.sql`${filter} AND EXISTS (
      SELECT 1 FROM "Request" r2 WHERE r2."linkedTitleId" = t.id
        AND r2."isUpdate" = true AND r2.source = 'VITRINE'
        AND r2.status IN ('ABERTO', 'EM_ANDAMENTO', 'EM_PROGRESSO')
    )`
  } else if (statusFilter === 'ATUALIZADO_RECENTEMENTE') {
    filter = Prisma.sql`${filter} AND EXISTS (
      SELECT 1 FROM "Request" r2 WHERE r2."linkedTitleId" = t.id
        AND r2."isUpdate" = true AND r2.status = 'CONCLUIDO'
    )`
  } else if (statusFilter === 'CONCLUIDAS') {
    filter = Prisma.sql`${filter} AND t."tvStatus" = 'FINALIZADA' AND EXISTS (
      SELECT 1 FROM "Request" r2 WHERE r2."linkedTitleId" = t.id
        AND r2."isUpdate" = true AND r2.status = 'CONCLUIDO'
    )`
  }

  // Run count + sorted IDs in parallel
  // IDs ordered by pendingUpdateCount (VITRINE+isUpdate+not-CONCLUIDO) desc, then title asc
  const [totalResult, sortedRows] = await Promise.all([
    prisma.$queryRaw<[{ n: bigint }]>`
      SELECT COUNT(DISTINCT t.id)::bigint AS n
      FROM "Title" t WHERE t.type = 'TV' AND ${filter}
    `,
    prisma.$queryRaw<{ id: string }[]>`
      SELECT t.id
      FROM "Title" t
      LEFT JOIN "Request" pending ON pending."linkedTitleId" = t.id
        AND pending."isUpdate" = true
        AND pending.source = 'VITRINE'
        AND pending.status != 'CONCLUIDO'
      WHERE t.type = 'TV' AND ${filter}
      GROUP BY t.id, t.title
      ORDER BY COUNT(pending.id) DESC, t.title ASC
      LIMIT ${limit} OFFSET ${skip}
    `,
  ])

  const total = Number(totalResult[0].n)
  const idOrder = sortedRows.map(r => r.id)

  if (idOrder.length === 0) {
    return NextResponse.json({ series: [], total, page, limit, pages: Math.ceil(total / limit) })
  }

  // Fetch full records for this page using the sorted IDs
  const titles = await prisma.title.findMany({
    where: { id: { in: idOrder } },
    select: {
      id: true,
      title: true,
      posterUrl: true,
      tvSeasons: true,
      tvEpisodes: true,
      tvStatus: true,
      tmdbId: true,
      _count: {
        select: {
          episodes: true,
          requests: {
            where: { isUpdate: true, source: 'VITRINE', status: { not: 'CONCLUIDO' as RequestStatus } },
          },
        },
      },
      requests: {
        where: { isUpdate: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          audioType: true,
          seasonNumber: true,
          notes: true,
          source: true,
          createdAt: true,
          createdById: true,
          createdBy: { select: { name: true, email: true } },
        },
      },
    },
  })

  // Re-sort by idOrder (findMany with `in` does not guarantee order)
  const titlesMap = new Map(titles.map(t => [t.id, t]))
  const ordered = idOrder.map(id => titlesMap.get(id)).filter((t): t is NonNullable<typeof t> => t != null)

  const series = ordered.map(({ requests, _count, ...t }) => ({
    ...t,
    savedEpisodeCount: _count.episodes,
    pendingUpdateCount: _count.requests,
    latestRequest: requests[0] ?? null,
  }))

  return NextResponse.json({ series, total, page, limit, pages: Math.ceil(total / limit) })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
