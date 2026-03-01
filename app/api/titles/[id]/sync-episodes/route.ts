import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/rbac'
import { getTMDBDetails } from '@/lib/tmdb'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const title = await prisma.title.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, tmdbId: true, type: true },
    })
    if (!title) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (title.type !== 'TV') return NextResponse.json({ error: 'Apenas séries' }, { status: 400 })

    const existingCount = await prisma.titleEpisode.count({ where: { titleId: params.id } })
    if (existingCount > 0) return NextResponse.json({ error: 'Já possui episódios' }, { status: 409 })

    const tmdb = await getTMDBDetails('tv', title.tmdbId)
    const seasons = tmdb.type === 'TV' ? tmdb.seasons : []
    const validSeasons = seasons.filter(s => s.season_number > 0 && s.episode_count > 0)

    if (validSeasons.length === 0)
      return NextResponse.json({ error: 'Sem temporadas disponíveis no TMDB' }, { status: 404 })

    const episodesData = validSeasons.flatMap(s =>
      Array.from({ length: s.episode_count }, (_, i) => ({
        titleId: params.id,
        season: s.season_number,
        episode: i + 1,
      }))
    )

    await prisma.titleEpisode.createMany({ data: episodesData, skipDuplicates: true })

    const maxSeason = Math.max(...validSeasons.map(s => s.season_number))
    await prisma.title.update({ where: { id: params.id }, data: { tvSeasons: maxSeason } })

    const episodes = await prisma.titleEpisode.findMany({
      where: { titleId: params.id },
      orderBy: [{ season: 'asc' }, { episode: 'asc' }],
    })

    return NextResponse.json({ episodes, totalCreated: episodesData.length })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
