'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Lock, Plus, Search, X, Trash2, Loader2 } from 'lucide-react'

interface TitleEpisode {
  season: number
  episode: number
}

interface LatestRequest {
  id: string
  status: string
  audioType: string | null
  seasonNumber: number | null
  notes: string | null
  source: string
  createdAt: string
  createdById: string
  createdBy: { name: string; email: string }
}

interface SerieCard {
  id: string
  title: string
  posterUrl: string | null
  tvSeasons: number | null
  tvEpisodes: number | null
  tvStatus: string | null
  tmdbId: number
  savedEpisodeCount: number
  latestRequest: LatestRequest | null
}

interface TmdbResult {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  first_air_date?: string
  release_date?: string
}

const reqStatusColor: Record<string, string> = {
  ABERTO: 'bg-yellow-600',
  EM_ANDAMENTO: 'bg-blue-500',
  EM_PROGRESSO: 'bg-purple-600',
  CONCLUIDO: 'bg-green-600',
  REJEITADO: 'bg-red-600',
}
const reqStatusLabel: Record<string, string> = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em Andamento',
  EM_PROGRESSO: 'Em Progresso',
  CONCLUIDO: 'Concluído',
  REJEITADO: 'Rejeitado',
}

// ────────────────────────────────────────────────────────────────────────────
// EpisodeGrid
// ────────────────────────────────────────────────────────────────────────────
function EpisodeGrid({
  savedEpisodes,
  tmdbSeasons,
  selectedNew,
  onToggleNew,
  onSelectAllNew,
  onClearNew,
  selectedSeason,
  onSeasonChange,
  manualSeasonCounts,
  onManualCount,
}: {
  savedEpisodes: TitleEpisode[]
  tmdbSeasons: Record<number, number>
  selectedNew: Record<number, number[]>
  onToggleNew: (season: number, ep: number) => void
  onSelectAllNew: (season: number) => void
  onClearNew: (season: number) => void
  selectedSeason: number
  onSeasonChange: (s: number) => void
  manualSeasonCounts: Record<number, number>
  onManualCount: (season: number, count: number) => void
}) {
  const tmdbSeasonNums = Object.keys(tmdbSeasons).map(Number).filter(n => n > 0)
  const savedSeasonNums = Array.from(new Set(savedEpisodes.map(e => e.season)))
  const newSeasonNums = Object.keys(selectedNew).map(Number).filter(n => (selectedNew[n] || []).length > 0)
  const manualSeasonNums = Object.keys(manualSeasonCounts).map(Number).filter(n => manualSeasonCounts[n] > 0)
  // selectedSeason sempre incluído para que a aba corrente apareça mesmo sem dados prévios
  const allSeasons = Array.from(
    new Set([...tmdbSeasonNums, ...savedSeasonNums, ...newSeasonNums, ...manualSeasonNums, selectedSeason])
  ).sort((a, b) => a - b)

  const nextSeason = Math.max(...allSeasons) + 1

  const savedEpsInSeason = savedEpisodes.filter(e => e.season === selectedSeason).map(e => e.episode)
  const savedSet = new Set(savedEpsInSeason)
  const newEpsInSeason = selectedNew[selectedSeason] || []
  const newSet = new Set(newEpsInSeason)

  const tmdbCount = tmdbSeasons[selectedSeason] > 0 ? tmdbSeasons[selectedSeason] : 0
  const savedMax = savedEpsInSeason.length > 0 ? Math.max(...savedEpsInSeason) : 0
  const newMax = newEpsInSeason.length > 0 ? Math.max(...newEpsInSeason) : 0
  const manualCount = manualSeasonCounts[selectedSeason] || 0
  const maxEpInSeason = Math.max(tmdbCount, savedMax, newMax, manualCount)

  return (
    <div>
      {/* Abas de temporada + botão nova temporada */}
      <div className="flex gap-2 flex-wrap mb-3 items-center">
        {allSeasons.map(s => {
          const savedCount = savedEpisodes.filter(e => e.season === s).length
          const newCount = (selectedNew[s] || []).length
          return (
            <button
              key={s}
              onClick={() => onSeasonChange(s)}
              className={
                'px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ' +
                (selectedSeason === s ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')
              }
            >
              T{s}
              {savedCount > 0 && (
                <span className={'rounded-full px-1.5 text-[10px] font-bold ' + (selectedSeason === s ? 'bg-white/20' : 'bg-orange-500/20 text-orange-400')}>
                  {savedCount}
                </span>
              )}
              {newCount > 0 && (
                <span className={'rounded-full px-1.5 text-[10px] font-bold ' + (selectedSeason === s ? 'bg-green-400/30 text-green-200' : 'bg-green-500/20 text-green-400')}>
                  +{newCount}
                </span>
              )}
            </button>
          )
        })}
        {/* Botão: troca para próxima temporada — count definido pelo usuário no input abaixo */}
        <button
          onClick={() => onSeasonChange(nextSeason)}
          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-zinc-600 text-zinc-500 hover:border-zinc-400 hover:text-zinc-300 transition"
        >
          + T{nextSeason}
        </button>
      </div>

      {/* Grid da temporada selecionada */}
      {maxEpInSeason > 0 ? (
        <div className="bg-zinc-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400 flex items-center gap-2">
              Temporada {selectedSeason}
              {tmdbCount > 0 && <span className="text-zinc-500">· {tmdbCount} no TMDB</span>}
              {savedEpsInSeason.length > 0 && (
                <span className="text-orange-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {savedEpsInSeason.length} no servidor
                </span>
              )}
            </span>
            <div className="flex gap-1.5">
              <button onClick={() => onSelectAllNew(selectedSeason)} className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 transition">
                + Todos novos
              </button>
              <button onClick={() => onClearNew(selectedSeason)} className="px-2 py-0.5 rounded text-xs bg-zinc-700 text-zinc-400 hover:bg-zinc-600 transition">
                Limpar
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {Array.from({ length: maxEpInSeason }, (_, i) => i + 1).map(ep => {
              const isSaved = savedSet.has(ep)
              const isNew = newSet.has(ep)
              return (
                <button
                  key={ep}
                  onClick={() => !isSaved && onToggleNew(selectedSeason, ep)}
                  disabled={isSaved}
                  title={isSaved ? 'Já no servidor' : isNew ? 'Adicionando' : 'Disponível para adicionar'}
                  className={
                    'w-10 h-8 rounded text-xs font-semibold transition flex items-center justify-center ' +
                    (isSaved
                      ? 'bg-orange-500/80 text-white cursor-not-allowed'
                      : isNew
                      ? 'bg-green-600 text-white'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700')
                  }
                >
                  {isSaved ? <Lock className="w-3 h-3" /> : ep}
                </button>
              )
            })}
          </div>

          {newEpsInSeason.length > 0 && (
            <p className="text-xs text-green-500 mt-2">+{newEpsInSeason.length} para adicionar nesta temporada</p>
          )}

          {/* Estender temporada além do TMDB */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-700/50">
            <span className="text-xs text-zinc-600">Estender até o ep:</span>
            <input
              type="number"
              min={maxEpInSeason + 1}
              max={300}
              placeholder={String(maxEpInSeason + 1)}
              onChange={e => {
                const n = parseInt(e.target.value)
                if (!isNaN(n) && n > maxEpInSeason) onManualCount(selectedSeason, n)
              }}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white w-16 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <span className="text-zinc-700 text-xs flex items-center gap-3 ml-1">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/80 inline-block" />Servidor</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600 inline-block" />Adicionando</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-zinc-900 border border-zinc-700 inline-block" />Disponível</span>
            </span>
          </div>
        </div>
      ) : (
        /* Temporada sem dados — input para definir total de eps */
        <div className="flex items-center gap-3 bg-zinc-800 rounded-xl p-3">
          <p className="text-xs text-zinc-500">T{selectedSeason}: quantos episódios tem?</p>
          <input
            type="number"
            min={1}
            max={300}
            value={manualSeasonCounts[selectedSeason] || ''}
            onChange={e => {
              const n = parseInt(e.target.value)
              onManualCount(selectedSeason, isNaN(n) || n < 1 ? 0 : n)
            }}
            placeholder="Ex: 8"
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white w-20 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// NovaAtualizacaoModal — 3 etapas: busca TMDB → verifica biblioteca → formulário
// ────────────────────────────────────────────────────────────────────────────
function NovaAtualizacaoModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<TmdbResult[]>([])
  const [selectedTmdb, setSelectedTmdb] = useState<TmdbResult | null>(null)
  const [libraryTitle, setLibraryTitle] = useState<{ id: string; title: string; tmdbId: number; posterUrl: string | null } | null>(null)
  const [checkingLibrary, setCheckingLibrary] = useState(false)
  const [notInLibrary, setNotInLibrary] = useState(false)
  const [savedEpisodes, setSavedEpisodes] = useState<TitleEpisode[]>([])
  const [tmdbSeasons, setTmdbSeasons] = useState<Record<number, number>>({})
  const [selectedNew, setSelectedNew] = useState<Record<number, number[]>>({})
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [manualSeasonCounts, setManualSeasonCounts] = useState<Record<number, number>>({})
  const [audio, setAudio] = useState('DUBLADO')
  const [obs, setObs] = useState('')
  const [seriesFinalizada, setSeriesFinalizada] = useState(false)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced TMDB search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}&type=tv`)
        const data = await res.json()
        setResults(Array.isArray(data.results) ? data.results.slice(0, 8) : [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  async function handleSelectTmdb(result: TmdbResult) {
    setSelectedTmdb(result)
    setStep(2)
    setCheckingLibrary(true)
    setNotInLibrary(false)
    try {
      const res = await fetch(`/api/titles?tmdbId=${result.id}&type=TV&limit=1`)
      const data = await res.json()
      const titles = data.titles || []
      if (titles.length === 0) {
        setNotInLibrary(true)
        setCheckingLibrary(false)
        return
      }
      const found = titles[0]
      setLibraryTitle({ id: found.id, title: found.title, tmdbId: found.tmdbId, posterUrl: found.posterUrl })

      // Load saved episodes
      const titleRes = await fetch('/api/titles/' + found.id)
      const titleData = await titleRes.json()
      const eps: TitleEpisode[] = titleData.episodes || []
      setSavedEpisodes(eps)

      // Load TMDB season data
      try {
        const tmdbRes = await fetch('/api/tmdb/details?type=tv&tmdbId=' + result.id)
        const tmdbData = await tmdbRes.json()
        if (Array.isArray(tmdbData.seasons)) {
          const seasonMap: Record<number, number> = {}
          for (const s of tmdbData.seasons) {
            if (s.season_number > 0) seasonMap[s.season_number] = s.episode_count
          }
          setTmdbSeasons(seasonMap)
          // Abre na primeira temporada com episódios disponíveis
          const savedCountBySeason = eps.reduce<Record<number, number>>((acc, e) => {
            acc[e.season] = (acc[e.season] || 0) + 1
            return acc
          }, {})
          const tmdbSeasonNums = Object.keys(seasonMap).map(Number).sort((a, b) => a - b)
          const firstAvailable = tmdbSeasonNums.find(s => (savedCountBySeason[s] || 0) < seasonMap[s])
          const initialSeason = firstAvailable ?? (tmdbSeasonNums.length > 0 ? Math.max(...tmdbSeasonNums) : 1)
          setSelectedSeason(initialSeason)
        }
      } catch (_) {}

      setStep(3)
    } catch {
      toast.error('Erro ao verificar biblioteca')
    } finally {
      setCheckingLibrary(false)
    }
  }

  const toggleNew = (season: number, ep: number) => {
    setSelectedNew(prev => {
      const current = prev[season] || []
      const idx = current.indexOf(ep)
      if (idx === -1) return { ...prev, [season]: [...current, ep].sort((a, b) => a - b) }
      return { ...prev, [season]: current.filter(e => e !== ep) }
    })
  }

  const selectAllNew = (season: number) => {
    const savedSet = new Set(savedEpisodes.filter(e => e.season === season).map(e => e.episode))
    const tmdbCount = tmdbSeasons[season] > 0 ? tmdbSeasons[season] : 0
    const savedInSeason = savedEpisodes.filter(e => e.season === season)
    const savedMax = savedInSeason.length > 0 ? Math.max(...savedInSeason.map(e => e.episode)) : 0
    const curNew = selectedNew[season] || []
    const newMax = curNew.length > 0 ? Math.max(...curNew) : 0
    const maxEp = Math.max(tmdbCount, savedMax, newMax, manualSeasonCounts[season] || 0)
    if (maxEp > 0) {
      const newEps = Array.from({ length: maxEp }, (_, i) => i + 1).filter(ep => !savedSet.has(ep))
      setSelectedNew(prev => ({ ...prev, [season]: newEps }))
    }
  }

  const clearNew = (season: number) => setSelectedNew(prev => ({ ...prev, [season]: [] }))

  const hasNewEpisodes = Object.values(selectedNew).some(eps => eps.length > 0)
  const totalNewEps = Object.values(selectedNew).reduce((sum, eps) => sum + eps.length, 0)

  const buildNotesFromNew = () => {
    const parts = Object.entries(selectedNew)
      .filter(([, eps]) => eps.length > 0)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([season, eps]) => {
        const sorted = [...eps].sort((a, b) => a - b)
        return `Temp ${season}: eps ${sorted[0]}-${sorted[sorted.length - 1]}`
      })
    return parts.length > 0 ? parts.join(', ') : null
  }

  async function handleSave() {
    if (!libraryTitle) return
    setSaving(true)
    try {
      if (hasNewEpisodes) {
        const episodesData = Object.entries(selectedNew).flatMap(([season, eps]) =>
          eps.map(ep => ({ season: parseInt(season), episode: ep }))
        )
        const res = await fetch('/api/titles/' + libraryTitle.id + '/episodes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episodesData }),
        })
        if (!res.ok) throw new Error()
      }

      const epNotes = buildNotesFromNew()
      const notes = [epNotes, obs.trim()].filter(Boolean).join('\n') || null
      const newStatus = seriesFinalizada ? 'CONCLUIDO' : 'ABERTO'

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedTitle: libraryTitle.title,
          type: 'TV',
          isUpdate: true,
          source: 'PEDIDO',
          linkedTitleId: libraryTitle.id,
          tmdbId: libraryTitle.tmdbId,
          posterUrl: libraryTitle.posterUrl,
          audioType: audio,
          notes,
          status: newStatus,
        }),
      })
      if (!res.ok) throw new Error()

      if (seriesFinalizada) {
        await fetch('/api/titles/' + libraryTitle.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tvStatus: 'FINALIZADA' }),
        })
        toast.success('Série finalizada e pedido criado!')
      } else {
        toast.success(hasNewEpisodes ? `Pedido criado! +${totalNewEps} eps adicionados` : 'Pedido criado!')
      }

      onSaved()
      onClose()
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const posterUrl = selectedTmdb?.poster_path
    ? `https://image.tmdb.org/t/p/w92${selectedTmdb.poster_path}`
    : null
  const displayTitle = selectedTmdb?.name || selectedTmdb?.title || ''
  const year = selectedTmdb?.first_air_date?.slice(0, 4) || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-white font-bold text-lg">Nova Atualização</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Etapa 1 — Busca TMDB */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar série no TMDB..."
                className="w-full rounded-lg px-4 py-2.5 pl-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
              />
            </div>

            {searching && <p className="text-xs text-zinc-500 text-center">Buscando...</p>}

            {results.length > 0 && (
              <div className="space-y-2">
                {results.map(r => {
                  const rTitle = r.name || r.title || ''
                  const rYear = (r.first_air_date || r.release_date || '').slice(0, 4)
                  const rPoster = r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : null
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleSelectTmdb(r)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition text-left"
                    >
                      {rPoster ? (
                        <img src={rPoster} alt={rTitle} className="w-10 h-14 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-14 bg-zinc-700 rounded flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">{rTitle}</p>
                        {rYear && <p className="text-zinc-500 text-xs">{rYear}</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {!searching && query.trim() && results.length === 0 && (
              <p className="text-xs text-zinc-500 text-center">Nenhum resultado encontrado.</p>
            )}
          </div>
        )}

        {/* Etapa 2 — Verificando biblioteca */}
        {step === 2 && (
          <div className="p-6">
            {/* Selected series info */}
            {selectedTmdb && (
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-zinc-800">
                {posterUrl ? (
                  <img src={posterUrl} alt={displayTitle} className="w-10 h-14 object-cover rounded flex-shrink-0" />
                ) : (
                  <div className="w-10 h-14 bg-zinc-700 rounded flex-shrink-0" />
                )}
                <div>
                  <p className="text-white text-sm font-medium">{displayTitle}</p>
                  {year && <p className="text-zinc-500 text-xs">{year}</p>}
                </div>
              </div>
            )}

            {checkingLibrary && (
              <p className="text-sm text-zinc-400 animate-pulse text-center py-4">Verificando na biblioteca...</p>
            )}

            {notInLibrary && !checkingLibrary && (
              <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4 text-center">
                <p className="text-amber-400 text-sm font-medium mb-1">Série não está na biblioteca</p>
                <p className="text-zinc-500 text-xs">Adicione-a primeiro na página de Títulos.</p>
                <button
                  onClick={() => { setStep(1); setSelectedTmdb(null); setNotInLibrary(false) }}
                  className="mt-3 text-xs text-zinc-400 hover:text-zinc-200 underline"
                >
                  Buscar outra série
                </button>
              </div>
            )}
          </div>
        )}

        {/* Etapa 3 — Formulário */}
        {step === 3 && libraryTitle && (
          <div className="p-6 space-y-4">
            {/* Serie info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800">
              {libraryTitle.posterUrl ? (
                <img src={libraryTitle.posterUrl} alt={libraryTitle.title} className="w-10 h-14 object-cover rounded flex-shrink-0" />
              ) : posterUrl ? (
                <img src={posterUrl} alt={libraryTitle.title} className="w-10 h-14 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-10 h-14 bg-zinc-700 rounded flex-shrink-0" />
              )}
              <div>
                <p className="text-white text-sm font-medium">{libraryTitle.title}</p>
                <p className="text-zinc-500 text-xs">Na biblioteca</p>
              </div>
            </div>

            {/* EpisodeGrid — sempre visível */}
            <div>
              <label className="text-xs text-zinc-400 block mb-2">
                Episódios
                <span className="ml-2 text-zinc-600 font-normal">(laranja = já no servidor · verde = adicionando)</span>
              </label>
              <EpisodeGrid
                savedEpisodes={savedEpisodes}
                tmdbSeasons={tmdbSeasons}
                selectedNew={selectedNew}
                onToggleNew={toggleNew}
                onSelectAllNew={selectAllNew}
                onClearNew={clearNew}
                selectedSeason={selectedSeason}
                onSeasonChange={setSelectedSeason}
                manualSeasonCounts={manualSeasonCounts}
                onManualCount={(season, count) => setManualSeasonCounts(prev => ({ ...prev, [season]: count }))}
              />
            </div>

            {/* Áudio */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Tipo de Áudio</label>
              <div className="flex flex-wrap gap-2">
                {['DUBLADO', 'LEGENDADO', 'DUBLADO_LEGENDADO'].map(a => (
                  <button
                    key={a}
                    onClick={() => setAudio(a)}
                    className={'px-3 py-1.5 rounded-lg text-xs font-medium transition ' + (audio === a ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')}
                  >
                    {a === 'DUBLADO' ? 'Dublado' : a === 'LEGENDADO' ? 'Legendado' : 'Dub+Leg'}
                  </button>
                ))}
              </div>
            </div>

            {/* Observação */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Observação <span className="text-zinc-600">(opcional)</span></label>
              <textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Ex: Eps 05 a 09 estão legendados"
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 resize-none"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
              />
            </div>

            {/* Finalizada */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="nova-finalizada"
                checked={seriesFinalizada}
                onChange={e => setSeriesFinalizada(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              <label htmlFor="nova-finalizada" className="text-sm text-zinc-300 cursor-pointer">
                Série completa no servidor (marca como Finalizada)
              </label>
            </div>

            {/* Botões */}
            <div className="flex gap-2">
              <button
                onClick={() => { setStep(1); setSelectedTmdb(null); setLibraryTitle(null); setSavedEpisodes([]); setTmdbSeasons({}); setSelectedNew({}) }}
                className="flex-1 py-2 rounded-lg text-sm text-zinc-400 border border-zinc-700 hover:bg-zinc-800 transition"
              >
                Voltar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition disabled:opacity-50"
              >
                {saving ? 'Salvando...' : hasNewEpisodes ? `Salvar (+${totalNewEps} eps)` : 'Salvar pedido'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// SerieModal
// ────────────────────────────────────────────────────────────────────────────
function SerieModal({
  serie,
  onClose,
  onRefresh,
  onDelete,
  isAdmin,
  userId,
}: {
  serie: SerieCard
  onClose: () => void
  onRefresh: () => void
  onDelete: (serieId: string) => void
  isAdmin: boolean
  userId: string
}) {
  const [updating, setUpdating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [audio, setAudio] = useState(serie.latestRequest?.audioType || 'DUBLADO')
  const [manualSeasonCounts, setManualSeasonCounts] = useState<Record<number, number>>({})
  const [seriesFinalizada, setSeriesFinalizada] = useState(false)
  const [obs, setObs] = useState('')
  const [savedEpisodes, setSavedEpisodes] = useState<TitleEpisode[]>([])
  const [tmdbSeasons, setTmdbSeasons] = useState<Record<number, number>>({})
  const [selectedNew, setSelectedNew] = useState<Record<number, number[]>>({})
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)

  const canEdit = isAdmin || serie.latestRequest?.createdById === userId

  useEffect(() => {
    async function load() {
      setLoadingEpisodes(true)
      try {
        const titleRes = await fetch('/api/titles/' + serie.id)
        const data = await titleRes.json()
        const eps: TitleEpisode[] = data.episodes || []
        setSavedEpisodes(eps)
        setSelectedNew({})

        if (data.tmdbId && data.type === 'TV') {
          try {
            const tmdbRes = await fetch('/api/tmdb/details?type=tv&tmdbId=' + data.tmdbId)
            const tmdbData = await tmdbRes.json()
            if (Array.isArray(tmdbData.seasons)) {
              const seasonMap: Record<number, number> = {}
              for (const s of tmdbData.seasons) {
                if (s.season_number > 0) seasonMap[s.season_number] = s.episode_count
              }
              setTmdbSeasons(seasonMap)
              // Abre na primeira temporada com episódios disponíveis (savedCount < tmdbCount)
              // Se todas estiverem "completas" pelo TMDB, abre na última
              const savedCountBySeason = eps.reduce<Record<number, number>>((acc, e) => {
                acc[e.season] = (acc[e.season] || 0) + 1
                return acc
              }, {})
              const tmdbSeasonNums = Object.keys(seasonMap).map(Number).sort((a, b) => a - b)
              const firstAvailable = tmdbSeasonNums.find(s => (savedCountBySeason[s] || 0) < seasonMap[s])
              const initialSeason = firstAvailable ?? (tmdbSeasonNums.length > 0 ? Math.max(...tmdbSeasonNums) : 1)
              setSelectedSeason(initialSeason)
            }
          } catch (_) {}
        } else if (eps.length > 0) {
          setSelectedSeason(Math.max(...eps.map(e => e.season)))
        }
      } finally {
        setLoadingEpisodes(false)
      }
    }
    load()
  }, [serie.id])

  const toggleNew = (season: number, ep: number) => {
    setSelectedNew(prev => {
      const current = prev[season] || []
      const idx = current.indexOf(ep)
      if (idx === -1) return { ...prev, [season]: [...current, ep].sort((a, b) => a - b) }
      return { ...prev, [season]: current.filter(e => e !== ep) }
    })
  }

  const selectAllNew = (season: number) => {
    const savedSet = new Set(savedEpisodes.filter(e => e.season === season).map(e => e.episode))
    const tmdbCount = tmdbSeasons[season] > 0 ? tmdbSeasons[season] : 0
    const savedInSeason = savedEpisodes.filter(e => e.season === season)
    const savedMax = savedInSeason.length > 0 ? Math.max(...savedInSeason.map(e => e.episode)) : 0
    const curNew = selectedNew[season] || []
    const newMax = curNew.length > 0 ? Math.max(...curNew) : 0
    const maxEp = Math.max(tmdbCount, savedMax, newMax, manualSeasonCounts[season] || 0)
    if (maxEp > 0) {
      const newEps = Array.from({ length: maxEp }, (_, i) => i + 1).filter(ep => !savedSet.has(ep))
      setSelectedNew(prev => ({ ...prev, [season]: newEps }))
    }
  }

  const clearNew = (season: number) => setSelectedNew(prev => ({ ...prev, [season]: [] }))

  const hasNewEpisodes = Object.values(selectedNew).some(eps => eps.length > 0)
  const totalNewEps = Object.values(selectedNew).reduce((sum, eps) => sum + eps.length, 0)

  const buildNotesFromNew = () => {
    const parts = Object.entries(selectedNew)
      .filter(([, eps]) => eps.length > 0)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([season, eps]) => {
        const sorted = [...eps].sort((a, b) => a - b)
        return `Temp ${season}: eps ${sorted[0]}-${sorted[sorted.length - 1]}`
      })
    return parts.length > 0 ? parts.join(', ') : null
  }

  async function handleStatusChange(newStatus: string) {
    if (!serie.latestRequest) return
    setUpdating(true)
    try {
      const res = await fetch('/api/requests/' + serie.latestRequest.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      toast.success('Status atualizado!')
      onRefresh()
      onClose()
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setUpdating(false)
    }
  }

  async function handleSaveUpdate() {
    setUpdating(true)
    try {
      if (hasNewEpisodes) {
        const episodesData = Object.entries(selectedNew).flatMap(([season, eps]) =>
          eps.map(ep => ({ season: parseInt(season), episode: ep }))
        )
        const res = await fetch('/api/titles/' + serie.id + '/episodes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episodesData }),
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          toast.error('Erro ao salvar episódios: ' + (res.status + (errBody?.error ? ' — ' + JSON.stringify(errBody.error) : '')))
          return
        }
      }

      const epNotes = buildNotesFromNew()
      const notes = [epNotes, obs.trim()].filter(Boolean).join('\n') || null
      const newStatus = seriesFinalizada ? 'CONCLUIDO' : 'ABERTO'

      if (serie.latestRequest) {
        await fetch('/api/requests/' + serie.latestRequest.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, audioType: audio, notes }),
        })
      } else {
        await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestedTitle: serie.title,
            type: 'TV',
            isUpdate: true,
            source: 'ADMIN',
            linkedTitleId: serie.id,
            tmdbId: serie.tmdbId,
            posterUrl: serie.posterUrl,
            audioType: audio,
            notes,
            status: newStatus,
          }),
        })
      }

      if (seriesFinalizada) {
        await fetch('/api/titles/' + serie.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tvStatus: 'FINALIZADA' }),
        })
        toast.success('Série finalizada e biblioteca atualizada!')
      } else {
        toast.success(hasNewEpisodes ? `+${totalNewEps} episódios salvos na biblioteca!` : 'Pedido registrado!')
      }

      onRefresh()
      onClose()
    } catch (e) {
      toast.error('Erro inesperado: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setUpdating(false)
    }
  }

  async function handleDeleteRequest() {
    if (!serie.latestRequest) return
    setUpdating(true)
    try {
      const res = await fetch('/api/requests/' + serie.latestRequest.id, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Pedido excluído!')
      onDelete(serie.id)
      onClose()
    } catch {
      toast.error('Erro ao excluir')
    } finally {
      setUpdating(false)
    }
  }

  const episodesBySeason = savedEpisodes.reduce<Record<number, number[]>>((acc, ep) => {
    if (!acc[ep.season]) acc[ep.season] = []
    acc[ep.season].push(ep.episode)
    return acc
  }, {})

  function fmtRange(eps: number[]): string {
    const s = [...eps].sort((a, b) => a - b)
    const ranges: string[] = []
    let start = s[0], end = s[0]
    for (let i = 1; i < s.length; i++) {
      if (s[i] === end + 1) { end = s[i] }
      else { ranges.push(start === end ? `${start}` : `${start}–${end}`); start = end = s[i] }
    }
    ranges.push(start === end ? `${start}` : `${start}–${end}`)
    return ranges.join(', ')
  }

  const rawNotes = serie.latestRequest?.notes?.replace(/\[AUTO\] M3U:/g, 'No Servidor:') ?? null
  const noteLines = rawNotes ? rawNotes.split('\n') : []
  const epLine = noteLines.find(l => /^Temp\s/i.test(l.trim())) ?? null
  const obsLine = noteLines.filter(l => !/^Temp\s/i.test(l.trim()) && l.trim()).join(' ') || null

  const isConcluida = serie.latestRequest?.status === 'CONCLUIDO'
  const isIncompleta = serie.tvStatus === 'FINALIZADA' && !isConcluida
  const isVitrine = serie.latestRequest?.source === 'VITRINE'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex gap-4 p-6">
          {serie.posterUrl ? (
            <img src={serie.posterUrl} alt={serie.title} className="w-24 h-36 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-24 h-36 bg-zinc-800 rounded-lg flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg leading-tight">{serie.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {serie.tvSeasons && (
                <p className="text-zinc-500 text-xs">{serie.tvSeasons} temporada{serie.tvSeasons !== 1 ? 's' : ''}</p>
              )}
              {isConcluida ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-700/50">Completa</span>
              ) : isIncompleta ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400 border border-amber-700/50">Incompleta</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-400 border border-blue-700/50">Em Andamento</span>
              )}
              {isVitrine && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-400 border border-purple-700/50">Vitrine</span>
              )}
            </div>

            {serie.tvEpisodes && serie.tvEpisodes > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                  <span>{serie.savedEpisodeCount} de {serie.tvEpisodes} eps</span>
                  <span>{Math.round((serie.savedEpisodeCount / serie.tvEpisodes) * 100)}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (serie.savedEpisodeCount / serie.tvEpisodes) * 100)}%` }} />
                </div>
              </div>
            )}

            {serie.latestRequest ? (
              <>
                <span className={'inline-block mt-2 text-white text-xs font-medium px-3 py-1 rounded-full ' + (reqStatusColor[serie.latestRequest.status] || 'bg-zinc-700')}>
                  Pedido: {reqStatusLabel[serie.latestRequest.status] || serie.latestRequest.status}
                </span>
                <div className="mt-2 space-y-1 text-sm text-zinc-400">
                  {serie.latestRequest.audioType && <p className="text-xs">Áudio: {serie.latestRequest.audioType}</p>}
                  {epLine && <p className="text-zinc-500 text-xs">{epLine}</p>}
                  {obsLine && (
                    <div className="flex items-start gap-1.5 mt-1 bg-zinc-800/60 rounded-lg px-2.5 py-1.5">
                      <svg className="w-3 h-3 text-yellow-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs text-yellow-200/80 leading-relaxed">{obsLine}</p>
                    </div>
                  )}
                  <p className="text-xs text-zinc-600">
                    {new Date(serie.latestRequest.createdAt).toLocaleDateString('pt-BR')} por {serie.latestRequest.createdBy.name}
                  </p>
                </div>
              </>
            ) : (
              <span className="inline-block mt-2 text-zinc-400 text-xs font-medium px-3 py-1 rounded-full bg-zinc-800">Sem pedido de atualização</span>
            )}
          </div>
        </div>

        {/* Episódios salvos */}
        <div className="px-6 pb-4 border-t border-zinc-700 pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">No Servidor</p>
            {!loadingEpisodes && savedEpisodes.length > 0 && (
              <span className="text-xs text-zinc-500">{Object.keys(episodesBySeason).length} temp · {savedEpisodes.length} eps</span>
            )}
          </div>
          {loadingEpisodes ? (
            <p className="text-xs text-zinc-600 animate-pulse">Consultando TMDB...</p>
          ) : savedEpisodes.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">Nenhum episódio registrado</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(episodesBySeason)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([season, eps]) => (
                  <span key={season} title={`Temporada ${season}: eps ${fmtRange(eps)}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs">
                    <span className="text-zinc-400 font-semibold">T{season}</span>
                    <span className="text-orange-400">{fmtRange(eps)}</span>
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Formulário de atualização */}
        {showUpdateForm && (
          <div className="px-6 pb-4 border-t border-zinc-700 pt-4 space-y-4">
            <p className="text-sm font-semibold text-white">Registrar Atualização</p>

            <div>
                <label className="text-xs text-zinc-400 block mb-2">
                  Episódios <span className="ml-2 text-zinc-600 font-normal">(laranja = já no servidor · verde = adicionando)</span>
                </label>
                <EpisodeGrid
                  savedEpisodes={savedEpisodes}
                  tmdbSeasons={tmdbSeasons}
                  selectedNew={selectedNew}
                  onToggleNew={toggleNew}
                  onSelectAllNew={selectAllNew}
                  onClearNew={clearNew}
                  selectedSeason={selectedSeason}
                  onSeasonChange={setSelectedSeason}
                  manualSeasonCounts={manualSeasonCounts}
                  onManualCount={(season, count) => setManualSeasonCounts(prev => ({ ...prev, [season]: count }))}
                />
              </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Tipo de Áudio</label>
              <div className="flex flex-wrap gap-2">
                {['DUBLADO', 'LEGENDADO', 'DUBLADO_LEGENDADO'].map(a => (
                  <button
                    key={a}
                    onClick={() => setAudio(a)}
                    className={'px-3 py-1.5 rounded-lg text-xs font-medium transition ' + (audio === a ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')}
                  >
                    {a === 'DUBLADO' ? 'Dublado' : a === 'LEGENDADO' ? 'Legendado' : 'Dub+Leg'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="finalizada" checked={seriesFinalizada} onChange={e => setSeriesFinalizada(e.target.checked)} className="w-4 h-4 accent-orange-500" />
              <label htmlFor="finalizada" className="text-sm text-zinc-300 cursor-pointer">Série completa no servidor (marca como Finalizada)</label>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Observação <span className="text-zinc-600">(opcional)</span></label>
              <textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Ex: Eps 05 a 09 estão legendados"
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 resize-none"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowUpdateForm(false)} className="flex-1 py-2 rounded-lg text-sm text-zinc-400 border border-zinc-700 hover:bg-zinc-800 transition">
                Cancelar
              </button>
              <button
                onClick={handleSaveUpdate}
                disabled={updating}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition disabled:opacity-50"
              >
                {updating ? 'Salvando...' : hasNewEpisodes ? `Salvar (+${totalNewEps} eps)` : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {/* Ações */}
        {!showUpdateForm && (
          <div className="px-6 pb-4">
            <button onClick={() => setShowUpdateForm(true)} className="w-full py-2 rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition mb-3">
              Registrar Atualização
            </button>
            {serie.latestRequest && canEdit && (
              <>
                <p className="text-zinc-500 text-xs mb-2">Alterar status do pedido:</p>
                <div className="flex gap-2 flex-wrap">
                  {['ABERTO', 'EM_ANDAMENTO', 'EM_PROGRESSO', 'CONCLUIDO', 'REJEITADO'].map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={updating || serie.latestRequest?.status === s}
                      className={
                        'px-3 py-1.5 rounded-full text-xs font-medium transition disabled:opacity-40 ' +
                        (serie.latestRequest?.status === s
                          ? reqStatusColor[s] + ' text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')
                      }
                    >
                      {reqStatusLabel[s]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Rodapé */}
        <div className="px-6 pb-6 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition">
            Fechar
          </button>
          {serie.latestRequest && canEdit &&
            (confirmDelete ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg text-xs border border-zinc-700 text-zinc-400">Cancelar</button>
                <button onClick={handleDeleteRequest} className="px-3 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-500">Confirmar</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 transition">
                Excluir pedido
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// AtualizacoesPage
// ────────────────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { key: 'PEDIDOS', label: 'Pedidos' },
  { key: 'INCOMPLETAS', label: 'Incompletas' },
  { key: 'SOLICITADO_VITRINE', label: 'Solicitado Vitrine' },
  { key: 'ATUALIZADO_RECENTEMENTE', label: 'Atualizado Recentemente' },
  { key: 'CONCLUIDAS', label: 'Concluídas' },
  { key: '', label: 'Todas' },
]

const filterDesc: Record<string, string> = {
  '': 'séries de TV',
  PEDIDOS: 'séries com pedido de atualização (admin)',
  EM_ANDAMENTO: 'séries em andamento',
  INCOMPLETAS: 'séries incompletas',
  SOLICITADO_VITRINE: 'séries solicitadas pela Vitrine',
  ATUALIZADO_RECENTEMENTE: 'séries com atualização concluída',
  CONCLUIDAS: 'séries finalizadas com atualização concluída',
}

export default function AtualizacoesPage() {
  const { data: session } = useSession()
  const [series, setSeries] = useState<SerieCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SerieCard | null>(null)
  const [showNovaModal, setShowNovaModal] = useState(false)
  const [confirmLimpar, setConfirmLimpar] = useState(false)
  const [limparLoading, setLimparLoading] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('EM_ANDAMENTO')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role ?? '')
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
  const userId = session?.user?.id || ''

  const fetchSeries = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: page.toString(), limit: '20' })
    if (filtroStatus) params.append('status', filtroStatus)
    if (search) params.append('search', search)
    fetch('/api/atualizacoes?' + params.toString(), { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setSeries(d.series || [])
        setTotal(d.total || 0)
        setTotalPages(d.pages || 1)
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [filtroStatus, page, search])

  useEffect(() => { fetchSeries() }, [fetchSeries])

  function handleNovaSaved() {
    setFiltroStatus('PEDIDOS')
    setPage(1)
    fetchSeries()
  }

  function handleDeleteSerie(serieId: string) {
    setSeries(prev => prev.filter(s => s.id !== serieId))
    setTotal(prev => Math.max(0, prev - 1))
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Atualizações de Séries</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {total} {filterDesc[filtroStatus] || 'resultados'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isSuperAdmin && (
            confirmLimpar ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Apagar todos os concluídos?</span>
                <button onClick={() => setConfirmLimpar(false)} className="px-3 py-1.5 rounded-lg text-xs border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition">Cancelar</button>
                <button
                  onClick={async () => {
                    setLimparLoading(true)
                    try {
                      const res = await fetch('/api/admin/limpar-concluidos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'atualizacoes' }) })
                      const d = await res.json()
                      toast.success(`${d.deleted} atualização(ões) removida(s)`)
                      setConfirmLimpar(false)
                      fetchSeries()
                    } catch { toast.error('Erro ao limpar') }
                    finally { setLimparLoading(false) }
                  }}
                  disabled={limparLoading}
                  className="px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition font-medium disabled:opacity-50"
                >
                  {limparLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmLimpar(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 transition"
                style={{ border: '1px solid #2a2a2a' }}
              >
                <Trash2 className="w-4 h-4" />
                Limpar Concluídos
              </button>
            )
          )}
          {isAdmin && (
            <button
              onClick={() => setShowNovaModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition"
            >
              <Plus className="w-4 h-4" />
              Nova Atualização
            </button>
          )}
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar série..."
          className="w-full rounded-lg px-4 py-2.5 pl-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setFiltroStatus(key); setPage(1) }}
            className={
              'px-4 py-1.5 rounded-full text-sm font-medium transition border ' +
              (filtroStatus === key
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-zinc-400">Carregando...</div>
      ) : series.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">Nenhuma série encontrada.</div>
      ) : (
        <div className="space-y-2">
          {series.map(s => {
            const isConcluida = s.latestRequest?.status === 'CONCLUIDO'
            const isIncompleta = s.tvStatus === 'FINALIZADA' && !isConcluida
            const isVitrine = s.latestRequest?.source === 'VITRINE'
            return (
              <div
                key={s.id}
                onClick={() => setSelected(s)}
                className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition"
              >
                {s.posterUrl ? (
                  <img src={s.posterUrl} alt={s.title} className="w-12 h-16 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-12 h-16 bg-zinc-800 rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold">{s.title}</p>
                    {isConcluida ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-700/50 shrink-0">Completa</span>
                    ) : isIncompleta ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-400 border border-amber-700/50 shrink-0">Incompleta</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900/50 text-blue-400 border border-blue-700/50 shrink-0">Em Andamento</span>
                    )}
                    {isVitrine && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/50 text-purple-400 border border-purple-700/50 shrink-0">Vitrine</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {s.tvSeasons && <span className="text-zinc-500 text-xs">{s.tvSeasons} temp</span>}
                    {s.tvEpisodes && s.tvEpisodes > 0 ? (
                      <span className="text-zinc-500 text-xs">{s.savedEpisodeCount}/{s.tvEpisodes} eps</span>
                    ) : s.savedEpisodeCount > 0 ? (
                      <span className="text-zinc-500 text-xs">{s.savedEpisodeCount} eps</span>
                    ) : null}
                    {s.latestRequest?.audioType && <span className="text-zinc-500 text-xs">{s.latestRequest.audioType}</span>}
                    {s.latestRequest && (
                      <span className="text-zinc-600 text-xs">
                        {new Date(s.latestRequest.createdAt).toLocaleDateString('pt-BR')} · {s.latestRequest.createdBy.name}
                      </span>
                    )}
                  </div>
                  {isIncompleta && s.tvEpisodes && s.tvEpisodes > 0 && (
                    <div className="mt-1.5 w-48 bg-zinc-800 rounded-full h-1">
                      <div className="bg-orange-500 h-1 rounded-full" style={{ width: `${Math.min(100, (s.savedEpisodeCount / s.tvEpisodes) * 100)}%` }} />
                    </div>
                  )}
                </div>
                <span className={'text-white text-xs font-medium px-3 py-1 rounded-full flex-shrink-0 ' + (s.latestRequest ? reqStatusColor[s.latestRequest.status] || 'bg-zinc-700' : 'bg-zinc-800 text-zinc-400')}>
                  {s.latestRequest ? reqStatusLabel[s.latestRequest.status] || s.latestRequest.status : 'Sem pedido'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-zinc-400">{total} séries no total</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 disabled:opacity-40 transition"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-sm text-zinc-400">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 disabled:opacity-40 transition"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {selected && (
        <SerieModal
          serie={selected}
          onClose={() => setSelected(null)}
          onRefresh={fetchSeries}
          onDelete={handleDeleteSerie}
          isAdmin={isAdmin}
          userId={userId}
        />
      )}

      {showNovaModal && (
        <NovaAtualizacaoModal
          onClose={() => setShowNovaModal(false)}
          onSaved={handleNovaSaved}
        />
      )}
    </div>
  )
}
