import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') || ''
  const type = searchParams.get('type') || 'MOVIE'
  if (query.length < 2) return NextResponse.json({ local: [], tmdb: [] })

  const tmdbType = type === 'MOVIE' ? 'movie' : 'tv'
  const localType = type === 'MOVIE' ? 'MOVIE' : 'TV'

  const [local, tmdbRes] = await Promise.all([
    prisma.title.findMany({
      where: { type: localType, title: { contains: query, mode: 'insensitive' } },
      select: { id: true, title: true, year: true, server: true, type: true, posterUrl: true },
      take: 10
    }),
    fetch('https://api.themoviedb.org/3/search/' + tmdbType + '?api_key=' + process.env.TMDB_API_KEY + '&query=' + encodeURIComponent(query) + '&language=pt-BR')
      .then(r => r.json()).catch(() => ({ results: [] }))
  ])

  const tmdbResults = (tmdbRes.results || []).slice(0, 10).map((r: any) => ({
    tmdbId: r.id,
    title: r.title || r.name,
    year: (r.release_date || r.first_air_date || '').substring(0, 4),
    poster: r.poster_path ? 'https://image.tmdb.org/t/p/w200' + r.poster_path : null,
    overview: r.overview
  }))

  return NextResponse.json({ local, tmdb: tmdbResults })
}