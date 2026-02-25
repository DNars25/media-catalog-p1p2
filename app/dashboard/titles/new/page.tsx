'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Loader2, Check } from 'lucide-react'

interface TMDBResult {
  tmdbId: number
  type: string
  title: string
  overview: string
  posterUrl: string | null
  releaseYear: number | null
}

interface Season {
  season_number: number
  episode_count: number
  name: string
}

interface TitleDetails extends TMDBResult {
  genres: string[]
  tvSeasons?: number | null
  tvEpisodes?: number | null
  tvStatus?: 'EM_ANDAMENTO' | 'FINALIZADA' | null
  seasons?: Season[]
}

export default function NewTitlePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('multi')
  const [results, setResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<TitleDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    hasP1: false,
    hasP2: false,
    audioType: 'DUBLADO',
    tvStatus: '',
    tvSeasons: '',
    tvEpisodes: '',
  })
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [selectedEpisodes, setSelectedEpisodes] = useState<Record<number, number[]>>({})
  const [bulkCount, setBulkCount] = useState('')
  const searchTimeout = useRef<NodeJS.Timeout>()

  const handleSearch = (value: string) => {
    setQuery(value)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch('/api/tmdb/search?query=' + encodeURIComponent(value) + '&type=' + searchType)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
      setSearching(false)
    }, 400)
  }

  const handleSelect = async (r: TMDBResult) => {
    setResults([])
    setQuery(r.title)
    setLoading(true)
    setSelectedEpisodes({})
    const type = r.type === 'MOVIE' ? 'movie' : 'tv'
    const res = await fetch('/api/tmdb/details?type=' + type + '&tmdbId=' + r.tmdbId)
    const data = await res.json()
    setSelected(data)
    setForm(f => ({ ...f, tvStatus: data.tvStatus || '', tvSeasons: data.tvSeasons || '', tvEpisodes: data.tvEpisodes || '' }))
    setLoading(false)
  }

  const toggleEpisode = (season: number, ep: number) => {
    setSelectedEpisodes(prev => {
      const current = prev[season] || []
      const idx = current.indexOf(ep)
      if (idx === -1) {
        return { ...prev, [season]: [...current, ep].sort((a, b) => a - b) }
      } else {
        const next = current.filter(e => e !== ep)
        return { ...prev, [season]: next }
      }
    })
  }

  const selectAllEpisodes = (season: Season) => {
    const all = Array.from({ length: season.episode_count }, (_, i) => i + 1)
    setSelectedEpisodes(prev => ({ ...prev, [season.season_number]: all }))
  }

  const clearEpisodes = (seasonNumber: number) => {
    setSelectedEpisodes(prev => ({ ...prev, [seasonNumber]: [] }))
  }

  const applyToAllSeasons = () => {
    const count = parseInt(bulkCount)
    if (!count || count < 1) return
    const updates: Record<number, number[]> = {}
    for (const s of seasons) {
      const max = Math.min(count, s.episode_count)
      updates[s.season_number] = Array.from({ length: max }, (_, i) => i + 1)
    }
    setSelectedEpisodes(updates)
  }

  const buildEpisodesData = () => {
    return Object.entries(selectedEpisodes).flatMap(([season, eps]) =>
      eps.map(ep => ({ season: parseInt(season), episode: ep }))
    )
  }

  const buildNotesFromEpisodes = () => {
    const parts = Object.entries(selectedEpisodes)
      .filter(([, eps]) => eps.length > 0)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([season, eps]) => {
        const sorted = [...eps].sort((a, b) => a - b)
        return `Temp ${season}: eps ${sorted[0]}-${sorted[sorted.length - 1]}`
      })
    return parts.length > 0 ? parts.join(', ') : null
  }

  const handleSubmit = async () => {
    if (selected == null) return
    await doSave()
  }

  const doSave = async () => {
    if (selected == null) return
    setSaving(true)
    const episodesData = buildEpisodesData()
    const res = await fetch('/api/titles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdbId: selected.tmdbId,
        type: selected.type,
        title: selected.title,
        overview: selected.overview,
        posterUrl: selected.posterUrl,
        releaseYear: selected.releaseYear,
        genres: selected.genres || [],
        tvSeasons: form.tvSeasons ? parseInt(form.tvSeasons) : null,
        tvEpisodes: form.tvEpisodes ? parseInt(form.tvEpisodes) : null,
        tvStatus: form.tvStatus || null,
        hasP1: form.hasP1,
        hasP2: form.hasP2,
        audioType: form.audioType,
        internalStatus: 'DISPONIVEL',
        episodesData,
      })
    })
    setSaving(false)
    if (res.ok) {
      const savedTitle = await res.json()
      if (form.tvStatus === 'EM_ANDAMENTO') {
        const notes = buildNotesFromEpisodes()
        await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestedTitle: selected.title,
            type: selected.type,
            posterUrl: selected.posterUrl,
            isUpdate: true,
            status: 'ABERTO',
            linkedTitleId: savedTitle.id,
            notes,
          })
        })
      }
      toast.success('Título cadastrado com sucesso!')
      router.push('/dashboard/titles')
    } else {
      const err = await res.json()
      if (res.status === 409) toast.error('Título já cadastrado')
      else toast.error('Erro ao salvar')
    }
  }

  const audioOptions = [
    { value: 'DUBLADO', label: 'Dublado' },
    { value: 'LEGENDADO', label: 'Legendado' },
    { value: 'DUBLADO_LEGENDADO', label: 'Dublado + Legendado' },
  ]

  const maxSeasons = form.tvSeasons ? parseInt(form.tvSeasons) : 999
  const seasons = (selected?.seasons || []).filter(s => s.season_number > 0 && s.season_number <= maxSeasons)
  const currentSeason = seasons.find(s => s.season_number === selectedSeason)
  const selectedEpsInSeason = selectedEpisodes[selectedSeason] || []

  return (
    <div className='p-8 max-w-2xl'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold'>Cadastrar Título</h1>
        <p className='text-muted-foreground mt-1'>Busque no TMDB e importe os dados automaticamente</p>
      </div>
      <div className='bg-card border border-border rounded-xl p-6 mb-6'>
        <h2 className='font-semibold mb-4'>Buscar no TMDB</h2>
        <div className='flex gap-3 mb-3'>
          <select value={searchType} onChange={e => setSearchType(e.target.value)} className='bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'>
            <option value='multi'>Todos</option>
            <option value='movie'>Filmes</option>
            <option value='tv'>Séries</option>
          </select>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <input value={query} onChange={e => handleSearch(e.target.value)} placeholder='Digite o título...' className='w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary' />
            {searching && <Loader2 className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground' />}
          </div>
        </div>
        {results.length > 0 && (
          <div className='border border-border rounded-lg overflow-hidden divide-y divide-border'>
            {results.map(r => (
              <button key={r.tmdbId + r.type} onClick={() => handleSelect(r)} className='w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left'>
                {r.posterUrl ? <img src={r.posterUrl} alt={r.title} className='w-8 h-12 rounded object-cover shrink-0' /> : <div className='w-8 h-12 rounded bg-muted shrink-0' />}
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium truncate'>{r.title}</p>
                  <p className='text-xs text-muted-foreground'>{r.type === 'MOVIE' ? 'Filme' : 'Série'} • {r.releaseYear || '?'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className='flex items-center justify-center py-12'><Loader2 className='w-6 h-6 animate-spin text-muted-foreground' /></div>}

      {selected && loading === false && (
        <div className='bg-card border border-border rounded-xl p-6 space-y-5'>
          <div className='flex gap-4'>
            {selected.posterUrl && <img src={selected.posterUrl} alt={selected.title} className='w-20 rounded-lg object-cover shrink-0' style={{ height: '120px' }} />}
            <div>
              <h3 className='font-bold text-lg'>{selected.title}</h3>
              <p className='text-sm text-muted-foreground'>{selected.type === 'MOVIE' ? 'Filme' : 'Série'} • {selected.releaseYear} {selected.type === 'TV' && selected.tvStatus ? <span className={'ml-1 text-xs px-2 py-0.5 rounded-full font-medium ' + (selected.tvStatus === 'EM_ANDAMENTO' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400')}>{selected.tvStatus === 'EM_ANDAMENTO' ? 'Em Andamento' : 'Finalizada'}</span> : null}</p>
              {selected.genres && <p className='text-xs text-muted-foreground mt-1'>{selected.genres.join(', ')}</p>}
              <p className='text-sm mt-2 text-muted-foreground line-clamp-3'>{selected.overview}</p>
            </div>
          </div>

          <hr className='border-border' />

          <div>
            <label className='text-sm font-medium text-muted-foreground block mb-2'>Disponibilidade</label>
            <div className='flex gap-4'>
              {(['P1', 'P2'] as const).map(p => {
                const key = p === 'P1' ? 'hasP1' : 'hasP2'
                const label = p === 'P1' ? 'B2P' : 'P2B'
                return (
                  <label key={p} className='flex items-center gap-2 cursor-pointer'>
                    <div className={'w-10 h-6 rounded-full transition-colors cursor-pointer ' + ((form as any)[key] ? 'bg-primary' : 'bg-muted')} onClick={() => setForm({ ...form, [key]: (form as any)[key] === true ? false : true })}>
                      <div className={'w-4 h-4 rounded-full bg-white mt-1 transition-transform ' + ((form as any)[key] ? 'translate-x-5' : 'translate-x-1')} />
                    </div>
                    <span className='text-sm font-semibold'>{label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <label className='text-sm font-medium text-muted-foreground block mb-2'>Tipo de Áudio</label>
            <div className='flex gap-2'>
              {audioOptions.map(opt => (
                <button key={opt.value} onClick={() => setForm({ ...form, audioType: opt.value })} className={'px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (form.audioType === opt.value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {selected.type === 'TV' && (
            <>
              <div>
                <label className='text-sm font-medium text-muted-foreground block mb-1.5'>Status da Série</label>
                <select value={form.tvStatus} onChange={e => setForm({ ...form, tvStatus: e.target.value })} className='w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'>
                  <option value='EM_ANDAMENTO'>Em Andamento</option>
                  <option value='FINALIZADA'>Finalizada</option>
                </select>
              </div>

              {seasons.length > 0 && (
                <div>
                  <label className='text-sm font-medium text-muted-foreground block mb-2'>Episódios por Temporada</label>

                  <div className='flex items-center gap-2 mb-3 p-3 bg-muted rounded-lg'>
                    <span className='text-xs text-muted-foreground shrink-0'>Aplicar</span>
                    <input
                      type='number'
                      min={1}
                      value={bulkCount}
                      onChange={e => setBulkCount(e.target.value)}
                      placeholder='qtd'
                      className='w-16 bg-background border border-border rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary'
                    />
                    <span className='text-xs text-muted-foreground shrink-0'>eps às {seasons.length} temporadas</span>
                    <button
                      onClick={applyToAllSeasons}
                      disabled={!bulkCount || parseInt(bulkCount) < 1}
                      className='ml-auto px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition disabled:opacity-40'
                    >
                      Aplicar a todas
                    </button>
                  </div>

                  <div className='flex gap-2 flex-wrap mb-3'>
                    {seasons.map(s => {
                      const count = (selectedEpisodes[s.season_number] || []).length
                      return (
                        <button key={s.season_number} onClick={() => setSelectedSeason(s.season_number)} className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ' + (selectedSeason === s.season_number ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                          T{s.season_number}
                          {count > 0 && <span className={'rounded-full px-1.5 py-0.5 text-[10px] font-bold ' + (selectedSeason === s.season_number ? 'bg-white/20' : 'bg-primary/20 text-primary')}>{count}</span>}
                        </button>
                      )
                    })}
                  </div>

                  {currentSeason && (
                    <div className='bg-muted rounded-xl p-4'>
                      <div className='flex items-center justify-between mb-3'>
                        <p className='text-sm font-semibold'>{currentSeason.name}</p>
                        <div className='flex gap-2'>
                          <button onClick={() => selectAllEpisodes(currentSeason)} className='px-2.5 py-1 rounded-md text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition'>
                            Todos
                          </button>
                          <button onClick={() => clearEpisodes(currentSeason.season_number)} className='px-2.5 py-1 rounded-md text-xs font-medium bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30 transition'>
                            Limpar
                          </button>
                        </div>
                      </div>
                      <div className='flex flex-wrap gap-1.5'>
                        {Array.from({ length: currentSeason.episode_count }, (_, i) => i + 1).map(ep => {
                          const isSelected = selectedEpsInSeason.includes(ep)
                          return (
                            <button
                              key={ep}
                              onClick={() => toggleEpisode(currentSeason.season_number, ep)}
                              className={'w-10 h-8 rounded-md text-xs font-semibold transition-all ' + (isSelected ? 'bg-primary text-white' : 'bg-background text-muted-foreground hover:text-foreground hover:bg-secondary')}
                            >
                              {ep}
                            </button>
                          )
                        })}
                      </div>
                      <p className='text-xs text-muted-foreground mt-3'>
                        {selectedEpsInSeason.length} de {currentSeason.episode_count} episódios selecionados
                      </p>
                    </div>
                  )}

                  <div className='mt-3 text-center'>
                    <p className='text-xs text-muted-foreground'>Total geral: <span className='font-bold text-foreground'>{form.tvEpisodes} episódios</span></p>
                  </div>
                </div>
              )}
            </>
          )}

          <button onClick={handleSubmit} disabled={saving} className='w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2'>
            {saving ? <Loader2 className='w-4 h-4 animate-spin' /> : <Check className='w-4 h-4' />}
            {saving ? 'Salvando...' : 'Cadastrar Título'}
          </button>
        </div>
      )}
    </div>
  )
}
