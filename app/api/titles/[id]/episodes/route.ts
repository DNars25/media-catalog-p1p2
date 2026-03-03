import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/rbac'
import { EpisodesUpdateSchema, EpisodeDeleteSchema } from '@/lib/validators'

// PATCH: add-only (sem apagar existentes)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
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

      // Library sync: update tvSeasons and savedEpisodeCount on Title
      const allEps = await prisma.titleEpisode.findMany({
        where: { titleId: params.id },
        select: { season: true, episode: true },
      })
      const maxSeason = allEps.length > 0 ? Math.max(...allEps.map(e => e.season)) : 0
      const currentTitle = await prisma.title.findUnique({ where: { id: params.id }, select: { tvSeasons: true } })
      const updateData: { tvSeasons?: number } = {}
      if (maxSeason > 0 && (!currentTitle?.tvSeasons || maxSeason > currentTitle.tvSeasons)) {
        updateData.tvSeasons = maxSeason
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.title.update({ where: { id: params.id }, data: updateData })
      }
    }

    const episodes = await prisma.titleEpisode.findMany({
      where: { titleId: params.id },
      orderBy: [{ season: 'asc' }, { episode: 'asc' }],
    })

    return NextResponse.json({ episodes })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE: remove episódio específico ou temporada inteira
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const title = await prisma.title.findUnique({ where: { id: params.id } })
    if (!title) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const parsed = EpisodeDeleteSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { season, episode = null } = parsed.data

    if (episode !== null) {
      await prisma.titleEpisode.deleteMany({
        where: { titleId: params.id, season, episode },
      })
    } else {
      await prisma.titleEpisode.deleteMany({
        where: { titleId: params.id, season },
      })
    }

    // Recalculate tvSeasons after deletion
    const remaining = await prisma.titleEpisode.findMany({
      where: { titleId: params.id },
      select: { season: true },
    })
    const maxSeason = remaining.length > 0 ? Math.max(...remaining.map(e => e.season)) : 0
    await prisma.title.update({
      where: { id: params.id },
      data: { tvSeasons: maxSeason > 0 ? maxSeason : null },
    })

    const episodes = await prisma.titleEpisode.findMany({
      where: { titleId: params.id },
      orderBy: [{ season: 'asc' }, { episode: 'asc' }],
    })

    return NextResponse.json({ episodes })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT: substitui tudo (usado ao cadastrar/editar título)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
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
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
