'use client'

import { useState, useRef, useEffect } from 'react'
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

interface TitleDetails extends TMDBResult {
  genres: string[]
  tvSeasons?: number | null
  tvEpisodes?: number | null
  tvStatus?: 'EM_ANDAMENTO' | 'FINALIZADA' | null
}

export default function NewTitlePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<'movie' | 'tv' | 'multi'>('multi')
  const [results, setResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<TitleDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    hasP1: false,
    hasP2: false,
    internalStatus: 'AGUARDANDO_DOWNLOAD',
    tvStatus: '',
    tvSeasons: '',
    tvEpisodes: '',
  })

  const searchTimeout = useRef<NodeJS.Timeout>()

  const handleSearch = (value: string) => {
    setQuery(value)
    clearTimeout(searchTimeout.current)
    if (!value.trim()) { setResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(value)}&type=${searchType}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
      setSearching(false)
    }, 400)
  }

  const handleSelect = async (r: TMDBResult) => {
    setResults([])
    setQuery(r.title)
    setLoading(true)
    const type = r.type === 'MOVIE' ? 'movie' : 'tv'
    const res = await fetch(`/api/tmdb/details?type=${type}&tmdbId=${r.tmdbId}`)
    const data = await res.json()
    setSelected(data)
    setForm((f) => ({
      ...f,
      tvStatus: data.tvStatus || '',
      tvSeasons: data.tvSeasons || '',
      tvEpisodes: data.tvEpisodes || '',
    }))
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!selected) return
    setSaving(true)
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
        internalStatus: form.internalStatus,
      }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Título cadastrado com sucesso!')
      router.push('/dashboard/titles')
    } else {
      const err = await res.json()
      if (res.status === 409) toast.error('Título já cadastrado')
      else toast.error('Erro ao salvar')
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Cadastrar Título</h1>
        <p className="text-muted-foreground mt-1">Busque no TMDB e importe os dados automaticamente</p>
      </div>

      {/* TMDB Search */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-4">Buscar no TMDB</h2>

        <div className="flex gap-3 mb-3">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as any)}
            className="bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="multi">Todos</option>
            <option value="movie">Filmes</option>
            <option value="tv">Séries</option>
          </select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Digite o título..."
              className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </div>

        {/* Results dropdown */}
        {results.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {results.map((r) => (
              <button
                key={`${r.tmdbId}-${r.type}`}
                onClick={() => handleSelect(r)}
                className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left"
              >
                {r.posterUrl ? (
                  <img src={r.posterUrl} alt={r.title} className="w-8 h-12 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-12 rounded bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.type === 'MOVIE' ? 'Filme' : 'Série'} • {r.releaseYear || '?'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title preview + form */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {selected && !loading && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex gap-4">
            {selected.posterUrl && (
              <img src={selected.posterUrl} alt={selected.title} className="w-20 h-30 rounded-lg object-cover shrink-0" />
            )}
            <div>
              <h3 className="font-bold text-lg">{selected.title}</h3>
              <p className="text-sm text-muted-foreground">{selected.type === 'MOVIE' ? 'Filme' : 'Série'} • {selected.releaseYear}</p>
              {selected.genres && <p className="text-xs text-muted-foreground mt-1">{selected.genres.join(', ')}</p>}
              <p className="text-sm mt-2 text-muted-foreground line-clamp-3">{selected.overview}</p>
            </div>
          </div>

          <hr className="border-border" />

          {/* P1/P2 */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Disponibilidade</label>
            <div className="flex gap-4">
              {(['P1', 'P2'] as const).map((p) => {
                const key = p === 'P1' ? 'hasP1' : 'hasP2'
                return (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <div
                      className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${(form as any)[key] ? 'bg-primary' : 'bg-muted'}`}
                      onClick={() => setForm({ ...form, [key]: !(form as any)[key] })}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${(form as any)[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-sm font-semibold">{p}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1.5">Status Interno</label>
            <select
              value={form.internalStatus}
              onChange={(e) => setForm({ ...form, internalStatus: e.target.value })}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="AGUARDANDO_DOWNLOAD">Aguardando Download</option>
              <option value="DISPONIVEL">Disponível</option>
              <option value="INDISPONIVEL">Indisponível</option>
            </select>
          </div>

          {/* TV fields */}
          {selected.type === 'TV' && (
            <>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Status da Série</label>
                <select
                  value={form.tvStatus}
                  onChange={(e) => setForm({ ...form, tvStatus: e.target.value })}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Não definido</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="FINALIZADA">Finalizada</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">Temporadas</label>
                  <input
                    type="number"
                    value={form.tvSeasons}
                    onChange={(e) => setForm({ ...form, tvSeasons: e.target.value })}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">Episódios</label>
                  <input
                    type="number"
                    value={form.tvEpisodes}
                    onChange={(e) => setForm({ ...form, tvEpisodes: e.target.value })}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Cadastrar Título'}
          </button>
        </div>
      )}
    </div>
  )
}
