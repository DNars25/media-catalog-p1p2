import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { findTitleIdsByTextAndType } from '@/lib/search'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') || ''
  const type = searchParams.get('type') || 'MOVIE'
  if (query.length < 2) return NextResponse.json({ local: [], tmdb: [] })

  const tmdbType = type === 'MOVIE' ? 'movie' : 'tv'
  const localType = type === 'MOVIE' ? 'MOVIE' : 'TV'

  const tmdbRes = await fetch(
    'https://api.themoviedb.org/3/search/' + tmdbType +
    '?api_key=' + process.env.TMDB_API_KEY +
    '&query=' + encodeURIComponent(query) + '&language=pt-BR'
  ).then(r => r.json()).catch(() => ({ results: [] }))

  const tmdbIds = (tmdbRes.results || []).map((r: any) => r.id)

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

  const serverLabel = (hasP1: boolean, hasP2: boolean) => {
    if (hasP1 && hasP2) return 'B2P e P2B'
    if (hasP1) return 'B2P'
    if (hasP2) return 'P2B'
    return 'Nenhum'
  }

  const localMapped = local.map((t: any) => ({
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

  const tmdbResults = (tmdbRes.results || []).slice(0, 10).map((r: any) => ({
    tmdbId: r.id,
    title: r.title || r.name,
    year: (r.release_date || r.first_air_date || '').substring(0, 4),
    poster: r.poster_path ? 'https://image.tmdb.org/t/p/w200' + r.poster_path : null,
    overview: r.overview,
  }))

  return NextResponse.json({ local: localMapped, tmdb: tmdbResults })
}
