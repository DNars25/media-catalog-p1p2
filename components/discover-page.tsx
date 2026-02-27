'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Search, Loader2, Check, X, Film, Tv } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentItem {
  tmdbId: number
  title: string
  posterUrl: string | null
  year: number | null
  overview: string
}

interface TmdbDetails {
  title: string
  posterUrl: string | null
  releaseYear: number | null
  overview: string
  genres: string[]
  tvSeasons?: number | null
  tvEpisodes?: number | null
  tvStatus?: 'EM_ANDAMENTO' | 'FINALIZADA' | null
}

interface SectionState {
  title: string
  items: ContentItem[]
  loading: boolean
}

// ─── CadastroModal ────────────────────────────────────────────────────────────

type ModalStep = 'choose' | 'add' | 'request'

function CadastroModal({
  item,
  type,
  onClose,
  onSuccess,
}: {
  item: ContentItem
  type: 'MOVIE' | 'TV'
  onClose: () => void
  onSuccess: (tmdbId: number) => void
}) {
  const [step, setStep] = useState<ModalStep>('choose')
  const [details, setDetails] = useState<TmdbDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(true)
  const [p1, setP1] = useState(false)
  const [p2, setP2] = useState(false)
  const [audioType, setAudioType] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const tmdbType = type === 'MOVIE' ? 'movie' : 'tv'
    fetch(`/api/tmdb/details?type=${tmdbType}&tmdbId=${item.tmdbId}`)
      .then(r => r.json())
      .then(d => setDetails(d))
      .catch(() => {})
      .finally(() => setLoadingDetails(false))
  }, [item.tmdbId, type])

  async function handleAddToLibrary() {
    if (!p1 && !p2) { toast.error('Selecione pelo menos um servidor'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: item.tmdbId,
          type,
          title: details?.title || item.title,
          overview: details?.overview || item.overview || null,
          posterUrl: details?.posterUrl || item.posterUrl || null,
          releaseYear: details?.releaseYear || item.year || null,
          genres: details?.genres ?? [],
          internalStatus: 'DISPONIVEL',
          hasP1: p1,
          hasP2: p2,
          audioType: audioType || null,
          ...(type === 'TV' && details ? {
            tvSeasons: details.tvSeasons ?? null,
            tvEpisodes: details.tvEpisodes ?? null,
            tvStatus: details.tvStatus ?? null,
          } : {}),
        }),
      })
      if (res.status === 409) {
        toast.info(`"${item.title}" já está na biblioteca`)
        onSuccess(item.tmdbId)
        return
      }
      if (!res.ok) {
        const data = await res.json()
        throw new Error(typeof data.error === 'string' ? data.error : 'Erro ao cadastrar')
      }
      toast.success(`"${item.title}" adicionado à biblioteca!`)
      onSuccess(item.tmdbId)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateRequest() {
    setSaving(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedTitle: details?.title || item.title,
          type,
          tmdbId: item.tmdbId,
          posterUrl: details?.posterUrl || item.posterUrl || null,
          notes: notes.trim() || null,
          source: 'ADMIN',
        }),
      })
      if (!res.ok) throw new Error('Erro ao criar pedido')
      toast.success(`Pedido criado para "${item.title}"!`)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSaving(false)
    }
  }

  const audioOptions = type === 'MOVIE'
    ? [
        { value: 'DUBLADO', label: '🎙️ Dublado' },
        { value: 'LEGENDADO', label: '📝 Legendado' },
        { value: 'DUBLADO_LEGENDADO', label: '✅ Dublado + Legendado' },
      ]
    : [
        { value: 'TODAS_DUBLADO', label: '🎙️ Todas as temporadas — Dub' },
        { value: 'TODAS_LEGENDADO', label: '📝 Todas as temporadas — Leg' },
        { value: 'TODAS_DUBLADO_LEGENDADO', label: '✅ Todas as temporadas — Dub/Leg' },
      ]

  const poster = details?.posterUrl || item.posterUrl

  // ── Shared header ──
  const header = (
    <div className="flex items-start gap-4 p-5 border-b border-border">
      {poster
        ? <img src={poster} alt={item.title} className="w-20 rounded-lg object-cover flex-shrink-0" style={{ height: '112px' }} />
        : <div className="w-20 h-28 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
            {type === 'MOVIE' ? <Film className="w-6 h-6 text-muted-foreground" /> : <Tv className="w-6 h-6 text-muted-foreground" />}
          </div>
      }
      <div className="flex-1 min-w-0">
        <h2 className="font-bold text-base leading-tight">{details?.title || item.title}</h2>
        {(details?.releaseYear || item.year) && (
          <p className="text-muted-foreground text-sm mt-0.5">{details?.releaseYear || item.year}</p>
        )}
        {loadingDetails
          ? <div className="h-2.5 bg-muted rounded animate-pulse mt-2 w-3/4" />
          : details?.genres?.length
            ? <p className="text-muted-foreground text-xs mt-1">{details.genres.slice(0, 3).join(' · ')}</p>
            : null
        }
        {type === 'TV' && details && (
          <p className="text-muted-foreground text-xs mt-0.5">
            {[
              details.tvSeasons ? `${details.tvSeasons} temp.` : null,
              details.tvEpisodes ? `${details.tvEpisodes} eps` : null,
              details.tvStatus === 'FINALIZADA' ? 'Finalizada' : details.tvStatus === 'EM_ANDAMENTO' ? 'Em andamento' : null,
            ].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="text-muted-foreground text-xs mt-1.5 line-clamp-2 leading-relaxed">
          {details?.overview || item.overview || 'Sem descrição.'}
        </p>
      </div>
      <button onClick={onClose} className="flex-shrink-0 p-1 rounded hover:bg-secondary text-muted-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {header}

        {/* ── Step: choose ── */}
        {step === 'choose' && (
          <>
            <div className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground mb-1">O que deseja fazer com este título?</p>
              <button
                onClick={() => setStep('add')}
                className="w-full text-left p-4 rounded-xl border border-border hover:border-primary/60 hover:bg-primary/5 transition group"
              >
                <p className="font-semibold text-sm group-hover:text-primary transition">✅ Adicionar à Biblioteca</p>
                <p className="text-xs text-muted-foreground mt-0.5">Já temos este conteúdo disponível no servidor</p>
              </button>
              <button
                onClick={() => setStep('request')}
                className="w-full text-left p-4 rounded-xl border border-border hover:border-orange-500/60 hover:bg-orange-500/5 transition group"
              >
                <p className="font-semibold text-sm group-hover:text-orange-400 transition">📋 Criar Pedido</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ainda não temos — solicitar para adicionar ao servidor</p>
              </button>
            </div>
            <div className="px-5 pb-5">
              <button onClick={onClose} className="w-full py-2 rounded-lg border border-border text-sm hover:bg-secondary transition text-muted-foreground">
                Cancelar
              </button>
            </div>
          </>
        )}

        {/* ── Step: add to library ── */}
        {step === 'add' && (
          <>
            <div className="p-5 space-y-5">
              <div>
                <p className="text-sm font-semibold mb-2">Servidor <span className="text-red-400">*</span></p>
                <div className="flex gap-3">
                  {[
                    { label: 'B2P', checked: p1, toggle: () => setP1(v => !v) },
                    { label: 'P2B', checked: p2, toggle: () => setP2(v => !v) },
                  ].map(s => (
                    <button
                      key={s.label}
                      onClick={s.toggle}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition ${
                        s.checked ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground'
                      }`}
                    >
                      {s.checked && <Check className="w-3.5 h-3.5" />}
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Áudio <span className="text-muted-foreground font-normal text-xs">(opcional)</span></p>
                <div className="space-y-2">
                  {audioOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAudioType(audioType === opt.value ? '' : opt.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${
                        audioType === opt.value
                          ? 'bg-primary/20 border-primary text-foreground'
                          : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setStep('choose')} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition text-muted-foreground">
                ← Voltar
              </button>
              <button
                onClick={handleAddToLibrary}
                disabled={saving || (!p1 && !p2)}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-2 transition"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Salvando...' : 'Adicionar à Biblioteca'}
              </button>
            </div>
          </>
        )}

        {/* ── Step: create request ── */}
        {step === 'request' && (
          <>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">Um pedido será criado para este título na fila de Pedidos.</p>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Observações <span className="text-muted-foreground font-normal text-xs">(opcional)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Informações adicionais sobre o pedido..."
                  rows={3}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setStep('choose')} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition text-muted-foreground">
                ← Voltar
              </button>
              <button
                onClick={handleCreateRequest}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-500 disabled:opacity-40 flex items-center justify-center gap-2 transition"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Criando...' : 'Criar Pedido'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── ContentCard ──────────────────────────────────────────────────────────────

function ContentCard({ item, inLibrary, type, onClick }: {
  item: ContentItem
  inLibrary: boolean
  type: 'MOVIE' | 'TV'
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative rounded-xl overflow-hidden border transition-all text-left w-full ${
        inLibrary
          ? 'border-green-500/40 opacity-75 cursor-default'
          : 'border-border hover:border-primary/60 hover:shadow-md'
      }`}
    >
      <div className="aspect-[2/3] relative bg-muted overflow-hidden">
        {item.posterUrl
          ? <img
              src={item.posterUrl}
              alt={item.title}
              className={`w-full h-full object-cover ${inLibrary ? '' : 'group-hover:scale-105 transition-transform duration-300'}`}
            />
          : <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              {type === 'MOVIE' ? <Film className="w-7 h-7" /> : <Tv className="w-7 h-7" />}
            </div>
        }
        {inLibrary ? (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-green-600/90 text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
              <Check className="w-2.5 h-2.5" /> Biblioteca
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full">
              + Adicionar
            </span>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-medium leading-tight line-clamp-2">{item.title}</p>
        {item.year && <p className="text-muted-foreground text-[10px] mt-0.5">{item.year}</p>}
      </div>
    </button>
  )
}

// ─── DiscoverPage ─────────────────────────────────────────────────────────────

export default function DiscoverPage({ type }: { type: 'MOVIE' | 'TV' }) {
  const { status } = useSession()
  const [sections, setSections] = useState<SectionState[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ContentItem[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [inLibrary, setInLibrary] = useState<Set<number>>(new Set())
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout>>()

  const isMovie = type === 'MOVIE'

  // Load discover sections
  useEffect(() => {
    const sectionDefs = isMovie
      ? [{ key: 'now_playing', title: '🎥 Em Cartaz Hoje' }, { key: 'upcoming', title: '🚀 Próximas Estreias' }]
      : [{ key: 'on_the_air', title: '📡 Em Exibição Agora' }, { key: 'popular', title: '🔥 Séries Populares' }]

    setSections(sectionDefs.map(s => ({ title: s.title, items: [], loading: true })))

    const tmdbType = isMovie ? 'movie' : 'tv'
    sectionDefs.forEach((def, idx) => {
      fetch(`/api/tmdb/discover?type=${tmdbType}&section=${def.key}`)
        .then(r => r.json())
        .then(d => {
          const items: ContentItem[] = (d.results || []).map((r: {
            tmdbId: number; title: string; posterPath: string | null
            releaseDate: string | null; overview: string
          }) => ({
            tmdbId: r.tmdbId,
            title: r.title,
            posterUrl: r.posterPath,
            year: r.releaseDate ? parseInt(r.releaseDate.slice(0, 4)) : null,
            overview: r.overview,
          }))
          setSections(prev => prev.map((s, i) => i === idx ? { ...s, items, loading: false } : s))
        })
        .catch(() => setSections(prev => prev.map((s, i) => i === idx ? { ...s, loading: false } : s)))
    })
  }, [type, isMovie])

  // Check library membership for a list of items
  const checkLibrary = useCallback(async (items: ContentItem[]) => {
    const ids = items.map(i => i.tmdbId).join(',')
    if (!ids) return
    try {
      const res = await fetch(`/api/titles?type=${type}&tmdbId=${ids}&limit=50`)
      const data = await res.json()
      const foundIds: number[] = (data.titles || []).map((t: { tmdbId: number }) => t.tmdbId)
      setInLibrary(prev => { const next = new Set(Array.from(prev)); foundIds.forEach(id => next.add(id)); return next })
    } catch {}
  }, [type])

  // Check library after all discover sections finish loading
  useEffect(() => {
    if (sections.length > 0 && !sections.some(s => s.loading)) {
      checkLibrary(sections.flatMap(s => s.items))
    }
  }, [sections, checkLibrary])

  // Search
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    clearTimeout(searchRef.current)
    if (value.trim().length < 2) { setSearchResults(null); return }
    searchRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const tmdbType = isMovie ? 'movie' : 'tv'
        const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(value.trim())}&type=${tmdbType}`)
        const data = await res.json()
        const results: ContentItem[] = (Array.isArray(data) ? data : []).map((r: {
          tmdbId: number; title: string; posterUrl: string | null
          releaseYear: number | null; overview: string
        }) => ({
          tmdbId: r.tmdbId,
          title: r.title,
          posterUrl: r.posterUrl,
          year: r.releaseYear,
          overview: r.overview,
        }))
        setSearchResults(results)
        if (results.length > 0) checkLibrary(results)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  const handleCardClick = (item: ContentItem) => {
    if (inLibrary.has(item.tmdbId)) {
      toast.info(`"${item.title}" já está na biblioteca`)
      return
    }
    setSelectedItem(item)
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  const displaySections: SectionState[] = searchResults !== null
    ? [{ title: `Resultados para "${searchQuery}"`, items: searchResults, loading: searching }]
    : sections

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{isMovie ? '🎬 Filmes' : '📺 Séries'}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isMovie
            ? 'Navegue por lançamentos e adicione filmes diretamente à biblioteca.'
            : 'Navegue por séries e adicione diretamente à biblioteca.'}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          placeholder={`Buscar ${isMovie ? 'filme' : 'série'} no TMDB...`}
          className="w-full bg-muted border border-border rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {searching
          ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          : searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults(null) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )
        }
      </div>

      {/* Sections */}
      {displaySections.map((section, idx) => (
        <div key={idx} className="mb-10">
          <h2 className="text-base font-semibold mb-4">
            {section.title}
            {searchResults !== null && !section.loading && (
              <span className="text-muted-foreground text-sm font-normal ml-2">
                ({section.items.length} resultado{section.items.length !== 1 ? 's' : ''})
              </span>
            )}
          </h2>
          {section.loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : section.items.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhum resultado encontrado.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-3">
              {section.items.map(item => (
                <ContentCard
                  key={item.tmdbId}
                  item={item}
                  inLibrary={inLibrary.has(item.tmdbId)}
                  type={type}
                  onClick={() => handleCardClick(item)}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Modal */}
      {selectedItem && (
        <CadastroModal
          item={selectedItem}
          type={type}
          onClose={() => setSelectedItem(null)}
          onSuccess={(tmdbId) => {
            setInLibrary(prev => { const next = new Set(Array.from(prev)); next.add(tmdbId); return next })
            setSelectedItem(null)
          }}
        />
      )}
    </div>
  )
}
