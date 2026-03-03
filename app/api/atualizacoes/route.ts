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

  const activeStatuses: RequestStatus[] = ['ABERTO', 'EM_ANDAMENTO', 'EM_PROGRESSO']

  if (statusFilter === 'PEDIDOS') {
    // TV com isUpdate request criado explicitamente via "Nova Atualização"
    conditions.push({
      requests: {
        some: {
          isUpdate: true,
          source: 'PEDIDO',
          status: { in: activeStatuses },
        },
      },
    })
  } else if (statusFilter === 'EM_ANDAMENTO') {
    conditions.push({ tvStatus: 'EM_ANDAMENTO' })
  } else if (statusFilter === 'INCOMPLETAS') {
    conditions.push({ id: { in: incompleteIds } })
  } else if (statusFilter === 'SOLICITADO_VITRINE') {
    // TV with isUpdate request, source=VITRINE, status ativo
    conditions.push({
      requests: {
        some: {
          isUpdate: true,
          source: 'VITRINE',
          status: { in: activeStatuses },
        },
      },
    })
  } else if (statusFilter === 'ATUALIZADO_RECENTEMENTE') {
    // TV com qualquer isUpdate CONCLUIDO
    conditions.push({
      requests: {
        some: {
          isUpdate: true,
          status: 'CONCLUIDO' as RequestStatus,
        },
      },
    })
  } else if (statusFilter === 'CONCLUIDAS') {
    // tvStatus=FINALIZADA + tem CONCLUIDO isUpdate request
    conditions.push({
      tvStatus: 'FINALIZADA',
      requests: {
        some: {
          isUpdate: true,
          status: 'CONCLUIDO' as RequestStatus,
        },
      },
    })
  }
  // statusFilter === '' → Todas (sem filtro extra)

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
            source: true,
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
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
