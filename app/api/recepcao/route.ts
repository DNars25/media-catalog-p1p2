import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') || ''
  const type = searchParams.get('type') || 'MOVIE'
  if (query.length < 2) return NextResponse.json({ local: [], tmdb: [] })

  const tmdbType = type === 'MOVIE' ? 'movie' : 'tv'
  const localType = type === 'MOVIE' ? 'MOVIE' : 'TV'

  const tmdbRes = await fetch('https://api.themoviedb.org/3/search/' + tmdbType + '?api_key=' + process.env.TMDB_API_KEY + '&query=' + encodeURIComponent(query) + '&language=pt-BR')
    .then(r => r.json()).catch(() => ({ results: [] }))

  const tmdbIds = (tmdbRes.results || []).map((r: any) => r.id)

  const local = await prisma.title.findMany({
    where: {
      type: localType,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { title: { contains: query.replace(/&/g, 'e'), mode: 'insensitive' } },
        { title: { contains: query.replace(/e/g, '&'), mode: 'insensitive' } },
        { tmdbId: { in: tmdbIds } }
      ]
    },
    select: { id: true, title: true, releaseYear: true, hasP1: true, hasP2: true, type: true, posterUrl: true, tmdbId: true },
    take: 20
  })

  const localMapped = local.map((t: any) => ({
    id: t.id,
    title: t.title,
    year: t.releaseYear,
    server: t.hasP1 && t.hasP2 ? 'P1 e P2' : t.hasP1 ? 'P1' : t.hasP2 ? 'P2' : 'Nenhum',
    posterUrl: t.posterUrl,
    tmdbId: t.tmdbId
  }))

  const tmdbResults = (tmdbRes.results || []).slice(0, 10).map((r: any) => ({
    tmdbId: r.id,
    title: r.title || r.name,
    year: (r.release_date || r.first_air_date || '').substring(0, 4),
    poster: r.poster_path ? 'https://image.tmdb.org/t/p/w200' + r.poster_path : null,
    overview: r.overview
  }))

  return NextResponse.json({ local: localMapped, tmdb: tmdbResults })
}