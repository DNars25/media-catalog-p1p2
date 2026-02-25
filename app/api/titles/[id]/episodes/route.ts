import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { EpisodesUpdateSchema } from '@/lib/validators'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth()
  if (error) return error

  const title = await prisma.title.findUnique({ where: { id: params.id } })
  if (!title) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = EpisodesUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await prisma.titleEpisode.deleteMany({ where: { titleId: params.id } })

  if (parsed.data.episodesData.length > 0) {
    await prisma.titleEpisode.createMany({
      data: parsed.data.episodesData.map(e => ({
        titleId: params.id,
        season: e.season,
        episode: e.episode,
      }))
    })
  }

  const episodes = await prisma.titleEpisode.findMany({
    where: { titleId: params.id },
    orderBy: [{ season: 'asc' }, { episode: 'asc' }],
  })

  return NextResponse.json({ episodes })
}
