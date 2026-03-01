const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500'

// ── Raw TMDB response shapes ─────────────────────────────────────────────────

interface TmdbGenre { id: number; name: string }

interface TmdbRawSearchItem {
  id: number
  media_type?: string
  title?: string
  name?: string
  overview: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
}

interface TmdbRawMovieDetails {
  id: number
  title: string
  overview: string
  poster_path: string | null
  release_date?: string
  genres: TmdbGenre[]
}

interface TmdbRawTvDetails {
  id: number
  name: string
  overview: string
  poster_path: string | null
  first_air_date?: string
  genres: TmdbGenre[]
  number_of_seasons: number | null
  number_of_episodes: number | null
  status: string
  seasons: Array<{ season_number: number; episode_count: number; name: string }>
}

// ── Public output types ───────────────────────────────────────────────────────

export interface TmdbSearchResult {
  tmdbId: number
  type: 'MOVIE' | 'TV'
  title: string
  overview: string
  posterUrl: string | null
  releaseYear: number | null
}

export interface TmdbMovieDetails {
  tmdbId: number
  type: 'MOVIE'
  title: string
  overview: string
  posterUrl: string | null
  releaseYear: number | null
  genres: string[]
}

export interface TmdbTvDetails {
  tmdbId: number
  type: 'TV'
  title: string
  overview: string
  posterUrl: string | null
  releaseYear: number | null
  genres: string[]
  tvSeasons: number | null
  tvEpisodes: number | null
  tvStatus: 'EM_ANDAMENTO' | 'FINALIZADA'
  number_of_seasons: number | null
  number_of_episodes: number | null
  seasons: Array<{ season_number: number; episode_count: number; name: string }>
}

// ── Cache ─────────────────────────────────────────────────────────────────────

type CacheEntry<T> = { data: T; expires: number }
const cache = new Map<string, CacheEntry<unknown>>()
const TTL = 10 * 60 * 1000 // 10 minutes

function getCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() > entry.expires) { cache.delete(key); return null }
  return entry.data
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expires: Date.now() + TTL })
}

// ── Internal fetch ────────────────────────────────────────────────────────────

async function tmdbFetch(path: string): Promise<unknown> {
  const url = `${TMDB_BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${process.env.TMDB_API_KEY}&language=pt-BR`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`TMDB error: ${res.status}`)
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

function mapTvStatus(status: string): 'EM_ANDAMENTO' | 'FINALIZADA' {
  if (status === 'Ended' || status === 'Canceled') return 'FINALIZADA'
  return 'EM_ANDAMENTO'
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function searchTMDB(query: string, type: 'movie' | 'tv' | 'multi'): Promise<TmdbSearchResult[]> {
  const key = `search:${type}:${query}`
  const cached = getCache<TmdbSearchResult[]>(key)
  if (cached) return cached

  const endpoint = type === 'multi' ? 'search/multi' : `search/${type}`
  const data = await tmdbFetch(`/${endpoint}?query=${encodeURIComponent(query)}`) as { results: TmdbRawSearchItem[] }

  const results: TmdbSearchResult[] = (data.results || []).slice(0, 10).map((r) => ({
    tmdbId: r.id,
    type: r.media_type === 'movie' || type === 'movie' ? 'MOVIE' : 'TV',
    title: r.title || r.name || '',
    overview: r.overview,
    posterUrl: r.poster_path ? `${TMDB_IMAGE}${r.poster_path}` : null,
    releaseYear: r.release_date
      ? parseInt(r.release_date.split('-')[0])
      : r.first_air_date
      ? parseInt(r.first_air_date.split('-')[0])
      : null,
  }))

  setCache(key, results)
  return results
}

export async function getTMDBDetails(type: 'movie' | 'tv', tmdbId: number): Promise<TmdbMovieDetails | TmdbTvDetails> {
  const key = `details:${type}:${tmdbId}`
  const cached = getCache<TmdbMovieDetails | TmdbTvDetails>(key)
  if (cached) return cached

  if (type === 'movie') {
    const data = await tmdbFetch(`/movie/${tmdbId}`) as TmdbRawMovieDetails
    const result: TmdbMovieDetails = {
      tmdbId: data.id,
      type: 'MOVIE',
      title: data.title || '',
      overview: data.overview,
      posterUrl: data.poster_path ? `${TMDB_IMAGE}${data.poster_path}` : null,
      releaseYear: data.release_date ? parseInt(data.release_date.split('-')[0]) : null,
      genres: (data.genres || []).map((g) => g.name),
    }
    setCache(key, result)
    return result
  }

  const data = await tmdbFetch(`/tv/${tmdbId}?append_to_response=external_ids`) as TmdbRawTvDetails
  const result: TmdbTvDetails = {
    tmdbId: data.id,
    type: 'TV',
    title: data.name || '',
    overview: data.overview,
    posterUrl: data.poster_path ? `${TMDB_IMAGE}${data.poster_path}` : null,
    releaseYear: data.first_air_date ? parseInt(data.first_air_date.split('-')[0]) : null,
    genres: (data.genres || []).map((g) => g.name),
    tvSeasons: data.number_of_seasons ?? null,
    tvEpisodes: data.number_of_episodes ?? null,
    tvStatus: mapTvStatus(data.status || ''),
    number_of_seasons: data.number_of_seasons ?? null,
    number_of_episodes: data.number_of_episodes ?? null,
    seasons: (data.seasons || []).map((s) => ({ season_number: s.season_number, episode_count: s.episode_count, name: s.name })),
  }
  setCache(key, result)
  return result
}
