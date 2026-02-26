import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { Prisma } from '@prisma/client'

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
  `
  return rows.map(r => r.id)
}

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const search = sp.get('search') || ''
  const statusFilter = sp.get('status') || ''
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const limit = Math.min(50, parseInt(sp.get('limit') || '20'))
  const skip = (page - 1) * limit

  const isSemPedido = statusFilter === 'SEM_PEDIDO'
  const needsIncomplete = !statusFilter || statusFilter === 'INCOMPLETAS' || isSemPedido

  const incompleteIds = needsIncomplete ? await getIncompleteIds() : []

  const conditions: Prisma.TitleWhereInput[] = [{ type: 'TV' }]

  if (search) {
    const matches = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Title"
      WHERE type = 'TV'
        AND unaccent(lower(title)) LIKE unaccent(lower(${`%${search}%`}))
      LIMIT 100
    `
    conditions.push({ id: { in: matches.map(r => r.id) } })
  }

  if (statusFilter === 'EM_ANDAMENTO') {
    conditions.push({ tvStatus: 'EM_ANDAMENTO' })
  } else if (statusFilter === 'INCOMPLETAS') {
    conditions.push({ id: { in: incompleteIds } })
  } else {
    // Default ou SEM_PEDIDO: EM_ANDAMENTO + INCOMPLETAS
    conditions.push({ OR: [{ tvStatus: 'EM_ANDAMENTO' }, { id: { in: incompleteIds } }] })
  }

  if (isSemPedido) {
    conditions.push({ requests: { none: { isUpdate: true } } })
  }

  const where: Prisma.TitleWhereInput = conditions.length === 1 ? conditions[0] : { AND: conditions }

  const [total, titles] = await Promise.all([
    prisma.title.count({ where }),
    prisma.title.findMany({
      where,
      skip,
      take: limit,
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        posterUrl: true,
        tvSeasons: true,
        tvEpisodes: true,
        tvStatus: true,
        tmdbId: true,
        _count: { select: { episodes: true } },
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
            createdAt: true,
            createdById: true,
            createdBy: { select: { name: true, email: true } },
          },
        },
      },
    }),
  ])

  const series = titles.map(({ requests, _count, ...t }) => ({
    ...t,
    savedEpisodeCount: _count.episodes,
    latestRequest: requests[0] ?? null,
  }))

  return NextResponse.json({ series, total, page, limit, pages: Math.ceil(total / limit) })
}
