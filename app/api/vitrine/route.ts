import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { findTitleIdsByTextAndType } from '@/lib/search'
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

  const localTextIds = await findTitleIdsByTextAndType(query, localType)
  const local = await prisma.title.findMany({
    where: {
      type: localType,
      OR: [
        ...(localTextIds.length > 0 ? [{ id: { in: localTextIds } }] : []),
        { tmdbId: { in: tmdbIds } },
      ],
    },
    select: { id: true, title: true, releaseYear: true, hasP1: true, hasP2: true, type: true, posterUrl: true, tmdbId: true },
    take: 20,
  })

  const serverLabel = (hasP1: boolean, hasP2: boolean): string => {
    if (hasP1 && hasP2) return 'B2P e P2B'
    if (hasP1) return 'B2P'
    if (hasP2) return 'P2B'
    return 'Nenhum'
  }

  const localMapped = local.map(t => ({
    id: t.id,
    title: t.title,
    year: t.releaseYear,
    hasP1: t.hasP1,
    hasP2: t.hasP2,
    server: serverLabel(t.hasP1, t.hasP2),
    posterUrl: t.posterUrl,
    tmdbId: t.tmdbId,
    type: t.type,
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
