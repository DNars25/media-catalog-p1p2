import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const type = req.nextUrl.searchParams.get('type') as 'movie' | 'tv'
  const tmdbId = req.nextUrl.searchParams.get('tmdbId')

  if (!type || !tmdbId) {
    return NextResponse.json({ error: 'type and tmdbId required' }, { status: 400 })
  }

  const apiKey = process.env.TMDB_API_KEY
  const url = `${TMDB_BASE}/${type}/${tmdbId}?api_key=${apiKey}&language=pt-BR&append_to_response=credits`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`TMDB ${res.status}`)
    const data = await res.json()

    const actors = (data.credits?.cast || [])
      .slice(0, 10)
      .map((c: any) => c.name as string)

    const result = {
      tmdbId: data.id,
      type: type === 'movie' ? 'MOVIE' : 'TV',
      name: data.title || data.name,
      description: data.overview || '',
      logo: data.poster_path ? `${TMDB_IMAGE}${data.poster_path}` : null,
      posterUrl: data.poster_path ? `${TMDB_IMAGE}${data.poster_path}` : null,
      releaseYear: data.release_date
        ? parseInt(data.release_date.split('-')[0])
        : data.first_air_date
        ? parseInt(data.first_air_date.split('-')[0])
        : null,
      genres: (data.genres || []).map((g: any) => g.name as string),
      actor: actors,
      // TV only
      tvSeasons: data.number_of_seasons ?? null,
      tvEpisodes: data.number_of_episodes ?? null,
      tvStatus: data.status ?? null,
      seasons: type === 'tv'
        ? (data.seasons || [])
            .filter((s: any) => s.season_number > 0)
            .map((s: any) => ({ season_number: s.season_number, episode_count: s.episode_count, name: s.name }))
        : [],
    }

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: 'TMDB error' }, { status: 500 })
  }
}
