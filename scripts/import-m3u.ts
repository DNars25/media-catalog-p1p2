/**
 * import-m3u.ts
 * Importa filmes e séries do arquivo M3U para o banco de dados.
 *
 * Como rodar:
 *   npx tsx scripts/import-m3u.ts
 *
 * Resume automático:
 *   - Títulos já no banco são ignorados (preload de IDs)
 *   - Buscas TMDB são cacheadas em scripts/output/tmdb-cache.json
 *
 * Saída:
 *   scripts/output/not-found-movies.txt
 *   scripts/output/not-found-series.txt
 *   scripts/output/tmdb-cache.json (cache de buscas - apague para refazer)
 */

import * as fs from 'fs'
import * as path from 'path'
import { createInterface } from 'readline'
// Carrega .env manualmente (sem dependência de dotenv)
;(function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (m) {
      const key = m[1].trim()
      const val = m[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
})()

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({ log: [] })

// ── Config ───────────────────────────────────────────────────────────────────

const TMDB_BASE   = 'https://api.themoviedb.org/3'
const TMDB_IMAGE  = 'https://image.tmdb.org/t/p/w500'
const TMDB_API_KEY = process.env.TMDB_API_KEY!
const RATE_MS     = 270  // ~3.7 req/s — seguro abaixo do limite TMDB (40/10s)

const M3U_FILE   = path.resolve(process.cwd(), 'tv_channels_narsvod_plus.m3u')
const OUTPUT_DIR = path.resolve(process.cwd(), 'scripts/output')
const CACHE_FILE = path.join(OUTPUT_DIR, 'tmdb-cache.json')
const SAVE_EVERY = 100  // salva cache a cada N títulos processados

// ── Grupos ───────────────────────────────────────────────────────────────────

const MOVIE_GROUPS = new Set([
  '4K ULTRA HD', 'ACAO/AVENTURA', 'ANIME', 'CINE FERIAS', 'CINEMA - BAIXA QUALIDADE',
  'CLASSICO', 'COMEDIA', 'DOCUMENTARIO', 'ESPECIAL DE NATAL', 'FAROESTE', 'FICCAO',
  'GUERRA', 'INFANTIL', 'LANCAMENTOS', 'LANCAMENTOS LEG', 'LEGENDADO',
  'MARVEL & DC', 'MUSICAL', 'NACIONAL', 'OSCAR 2025', 'RELIGIOSO',
  'ROMANCE/DRAMA', 'TERROR/SUSPENSE', 'TURCO',
])

const LEG_MOVIE_GROUPS  = new Set(['LEGENDADO', 'LANCAMENTOS LEG'])

const SERIES_GROUPS = new Set([
  'SERIES | AMAZON PRIME', 'SERIES | APPLE TV', 'SERIES | BBC ONE',
  'SERIES | BRASIL PARALELO', 'SERIES | CRUNCHYROLL', 'SERIES | DISCOVERY PLUS',
  'SERIES | DISNEY + STAR', 'SERIES | DORAMAS', 'SERIES | EXCLUSIVAS',
  'SERIES | GLOBOPLAY', 'SERIES | HBO MAX', 'SERIES | LEGENDADAS',
  'SERIES | NETFLIX', 'SERIES | PARAMOUNT', 'SERIES | TURCAS', 'SERIES | VIKI ROKUTEN',
])

const LEG_SERIES_GROUPS = new Set(['SERIES | LEGENDADAS'])

// ── Types ────────────────────────────────────────────────────────────────────

interface MovieEntry { logo: string; hasDub: boolean; hasLeg: boolean }
interface SeriesEntry { logo: string; isLeg: boolean; episodes: Map<number, Set<number>> }

interface TmdbMovie {
  tmdbId: number; title: string; overview: string
  posterUrl: string | null; releaseYear: number | null
}
interface TmdbTv extends TmdbMovie {
  tvSeasons: number | null; tvEpisodes: number | null
  tvStatus: 'EM_ANDAMENTO' | 'FINALIZADA'
}

// null = searched and not found; undefined = not yet searched
type CacheValue = TmdbMovie | TmdbTv | null

interface CacheStore {
  movies: Record<string, CacheValue>
  series: Record<string, CacheValue>
}

// ── TMDB Cache ───────────────────────────────────────────────────────────────

let cache: CacheStore = { movies: {}, series: {} }

function loadCache(): void {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
      const mCount = Object.keys(cache.movies).length
      const sCount = Object.keys(cache.series).length
      console.log(`Cache carregado: ${mCount} filmes, ${sCount} séries`)
    } catch {
      console.warn('Cache inválido, ignorando.')
      cache = { movies: {}, series: {} }
    }
  }
}

function saveCache(): void {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf-8')
}

// ── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)) }

function normalizeKey(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ')
}

function stripLeg(name: string): string { return name.replace(/\s+LEG\s*$/i, '').trim() }
function isLegName(name: string): boolean { return /\bLEG\s*$/i.test(name.trim()) }

function parseSeriesEntry(tvgName: string): { name: string; season: number; episode: number } | null {
  // Ex: "GAME OF THRONES S01 S01E01" ou "VIS A VIS EL OASIS LEG S01 S01E01 - (LEG)"
  const match = tvgName.match(/^(.*?)\s+S(\d+)\s+S\d+E(\d+)/i)
  if (!match) return null
  return {
    name: normalizeKey(stripLeg(match[1].trim())),
    season: parseInt(match[2], 10),
    episode: parseInt(match[3], 10),
  }
}

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0 ? `${h}h${m}m${s}s` : m > 0 ? `${m}m${s}s` : `${s}s`
}

// ── TMDB Client ──────────────────────────────────────────────────────────────

let lastReqAt = 0

async function tmdbFetch(endpoint: string): Promise<unknown> {
  const wait = RATE_MS - (Date.now() - lastReqAt)
  if (wait > 0) await sleep(wait)
  lastReqAt = Date.now()

  const sep = endpoint.includes('?') ? '&' : '?'
  const url = `${TMDB_BASE}${endpoint}${sep}api_key=${TMDB_API_KEY}&language=pt-BR`

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 12000)
      const res = await fetch(url, { signal: ctrl.signal })
      clearTimeout(timer)

      if (res.status === 429) {
        const wait = parseInt(res.headers.get('retry-after') || '10', 10)
        process.stdout.write(`\n  ⚠ Rate limited, aguardando ${wait}s...\n`)
        await sleep(wait * 1000)
        continue
      }
      if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      if (attempt === 2) throw e
      await sleep(2000)
    }
  }
}

async function searchMovie(query: string): Promise<TmdbMovie | null> {
  if (query in cache.movies) return cache.movies[query] as TmdbMovie | null

  try {
    const data = await tmdbFetch(`/search/movie?query=${encodeURIComponent(query)}`) as {
      results: Array<{ id: number; title?: string; overview: string; poster_path: string | null; release_date?: string }>
    }
    const r = (data.results || [])[0]
    const result: TmdbMovie | null = r
      ? { tmdbId: r.id, title: r.title || query, overview: r.overview || '',
          posterUrl: r.poster_path ? `${TMDB_IMAGE}${r.poster_path}` : null,
          releaseYear: r.release_date ? parseInt(r.release_date.split('-')[0], 10) : null }
      : null
    cache.movies[query] = result
    return result
  } catch {
    // Não cacheia erros de rede — tenta de novo na próxima execução
    return null
  }
}

async function searchTv(query: string): Promise<TmdbTv | null> {
  if (query in cache.series) return cache.series[query] as TmdbTv | null

  try {
    const searchData = await tmdbFetch(`/search/tv?query=${encodeURIComponent(query)}`) as {
      results: Array<{ id: number; name?: string }>
    }
    const first = (searchData.results || [])[0]
    if (!first) { cache.series[query] = null; return null }

    const details = await tmdbFetch(`/tv/${first.id}`) as {
      id: number; name?: string; overview?: string; poster_path: string | null
      first_air_date?: string; number_of_seasons: number | null
      number_of_episodes: number | null; status?: string
    }

    const isEnded = details.status === 'Ended' || details.status === 'Canceled'
    const result: TmdbTv = {
      tmdbId: details.id,
      title: details.name || first.name || query,
      overview: details.overview || '',
      posterUrl: details.poster_path ? `${TMDB_IMAGE}${details.poster_path}` : null,
      releaseYear: details.first_air_date ? parseInt(details.first_air_date.split('-')[0], 10) : null,
      tvSeasons: details.number_of_seasons ?? null,
      tvEpisodes: details.number_of_episodes ?? null,
      tvStatus: isEnded ? 'FINALIZADA' : 'EM_ANDAMENTO',
    }
    cache.series[query] = result
    return result
  } catch {
    return null
  }
}

// ── M3U Parser ───────────────────────────────────────────────────────────────

async function parseM3U(): Promise<{ movies: Map<string, MovieEntry>; series: Map<string, SeriesEntry> }> {
  const movies = new Map<string, MovieEntry>()
  const series = new Map<string, SeriesEntry>()

  const rl = createInterface({
    input: fs.createReadStream(M3U_FILE, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  })

  let extinf: string | null = null
  let lineCount = 0

  for await (const line of rl) {
    lineCount++
    if (lineCount % 50000 === 0) process.stdout.write(`  Lendo linha ${lineCount.toLocaleString()}...\r`)

    if (line.startsWith('#EXTINF')) { extinf = line; continue }
    if (!extinf || line.startsWith('#')) { extinf = null; continue }

    const gm = extinf.match(/group-title="([^"]*)"/)
    const nm = extinf.match(/tvg-name="([^"]*)"/)
    const lm = extinf.match(/tvg-logo="([^"]*)"/)
    extinf = null

    if (!gm || !nm) continue
    const group   = gm[1].trim()
    const tvgName = nm[1].trim()
    const logo    = lm ? lm[1] : ''

    if (MOVIE_GROUPS.has(group)) {
      const isLeg   = LEG_MOVIE_GROUPS.has(group) || isLegName(tvgName)
      const baseName = normalizeKey(isLeg ? stripLeg(tvgName) : tvgName)
      if (!movies.has(baseName)) {
        movies.set(baseName, { logo, hasDub: !isLeg, hasLeg: isLeg })
      } else {
        const e = movies.get(baseName)!
        if (isLeg) e.hasLeg = true; else e.hasDub = true
        if (!e.logo) e.logo = logo
      }
    } else if (SERIES_GROUPS.has(group)) {
      const parsed = parseSeriesEntry(tvgName)
      if (parsed) {
        const isLeg = LEG_SERIES_GROUPS.has(group)
        if (!series.has(parsed.name)) series.set(parsed.name, { logo, isLeg, episodes: new Map() })
        const e = series.get(parsed.name)!
        if (!e.episodes.has(parsed.season)) e.episodes.set(parsed.season, new Set())
        e.episodes.get(parsed.season)!.add(parsed.episode)
      }
    }
  }

  console.log(`\n  Linhas lidas: ${lineCount.toLocaleString()}`)
  return { movies, series }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!TMDB_API_KEY) throw new Error('TMDB_API_KEY não definida no .env')

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  loadCache()

  // Valida API key
  try {
    await tmdbFetch('/configuration')
    console.log('TMDB API: OK')
  } catch {
    throw new Error('Falha ao conectar com TMDB — verifique TMDB_API_KEY')
  }

  // Busca usuário admin
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  })
  if (!adminUser) throw new Error('Nenhum usuário admin encontrado no banco')
  console.log(`Usuário: ${adminUser.name}`)

  // Parse M3U
  console.log('\nParsing do M3U...')
  const { movies, series } = await parseM3U()
  console.log(`Filmes únicos: ${movies.size.toLocaleString()}`)
  console.log(`Séries únicas: ${series.size.toLocaleString()}`)

  // Pré-carrega IDs já no banco (resume automático)
  const [existingMovieIds, existingTvMap] = await Promise.all([
    prisma.title.findMany({ where: { type: 'MOVIE' }, select: { tmdbId: true } })
      .then((r) => new Set(r.map((x) => x.tmdbId))),
    prisma.title.findMany({ where: { type: 'TV' }, select: { tmdbId: true, id: true } })
      .then((r) => new Map(r.map((x) => [x.tmdbId, x.id]))),
  ])
  console.log(`Filmes já no banco: ${existingMovieIds.size.toLocaleString()}`)
  console.log(`Séries já no banco: ${existingTvMap.size.toLocaleString()}`)

  // Estima chamadas TMDB restantes
  const movieSearchesLeft = Array.from(movies.keys()).filter((k) => !(k in cache.movies)).length
  const seriesSearchesLeft = Array.from(series.keys()).filter((k) => !(k in cache.series)).length
  const totalApiCalls = movieSearchesLeft + seriesSearchesLeft * 2
  const etaSec = (totalApiCalls * RATE_MS) / 1000
  console.log(`\nChamadas TMDB pendentes: ~${totalApiCalls.toLocaleString()} (~${fmtTime(etaSec)} estimado)`)

  const notFoundMovies: string[] = []
  const notFoundSeries: string[] = []
  const startTime = Date.now()

  // ── Filmes ────────────────────────────────────────────────────────────────
  console.log('\n=== FILMES ===')
  let mDone = 0, mCreated = 0, mSkipped = 0, mNotFound = 0

  for (const [baseName, entry] of movies) {
    mDone++

    if (mDone % SAVE_EVERY === 0) saveCache()

    if (mDone % 200 === 0) {
      const elapsed = (Date.now() - startTime) / 1000
      const remaining = movies.size - mDone
      const rate = mDone / elapsed
      const eta = fmtTime(remaining / rate)
      process.stdout.write(
        `  [${mDone}/${movies.size}] Criados:${mCreated} Ignorados:${mSkipped} NãoEncontrados:${mNotFound} ETA:${eta}\r`
      )
    }

    const audioType = entry.hasDub && entry.hasLeg ? 'DUBLADO_LEGENDADO' : entry.hasLeg ? 'LEGENDADO' : 'DUBLADO'
    const tmdb = await searchMovie(baseName)

    if (!tmdb) { notFoundMovies.push(baseName); mNotFound++; continue }
    if (existingMovieIds.has(tmdb.tmdbId)) { mSkipped++; continue }

    try {
      await prisma.title.create({
        data: {
          tmdbId: tmdb.tmdbId, type: 'MOVIE', title: tmdb.title, overview: tmdb.overview,
          posterUrl: tmdb.posterUrl, releaseYear: tmdb.releaseYear, genres: [],
          internalStatus: 'DISPONIVEL', audioType, hasP1: true, hasP2: false,
          createdById: adminUser.id,
        },
      })
      existingMovieIds.add(tmdb.tmdbId)
      mCreated++
    } catch {
      existingMovieIds.add(tmdb.tmdbId)
      mSkipped++
    }
  }

  saveCache()
  console.log(`\nFilmes: ${mCreated} criados | ${mSkipped} ignorados | ${mNotFound} não encontrados`)

  // ── Séries ────────────────────────────────────────────────────────────────
  console.log('\n=== SÉRIES ===')
  let sDone = 0, sCreated = 0, sSkipped = 0, sNotFound = 0

  for (const [seriesName, entry] of series) {
    sDone++

    if (sDone % SAVE_EVERY === 0) saveCache()

    if (sDone % 50 === 0 || sDone <= 5) {
      const elapsed = (Date.now() - startTime) / 1000
      const remaining = series.size - sDone
      const rate = sDone / elapsed
      const eta = fmtTime(remaining / rate)
      process.stdout.write(
        `  [${sDone}/${series.size}] Criadas:${sCreated} Ignoradas:${sSkipped} NãoEncontradas:${sNotFound} ETA:${eta} — ${seriesName.substring(0, 30)}\r`
      )
    }

    const audioType = entry.isLeg ? 'LEGENDADO' : 'DUBLADO'
    const tmdb = await searchTv(seriesName)

    if (!tmdb) { notFoundSeries.push(seriesName); sNotFound++; continue }

    let titleId = existingTvMap.get(tmdb.tmdbId)

    if (!titleId) {
      try {
        const created = await prisma.title.create({
          data: {
            tmdbId: tmdb.tmdbId, type: 'TV', title: tmdb.title, overview: tmdb.overview,
            posterUrl: tmdb.posterUrl, releaseYear: tmdb.releaseYear, genres: [],
            tvSeasons: tmdb.tvSeasons, tvEpisodes: tmdb.tvEpisodes, tvStatus: tmdb.tvStatus,
            internalStatus: 'DISPONIVEL', audioType, hasP1: true, hasP2: false,
            createdById: adminUser.id,
          },
        })
        titleId = created.id
        existingTvMap.set(tmdb.tmdbId, titleId)
        sCreated++
      } catch {
        // Conflito de tmdbId único — busca ID existente
        const existing = await prisma.title.findUnique({
          where: { tmdbId_type: { tmdbId: tmdb.tmdbId, type: 'TV' } },
          select: { id: true },
        })
        if (!existing) { sNotFound++; continue }
        titleId = existing.id
        existingTvMap.set(tmdb.tmdbId, titleId)
        sSkipped++
      }
    } else {
      sSkipped++
    }

    // Insere episódios (apenas os que existem no M3U)
    // tvEpisodes vem do TMDB (total real) → séries FINALIZADA com menos eps ficam no filtro INCOMPLETAS
    const episodesData: Array<{ titleId: string; season: number; episode: number }> = []
    for (const [season, epSet] of entry.episodes) {
      for (const episode of epSet) {
        episodesData.push({ titleId, season, episode })
      }
    }
    if (episodesData.length > 0) {
      await prisma.titleEpisode.createMany({ data: episodesData, skipDuplicates: true })
    }
  }

  saveCache()
  console.log(`\nSéries: ${sCreated} criadas | ${sSkipped} ignoradas | ${sNotFound} não encontradas`)

  // ── Salva listas de não encontrados ───────────────────────────────────────
  fs.writeFileSync(path.join(OUTPUT_DIR, 'not-found-movies.txt'), notFoundMovies.join('\n'), 'utf-8')
  fs.writeFileSync(path.join(OUTPUT_DIR, 'not-found-series.txt'), notFoundSeries.join('\n'), 'utf-8')

  const totalTime = fmtTime((Date.now() - startTime) / 1000)
  console.log('\n' + '─'.repeat(60))
  console.log(`Tempo total: ${totalTime}`)
  console.log(`Filmes cadastrados: ${mCreated.toLocaleString()}`)
  console.log(`Séries cadastradas: ${sCreated.toLocaleString()}`)
  console.log(`Não encontrados no TMDB:`)
  console.log(`  Filmes: ${notFoundMovies.length} → scripts/output/not-found-movies.txt`)
  console.log(`  Séries: ${notFoundSeries.length} → scripts/output/not-found-series.txt`)
  console.log('─'.repeat(60))
  console.log('Importação concluída!')
}

main()
  .catch((e) => { console.error('\n❌ Erro fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
