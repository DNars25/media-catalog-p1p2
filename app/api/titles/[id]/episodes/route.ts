import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { EpisodesUpdateSchema } from '@/lib/validators'

// PATCH: add-only (sem apagar existentes)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth()
  if (error) return error

  const title = await prisma.title.findUnique({ where: { id: params.id } })
  if (!title) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = EpisodesUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  if (parsed.data.episodesData.length > 0) {
    await prisma.titleEpisode.createMany({
      data: parsed.data.episodesData.map(e => ({
        titleId: params.id,
        season: e.season,
        episode: e.episode,
      })),
      skipDuplicates: true,
    })
  }

  const episodes = await prisma.titleEpisode.findMany({
    where: { titleId: params.id },
    orderBy: [{ season: 'asc' }, { episode: 'asc' }],
  })

  return NextResponse.json({ episodes })
}

// PUT: substitui tudo (usado ao cadastrar/editar título)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth()
  if (error) return error

  const title = await prisma.title.findUnique({ where: { id: params.id } })
  if (!title) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = EpisodesUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await prisma.$transaction(async (tx) => {
    await tx.titleEpisode.deleteMany({ where: { titleId: params.id } })
    if (parsed.data.episodesData.length > 0) {
      await tx.titleEpisode.createMany({
        data: parsed.data.episodesData.map(e => ({
          titleId: params.id,
          season: e.season,
          episode: e.episode,
        }))
      })
    }
  })

  const episodes = await prisma.titleEpisode.findMany({
    where: { titleId: params.id },
    orderBy: [{ season: 'asc' }, { episode: 'asc' }],
  })

  return NextResponse.json({ episodes })
}
