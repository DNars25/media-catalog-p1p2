import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { searchTMDB, TmdbSearchResult } from '@/lib/tmdb'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') || ''
  const type = searchParams.get('type') || 'MOVIE'
  if (query.length < 2) return NextResponse.json({ local: [], tmdb: [] })

  const tmdbType = type === 'MOVIE' ? 'movie' : 'tv'
  const localType = type === 'MOVIE' ? 'MOVIE' : 'TV'

  const tmdbMatches = await searchTMDB(query, tmdbType as 'movie' | 'tv').catch(
    () => [] as TmdbSearchResult[]
  )
  const tmdbIds = tmdbMatches.map(r => r.tmdbId)

  const local = await prisma.title.findMany({
    where: {
      type: localType,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { title: { contains: query.replace(/&/g, 'e'), mode: 'insensitive' } },
        { title: { contains: query.replace(/e/g, '&'), mode: 'insensitive' } },
        { tmdbId: { in: tmdbIds } },
      ],
    },
    select: { id: true, title: true, releaseYear: true, hasP1: true, hasP2: true, type: true, posterUrl: true, tmdbId: true },
    take: 20,
  })

  const localMapped = local.map(t => ({
    id: t.id,
    title: t.title,
    year: t.releaseYear,
    server: t.hasP1 && t.hasP2 ? 'P1 e P2' : t.hasP1 ? 'P1' : t.hasP2 ? 'P2' : 'Nenhum',
    posterUrl: t.posterUrl,
    tmdbId: t.tmdbId,
  }))

  const tmdb = tmdbMatches.slice(0, 10).map(r => ({
    tmdbId: r.tmdbId,
    title: r.title,
    year: r.releaseYear ? String(r.releaseYear) : '',
    poster: r.posterUrl,
    overview: r.overview,
  }))

  return NextResponse.json({ local: localMapped, tmdb })
}
