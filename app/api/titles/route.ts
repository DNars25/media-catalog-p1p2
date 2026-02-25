import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, requireAuth } from '@/lib/rbac'
import { TitleCreateSchema } from '@/lib/validators'
import { findTitleIdsByText } from '@/lib/search'
import { Prisma, TitleType, InternalStatus, TvStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const search = sp.get('search') || ''
  const type = sp.get('type') || ''
  const p1 = sp.get('p1')
  const p2 = sp.get('p2')
  const internalStatus = sp.get('internalStatus') || ''
  const tvStatus = sp.get('tvStatus') || ''
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const limit = Math.min(50, parseInt(sp.get('limit') || '20'))
  const skip = (page - 1) * limit

  const where: Prisma.TitleWhereInput = {}
  if (search) {
    const ids = await findTitleIdsByText(search)
    where.id = { in: ids }
  }
  if (type) where.type = type as TitleType
  if (p1 === 'true') where.hasP1 = true
  if (p1 === 'false') where.hasP1 = false
  if (p2 === 'true') where.hasP2 = true
  if (p2 === 'false') where.hasP2 = false
  const audioType = sp.get('audioType')
  if (audioType) where.audioType = audioType
  if (internalStatus) where.internalStatus = internalStatus as InternalStatus
  if (tvStatus) where.tvStatus = tvStatus as TvStatus
  const tmdbIdParam = sp.get('tmdbId')
  if (tmdbIdParam && !isNaN(Number(tmdbIdParam))) where.tmdbId = parseInt(tmdbIdParam, 10)

  const [total, titles] = await Promise.all([
    prisma.title.count({ where }),
    prisma.title.findMany({
      where,
      orderBy: { title: 'asc' },
      skip,
      take: limit,
      include: { createdBy: { select: { name: true, email: true } } },
    }),
  ])

  return NextResponse.json({ titles, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = TitleCreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await prisma.title.findUnique({
    where: { tmdbId_type: { tmdbId: parsed.data.tmdbId, type: parsed.data.type } },
  })
  if (existing) return NextResponse.json({ error: 'Title already exists' }, { status: 409 })

  const { episodesData, ...titleData } = parsed.data
  const title = await prisma.title.create({
    data: { ...titleData, createdById: session!.user.id },
  })

  if (episodesData && episodesData.length > 0) {
    await prisma.titleEpisode.createMany({
      data: episodesData.map(e => ({
        titleId: title.id,
        season: e.season,
        episode: e.episode,
      }))
    })
  }

  return NextResponse.json(title, { status: 201 })
}
