'use client'
import { useState, useRef } from 'react'
import { Search, Loader2, Download, Image as ImageIcon, Film, Tv, ChevronDown, ChevronUp } from 'lucide-react'

interface SearchResult {
  tmdbId: number
  type: 'MOVIE' | 'TV'
  title: string
  overview: string
  posterUrl: string | null
  releaseYear: number | null
}

interface Metadata {
  tmdbId: number
  type: 'MOVIE' | 'TV'
  name: string
  description: string
  logo: string | null
  posterUrl: string | null
  releaseYear: number | null
  genres: string[]
  actor: string[]
  tvSeasons: number | null
  tvEpisodes: number | null
  tvStatus: string | null
  seasons: { season_number: number; episode_count: number; name: string }[]
}

const tvStatusLabel: Record<string, string> = {
  'Returning Series': 'Em Andamento',
  'Ended': 'Finalizada',
  'Canceled': 'Cancelada',
  'In Production': 'Em Produção',
}

export default function TmdbPage() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<'multi' | 'movie' | 'tv'>('multi')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<Metadata | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [downloadingCover, setDownloadingCover] = useState(false)
  const [showAllActors, setShowAllActors] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()

  const handleSearch = (value: string) => {
    setQuery(value)
    setSelected(null)
    clearTimeout(debounceRef.current)
    if (value.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(value)}&type=${searchType}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
      setSearching(false)
    }, 400)
  }

  const handleSelect = async (r: SearchResult) => {
    setResults([])
    setQuery(r.title)
    setSelected(null)
    setShowAllActors(false)
    setLoadingMeta(true)
    const type = r.type === 'MOVIE' ? 'movie' : 'tv'
    const res = await fetch(`/api/tmdb/metadata?type=${type}&tmdbId=${r.tmdbId}`)
    const data = await res.json()
    setSelected(data)
    setLoadingMeta(false)
  }

  const downloadJson = () => {
    if (!selected) return
    const payload = {
      actor: "",
      name: selected.name,
      description: selected.description,
      logo: "imagem.jpg",
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCover = async () => {
    if (!selected?.posterUrl) return
    setDownloadingCover(true)
    const res = await fetch(`/api/tmdb/proxy-image?url=${encodeURIComponent(selected.posterUrl)}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'imagem.jpeg'
    a.click()
    URL.revokeObjectURL(url)
    setDownloadingCover(false)
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-start py-10 px-4'>
      <div className='w-full max-w-2xl'>

        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-2xl font-bold'>TMDB · Capa + Data</h1>
          <p className='text-muted-foreground text-sm mt-1'>Busque um título para baixar a capa e o arquivo de metadados</p>
        </div>

        {/* Search */}
        <div className='bg-card border border-border rounded-2xl p-5 mb-4'>
          <div className='flex gap-2 mb-3'>
            {(['multi', 'movie', 'tv'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setSearchType(t); setResults([]); setSelected(null) }}
                className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition ' + (searchType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}
              >
                {t === 'multi' ? 'Todos' : t === 'movie' ? 'Filmes' : 'Séries'}
              </button>
            ))}
          </div>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <input
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder='Buscar no TMDB...'
              className='w-full bg-muted border border-border rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'
            />
            {searching && <Loader2 className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground' />}
          </div>

          {/* Dropdown results */}
          {results.length > 0 && (
            <div className='mt-2 border border-border rounded-xl overflow-hidden divide-y divide-border'>
              {results.map(r => (
                <button
                  key={r.tmdbId + r.type}
                  onClick={() => handleSelect(r)}
                  className='w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition text-left'
                >
                  {r.posterUrl
                    ? <img src={r.posterUrl} alt={r.title} className='w-8 h-12 rounded object-cover shrink-0' />
                    : <div className='w-8 h-12 rounded bg-muted shrink-0 flex items-center justify-center'>
                        {r.type === 'MOVIE' ? <Film className='w-3 h-3 text-muted-foreground' /> : <Tv className='w-3 h-3 text-muted-foreground' />}
                      </div>
                  }
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate'>{r.title}</p>
                    <p className='text-xs text-muted-foreground'>{r.type === 'MOVIE' ? 'Filme' : 'Série'} · {r.releaseYear || '?'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading state */}
        {loadingMeta && (
          <div className='flex items-center justify-center py-16'>
            <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
          </div>
        )}

        {/* Detail card */}
        {selected && !loadingMeta && (
          <div className='bg-card border border-border rounded-2xl overflow-hidden'>

            {/* Poster + Info */}
            <div className='flex gap-5 p-5'>
              <div className='shrink-0'>
                {selected.posterUrl
                  ? <img src={selected.posterUrl} alt={selected.name} className='w-32 rounded-xl object-cover' style={{ height: '192px' }} />
                  : <div className='w-32 rounded-xl bg-muted flex items-center justify-center' style={{ height: '192px' }}>
                      <ImageIcon className='w-8 h-8 text-muted-foreground' />
                    </div>
                }
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-start gap-2 flex-wrap'>
                  <h2 className='text-lg font-bold leading-tight'>{selected.name}</h2>
                  <span className='text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0 mt-0.5'>
                    {selected.type === 'MOVIE' ? 'Filme' : 'Série'}
                  </span>
                </div>
                <p className='text-sm text-muted-foreground mt-0.5'>{selected.releaseYear || '—'}</p>
                {selected.genres.length > 0 && (
                  <p className='text-xs text-muted-foreground mt-1'>{selected.genres.join(', ')}</p>
                )}
                {selected.description && (
                  <p className='text-sm mt-2 text-muted-foreground line-clamp-4 leading-relaxed'>{selected.description}</p>
                )}
              </div>
            </div>

            {/* TV Info */}
            {selected.type === 'TV' && (
              <div className='px-5 pb-4 flex flex-wrap gap-3'>
                {selected.tvSeasons != null && (
                  <div className='bg-muted rounded-lg px-3 py-2 text-center'>
                    <p className='text-lg font-bold'>{selected.tvSeasons}</p>
                    <p className='text-xs text-muted-foreground'>Temporadas</p>
                  </div>
                )}
                {selected.tvEpisodes != null && (
                  <div className='bg-muted rounded-lg px-3 py-2 text-center'>
                    <p className='text-lg font-bold'>{selected.tvEpisodes}</p>
                    <p className='text-xs text-muted-foreground'>Episódios</p>
                  </div>
                )}
                {selected.tvStatus && (
                  <div className='bg-muted rounded-lg px-3 py-2 text-center'>
                    <p className='text-sm font-semibold'>{tvStatusLabel[selected.tvStatus] || selected.tvStatus}</p>
                    <p className='text-xs text-muted-foreground'>Status</p>
                  </div>
                )}
              </div>
            )}

            {/* Cast */}
            {selected.actor.length > 0 && (
              <div className='px-5 pb-4 border-t border-border pt-4'>
                <div className='flex items-center justify-between mb-2'>
                  <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Elenco</p>
                  {selected.actor.length > 4 && (
                    <button
                      onClick={() => setShowAllActors(v => !v)}
                      className='flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition'
                    >
                      {showAllActors ? <><ChevronUp className='w-3 h-3' /> Menos</> : <><ChevronDown className='w-3 h-3' /> Ver todos</>}
                    </button>
                  )}
                </div>
                <div className='flex flex-wrap gap-1.5'>
                  {(showAllActors ? selected.actor : selected.actor.slice(0, 4)).map(a => (
                    <span key={a} className='text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground'>{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Download buttons */}
            <div className='px-5 pb-5 pt-2 border-t border-border flex gap-3'>
              <button
                onClick={downloadCover}
                disabled={!selected.posterUrl || downloadingCover}
                className='flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-muted hover:bg-secondary transition disabled:opacity-40'
              >
                {downloadingCover
                  ? <Loader2 className='w-4 h-4 animate-spin' />
                  : <ImageIcon className='w-4 h-4' />
                }
                Download da Capa
              </button>
              <button
                onClick={downloadJson}
                className='flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition'
              >
                <Download className='w-4 h-4' />
                Download do Arquivo
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
