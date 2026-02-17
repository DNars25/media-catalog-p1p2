const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500'

type CacheEntry = { data: any; expires: number }
const cache = new Map<string, CacheEntry>()
const TTL = 10 * 60 * 1000 // 10 minutes

function getCache(key: string) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) { cache.delete(key); return null }
  return entry.data
}

function setCache(key: string, data: any) {
  cache.set(key, { data, expires: Date.now() + TTL })
}

async function tmdbFetch(path: string) {
  const url = `${TMDB_BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${process.env.TMDB_API_KEY}&language=pt-BR`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`)
  return res.json()
}

function mapTvStatus(status: string): 'EM_ANDAMENTO' | 'FINALIZADA' {
  if (status === 'Ended' || status === 'Canceled') return 'FINALIZADA'
  return 'EM_ANDAMENTO'
}

export async function searchTMDB(query: string, type: 'movie' | 'tv' | 'multi') {
  const key = `search:${type}:${query}`
  const cached = getCache(key)
  if (cached) return cached

  const endpoint = type === 'multi' ? 'search/multi' : `search/${type}`
  const data = await tmdbFetch(`/${endpoint}?query=${encodeURIComponent(query)}`)

  const results = (data.results || []).slice(0, 10).map((r: any) => ({
    tmdbId: r.id,
    type: r.media_type === 'movie' || type === 'movie' ? 'MOVIE' : 'TV',
    title: r.title || r.name,
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

export async function getTMDBDetails(type: 'movie' | 'tv', tmdbId: number) {
  const key = `details:${type}:${tmdbId}`
  const cached = getCache(key)
  if (cached) return cached

  const data = await tmdbFetch(`/${type}/${tmdbId}${type === 'tv' ? '?append_to_response=external_ids' : ''}`)

  const result: any = {
    tmdbId: data.id,
    type: type === 'movie' ? 'MOVIE' : 'TV',
    title: data.title || data.name,
    overview: data.overview,
    posterUrl: data.poster_path ? `${TMDB_IMAGE}${data.poster_path}` : null,
    releaseYear: data.release_date
      ? parseInt(data.release_date.split('-')[0])
      : data.first_air_date
      ? parseInt(data.first_air_date.split('-')[0])
      : null,
    genres: (data.genres || []).map((g: any) => g.name),
  }

  if (type === 'tv') {
    result.tvSeasons = data.number_of_seasons ?? null
    result.tvEpisodes = data.number_of_episodes ?? null
    result.tvStatus = mapTvStatus(data.status || '')
  }

  setCache(key, result)
  return result
}
