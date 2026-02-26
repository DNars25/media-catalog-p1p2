import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { Prisma, RequestStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const search = sp.get('search') || ''
  const statusFilter = sp.get('status') || ''
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const limit = Math.min(50, parseInt(sp.get('limit') || '20'))
  const skip = (page - 1) * limit

  const where: Prisma.TitleWhereInput = { type: 'TV', tvStatus: 'EM_ANDAMENTO' }

  if (search) {
    const matches = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Title"
      WHERE type = 'TV' AND "tvStatus" = 'EM_ANDAMENTO'
        AND unaccent(lower(title)) LIKE unaccent(lower(${`%${search}%`}))
      LIMIT 100
    `
    where.id = { in: matches.map(r => r.id) }
  }

  if (statusFilter === 'SEM_PEDIDO') {
    where.requests = { none: { isUpdate: true } }
  } else if (statusFilter) {
    where.requests = { some: { isUpdate: true, status: statusFilter as RequestStatus } }
  }

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
        tmdbId: true,
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

  const series = titles.map(({ requests, ...t }) => ({
    ...t,
    latestRequest: requests[0] ?? null,
  }))

  return NextResponse.json({ series, total, page, limit, pages: Math.ceil(total / limit) })
}
