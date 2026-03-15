'use client'
import { useState } from 'react'
import { Search, Film, Tv, CheckCircle, XCircle, Loader2, FileText, Mic } from 'lucide-react'

type Mode = 'pedido' | 'correcao'
type ContentType = 'MOVIE' | 'TV'

interface LocalItem {
  id: string
  title: string
  year: number | null
  hasP1: boolean
  hasP2: boolean
  server: string
  posterUrl: string | null
  tmdbId: number
  type: string
  audioType: string | null
}
interface TmdbItem {
  tmdbId: number
  title: string
  year: string
  poster: string | null
}
function AudioBadge({ audioType }: { audioType: string | null }) {
  if (audioType === 'DUBLADO') return <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#4a1d9640', color: '#c084fc' }}>Dub</span>
  if (audioType === 'LEGENDADO') return <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#4a1d9640', color: '#c084fc' }}>Leg</span>
  if (audioType === 'DUBLADO_LEGENDADO') return <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#14532d40', color: '#4ade80' }}>Dub+Leg</span>
  return null
}

function PosterThumb({ posterUrl, title }: { posterUrl: string | null; title: string }) {
  return posterUrl
    ? <img src={posterUrl} alt={title} className="rounded object-cover flex-shrink-0" style={{ width: '46px', height: '68px' }} />
    : <div className="rounded flex items-center justify-center flex-shrink-0" style={{ width: '46px', height: '68px', backgroundColor: '#222222' }}>
        <Film className="w-4 h-4 text-gray-600" />
      </div>
}

function CorrectForm({
  item,
  type,
  onCancel,
  onSent,
}: {
  item: LocalItem
  type: ContentType
  onCancel: () => void
  onSent: () => void
}) {
  const [problemType, setProblemType] = useState<'offline' | 'outro'>('offline')
  const [server, setServer] = useState<'B2P' | 'P2B'>('B2P')
  const [problem, setProblem] = useState('')
  const [season, setSeason] = useState('')
  const [episodes, setEpisodes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const servers: ('B2P' | 'P2B')[] = []
  if (item.hasP1) servers.push('B2P')
  if (item.hasP2) servers.push('P2B')
  if (servers.length === 0) servers.push('B2P', 'P2B')

  const canSubmit = problemType === 'offline' || problem.trim().length >= 3

  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch('/api/correcoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          tmdbId: item.tmdbId,
          posterUrl: item.posterUrl,
          type,
          server,
          notes: problemType === 'offline' ? 'Offline' : problem,
          seasonNumber: season ? parseInt(season) : null,
          episodeNotes: episodes || null,
        }),
      })
      if (!res.ok) throw new Error()
      onSent()
    } catch {
      setError('Erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>Tipo do problema</p>
        <div className="flex gap-2">
          {(['offline', 'outro'] as const).map(pt => (
            <button
              key={pt}
              onClick={() => { setProblemType(pt); setProblem('') }}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{
                backgroundColor: problemType === pt ? '#ef4444' : '#222222',
                border: problemType === pt ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {pt === 'offline' ? 'Offline' : 'Outro Problema'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>Sistema</p>
        <div className="flex gap-2">
          {servers.map(s => (
            <button
              key={s}
              onClick={() => setServer(s)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{
                backgroundColor: server === s ? '#ef4444' : '#222222',
                border: server === s ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {problemType === 'outro' && (
        <div>
          <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>Descreva o problema <span className="text-red-400">*</span></p>
          <textarea
            value={problem}
            onChange={e => setProblem(e.target.value)}
            placeholder="Ex: Áudio dessincronizado, legendas incorretas..."
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none"
            style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
          />
        </div>
      )}

      {type === 'TV' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>Temporada</p>
            <input
              type="number"
              min={1}
              value={season}
              onChange={e => setSeason(e.target.value)}
              placeholder="Ex: 2"
              className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
            />
          </div>
          <div className="flex-1">
            <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>
              Episódios <span style={{ color: '#374151' }}>(opcional)</span>
            </p>
            <input
              type="text"
              value={episodes}
              onChange={e => setEpisodes(e.target.value)}
              placeholder="Ex: 3, 5-8"
              className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="py-2.5 px-4 rounded-xl text-sm transition"
          style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#9ca3af' }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ backgroundColor: '#ef4444' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmar Report'}
        </button>
      </div>
    </div>
  )
}

export default function VitrinePage() {
  const [mode, setMode] = useState<Mode>('pedido')
  const [type, setType] = useState<ContentType>('MOVIE')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ local: LocalItem[]; tmdb: TmdbItem[] } | null>(null)
  const [requested, setRequested] = useState<number[]>([])
  const [requestCounts, setRequestCounts] = useState<Record<number, number>>({})
  const [reported, setReported] = useState<number[]>([])
  const [feedback, setFeedback] = useState('')
  const [feedbackError, setFeedbackError] = useState(false)
  const [selectedLocal, setSelectedLocal] = useState<LocalItem | null>(null)
  const [selectedTmdb, setSelectedTmdb] = useState<TmdbItem | null>(null)
  const [tvMode, setTvMode] = useState<'new' | 'update' | 'substitution'>('new')
  const [tvSubSeasons, setTvSubSeasons] = useState('')
  const [tvSubEpisodes, setTvSubEpisodes] = useState('')
  const [tvUpdateFromSeason, setTvUpdateFromSeason] = useState('')
  const [tvUpdateFromEpisode, setTvUpdateFromEpisode] = useState('')
  const [panelLoading, setPanelLoading] = useState(false)
  const [movieAudioOption, setMovieAudioOption] = useState<'legendado' | 'dublagem_oficial' | null>(null)

  function clearSelection() {
    setSelectedLocal(null)
    setSelectedTmdb(null)
    setTvMode('new')
    setTvSubSeasons('')
    setTvSubEpisodes('')
    setTvUpdateFromSeason('')
    setTvUpdateFromEpisode('')
    setMovieAudioOption(null)
  }

  function reset() {
    setResults(null)
    setQuery('')
    setFeedback('')
    setFeedbackError(false)
    clearSelection()
  }

  function buildTvNote(m: 'new' | 'update' | 'substitution', seasons: string, eps: string, fromSeason: string, fromEpisode: string): string {
    if (m === 'update') {
      const parts = [
        fromSeason.trim() ? `a partir de ${fromSeason.trim()}` : '',
        fromEpisode.trim(),
      ].filter(Boolean)
      return parts.length
        ? `Solicitação de atualização — ${parts.join(', ')}.`
        : 'Solicitação de atualização.'
    }
    if (m === 'substitution') {
      const parts = [seasons.trim(), eps.trim()].filter(Boolean)
      return parts.length
        ? `Solicitação de substituição de áudio — ${parts.join(', ')}.`
        : 'Solicitação de substituição de áudio.'
    }
    return ''
  }

  async function sendAltAudio(item: LocalItem, customNotes?: string) {
    setPanelLoading(true)
    try {
      const version = item.audioType === 'DUBLADO' ? 'LEGENDADA' : 'DUBLADA'
      const notes = customNotes ?? `Solicitação de versão ${version} — título já existente no catálogo.`
      const res = await fetch('/api/recepcao-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title, type, posterUrl: item.posterUrl, tmdbId: item.tmdbId,
          notes,
          linkedTitleId: item.id,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setRequested(prev => [...prev, item.tmdbId])
        setRequestCounts(prev => ({ ...prev, [item.tmdbId]: data.requestCount ?? 1 }))
        clearSelection()
        setFeedbackError(false)
        setFeedback('Pedido enviado com sucesso!')
      } else {
        setFeedbackError(true)
        setFeedback('Erro ao enviar pedido. Tente novamente.')
      }
    } finally {
      setPanelLoading(false)
    }
  }

  async function sendTvRequest() {
    const item = selectedLocal || selectedTmdb
    if (!item) return
    setPanelLoading(true)
    try {
      const notes = buildTvNote(tvMode, tvSubSeasons, tvSubEpisodes, tvUpdateFromSeason, tvUpdateFromEpisode)
      const posterUrl = 'posterUrl' in item ? item.posterUrl : item.poster
      const linkedTitleId = selectedLocal ? selectedLocal.id : null
      const res = await fetch('/api/recepcao-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title, type: 'TV', posterUrl, tmdbId: item.tmdbId,
          notes: notes || null,
          isUpdate: tvMode === 'update',
          linkedTitleId,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setRequested(prev => [...prev, item.tmdbId])
        setRequestCounts(prev => ({ ...prev, [item.tmdbId]: data.requestCount ?? 1 }))
        clearSelection()
        setFeedbackError(false)
        setFeedback('Pedido enviado com sucesso!')
      } else {
        setFeedbackError(true)
        setFeedback('Erro ao enviar pedido. Tente novamente.')
      }
    } finally {
      setPanelLoading(false)
    }
  }

  async function sendRequest(item: TmdbItem) {
    const res = await fetch('/api/recepcao-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: item.title, type, posterUrl: item.poster, tmdbId: item.tmdbId }),
    })
    if (res.ok) {
      const data = await res.json()
      setRequested(prev => [...prev, item.tmdbId])
      setRequestCounts(prev => ({ ...prev, [item.tmdbId]: data.requestCount ?? 1 }))
      clearSelection()
      setFeedbackError(false)
      setFeedback('Pedido enviado com sucesso!')
    } else {
      setFeedbackError(true)
      setFeedback('Erro ao enviar pedido. Tente novamente.')
    }
  }

  const search = async () => {
    if (query.trim().length < 2) return
    setLoading(true)
    setResults(null)
    setFeedback('')
    clearSelection()
    try {
      const res = await fetch('/api/vitrine?q=' + encodeURIComponent(query.trim()) + '&type=' + type)
      if (!res.ok) throw new Error()
      setResults(await res.json())
    } catch {
      setFeedbackError(true)
      setFeedback('Erro ao buscar. Tente novamente.')
      setResults({ local: [], tmdb: [] })
    } finally {
      setLoading(false)
    }
  }

  function handleSelectLocal(item: LocalItem) {
    if (selectedLocal?.id === item.id) { clearSelection(); return }
    setSelectedLocal(item)
    setSelectedTmdb(null)
    setMovieAudioOption(null)
    if (item.type === 'TV') { setTvMode('update'); setTvSubSeasons(''); setTvSubEpisodes(''); setTvUpdateFromSeason(''); setTvUpdateFromEpisode('') }
  }

  function handleSelectTmdb(item: TmdbItem) {
    if (selectedTmdb?.tmdbId === item.tmdbId) { clearSelection(); return }
    setSelectedTmdb(item)
    setSelectedLocal(null)
    if (type === 'TV') { setTvMode('new'); setTvSubSeasons(''); setTvSubEpisodes(''); setTvUpdateFromSeason(''); setTvUpdateFromEpisode('') }
  }

  function handleConfirm() {
    if (selectedLocal) {
      if (selectedLocal.type === 'TV') {
        sendTvRequest()
      } else {
        let customNotes: string | undefined
        if (selectedLocal.audioType === 'DUBLADO') {
          customNotes = movieAudioOption === 'legendado'
            ? 'Solicitação de versão LEGENDADA — título já existente no catálogo.'
            : movieAudioOption === 'dublagem_oficial'
              ? 'Solicitação de VERSÃO OFICIAL — título já existente no catálogo.'
              : undefined
        }
        sendAltAudio(selectedLocal, customNotes)
      }
    } else if (selectedTmdb) {
      type === 'TV' ? sendTvRequest() : sendRequest(selectedTmdb)
    }
  }

  const handleModeChange = (m: Mode) => { setMode(m); reset() }
  const handleTypeChange = (t: ContentType) => { setType(t); reset() }

  const hasSelection = !!(selectedLocal || selectedTmdb)
  const isCorrection = mode === 'correcao'
  const isTV = selectedLocal ? selectedLocal.type === 'TV' : type === 'TV' && !!selectedTmdb
  const tvNote = buildTvNote(tvMode, tvSubSeasons, tvSubEpisodes, tvUpdateFromSeason, tvUpdateFromEpisode)
  const needsAudioChoice = !isTV && !!selectedLocal && selectedLocal.audioType === 'DUBLADO'
  const confirmDisabled = panelLoading || (needsAudioChoice && !movieAudioOption)

  const dubladoOptions = [
    { key: 'legendado' as const, label: 'Solicitar Legendado', icon: <FileText className="w-4 h-4" />, desc: 'Adicionar versão com legendas em português' },
    { key: 'dublagem_oficial' as const, label: 'Versão Oficial', icon: <Mic className="w-4 h-4" />, desc: '* Será adicionado conforme disponibilidade nas versões dublada e legendada' },
  ]

  const tvOptions: { value: 'new' | 'update' | 'substitution'; label: string; desc: string }[] = [
    { value: 'new', label: 'Novo título', desc: 'Adicionar série ao catálogo' },
    { value: 'update', label: 'Atualização', desc: 'Novos episódios ou temporadas' },
    { value: 'substitution', label: 'Substituição de áudio', desc: 'Trocar Dub ↔ Leg' },
  ]
  const availableTvOptions = selectedLocal ? tvOptions.filter(o => o.value !== 'new') : tvOptions

  const selectedPoster = selectedLocal ? selectedLocal.posterUrl : selectedTmdb?.poster ?? null
  const selectedTitle = selectedLocal?.title ?? selectedTmdb?.title ?? ''
  const selectedYear = selectedLocal ? selectedLocal.year : selectedTmdb?.year ?? null

  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh' }}>
      {/* Background */}
      <div
        style={{
          position: 'fixed', inset: 0,
          backgroundImage: 'url(/layout/Layout-1.png)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.12, pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px' }}>

        {/* Logo */}
        <div className="flex justify-center pt-6 pb-4">
          <img src="/Logo-transparente.png" alt="Encoding Solutions" style={{ width: '180px', maxWidth: '55vw' }} />
        </div>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl mb-4" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{
            position: 'absolute', right: '-60px', top: '-60px',
            width: '260px', height: '260px',
            background: 'radial-gradient(circle, rgba(232,80,10,0.28) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div className="px-5 py-5 relative">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#E8500A' }}>
              Central de Solicitações
            </p>
            <h1 className="text-xl font-bold text-white mb-0.5">O que você quer assistir?</h1>
            <p className="text-sm" style={{ color: '#6b7280' }}>Faça seu pedido — nossa equipe cuida do resto</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4">
          <div className="flex gap-0 rounded-xl p-1" style={{ backgroundColor: '#181818', border: '1px solid rgba(255,255,255,0.07)' }}>
            {(['pedido', 'correcao'] as const).map(m => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: mode === m ? '#E8500A' : 'transparent',
                  color: mode === m ? '#ffffff' : '#6b7280',
                }}
              >
                {m === 'pedido' ? 'Pedido' : 'Correção'}
              </button>
            ))}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="mb-10 grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4 items-start">

          {/* LEFT: search + results */}
          <div className="min-w-0">

            {/* Type toggle */}
            <div className="flex gap-3 mb-4">
              {(['MOVIE', 'TV'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: type === t ? '#1a1a1a' : 'transparent',
                    color: type === t ? '#ffffff' : '#6b7280',
                    border: type === t ? '1px solid #E8500A' : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {t === 'MOVIE' ? <Film className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
                  {t === 'MOVIE' ? 'Filme' : 'Série'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#4b5563' }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder={`Buscar ${type === 'MOVIE' ? 'filme' : 'série'}${mode === 'correcao' ? ' no catálogo' : ''}...`}
                className="w-full rounded-xl pl-10 pr-20 py-3 text-sm text-white focus:outline-none"
                style={{ backgroundColor: '#181818', border: '1px solid rgba(255,255,255,0.07)' }}
              />
              <button
                onClick={search}
                disabled={loading || query.trim().length < 2}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:opacity-40"
                style={{ backgroundColor: '#E8500A' }}
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
              </button>
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                className="mb-4 p-3 rounded-xl text-sm text-center"
                style={feedbackError
                  ? { backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }
                  : { backgroundColor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }
                }
              >
                {feedback}
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="space-y-5">

                {/* PEDIDO mode */}
                {mode === 'pedido' && (
                  <>
                    {results.local.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#4b5563' }}>
                          Disponível no catálogo
                        </p>
                        <div className="space-y-2">
                          {results.local.map(item => {
                            const alreadyRequested = requested.includes(item.tmdbId)
                            const canRequestAlt = item.audioType !== 'DUBLADO_LEGENDADO'
                            const canSelect = !alreadyRequested && canRequestAlt
                            const isSelected = selectedLocal?.id === item.id
                            return (
                              <button
                                key={item.id}
                                onClick={() => canSelect && handleSelectLocal(item)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                                style={{
                                  backgroundColor: isSelected ? '#1e1a18' : '#181818',
                                  border: isSelected ? '1px solid #E8500A' : '1px solid rgba(255,255,255,0.07)',
                                  opacity: !canSelect ? 0.55 : 1,
                                  cursor: canSelect ? 'pointer' : 'default',
                                }}
                              >
                                <PosterThumb posterUrl={item.posterUrl} title={item.title} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-white truncate">{item.title}</p>
                                  <p className="text-xs mb-1.5" style={{ color: '#6b7280' }}>{item.year}</p>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                                    {item.hasP1 && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#7c2d1240', color: '#fb923c' }}>B2P</span>}
                                    {item.hasP2 && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#1e3a5f40', color: '#60a5fa' }}>P2B</span>}
                                    <AudioBadge audioType={item.audioType} />
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-right text-xs">
                                  {alreadyRequested && (
                                  <span style={{ color: '#60a5fa' }} className="flex flex-col items-end gap-0.5">
                                    <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Solicitado</span>
                                    {(requestCounts[item.tmdbId] ?? 1) > 1 && (
                                      <span style={{ color: '#93c5fd', fontSize: '10px' }}>{requestCounts[item.tmdbId]}× pedidos</span>
                                    )}
                                  </span>
                                )}
                                  {!alreadyRequested && !canRequestAlt && <span style={{ color: '#9ca3af' }}>Dub+Leg ✓</span>}
                                  {canSelect && <span style={{ color: isSelected ? '#E8500A' : '#4b5563' }}>{isSelected ? '● Selecionado' : 'Selecionar →'}</span>}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {results.tmdb.filter(t => !results.local.some(l => l.tmdbId === t.tmdbId)).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#4b5563' }}>
                          Não encontrado no catálogo
                        </p>
                        <div className="space-y-2">
                          {results.tmdb
                            .filter(t => !results.local.some(l => l.tmdbId === t.tmdbId))
                            .map(item => {
                              const done = requested.includes(item.tmdbId)
                              const isSelected = selectedTmdb?.tmdbId === item.tmdbId
                              return (
                                <button
                                  key={item.tmdbId}
                                  onClick={() => !done && handleSelectTmdb(item)}
                                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                                  style={{
                                    backgroundColor: isSelected ? '#1e1a18' : '#181818',
                                    border: isSelected ? '1px solid #E8500A' : '1px solid rgba(255,255,255,0.07)',
                                    opacity: done ? 0.55 : 1,
                                    cursor: done ? 'default' : 'pointer',
                                  }}
                                >
                                  <PosterThumb posterUrl={item.poster} title={item.title} />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-white truncate">{item.title}</p>
                                    <p className="text-xs mb-1.5" style={{ color: '#6b7280' }}>{item.year}</p>
                                    <div className="flex items-center gap-1">
                                      <XCircle className="w-3 h-3 text-red-400" />
                                      <span className="text-xs text-red-400">Não disponível</span>
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0 text-right text-xs">
                                    {done
                                      ? (
                                        <span style={{ color: '#60a5fa' }} className="flex flex-col items-end gap-0.5">
                                          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Solicitado</span>
                                          {(requestCounts[item.tmdbId] ?? 1) > 1 && (
                                            <span style={{ color: '#93c5fd', fontSize: '10px' }}>{requestCounts[item.tmdbId]}× pedidos</span>
                                          )}
                                        </span>
                                      )
                                      : <span style={{ color: isSelected ? '#E8500A' : '#4b5563' }}>{isSelected ? '● Selecionado' : 'Selecionar →'}</span>
                                    }
                                  </div>
                                </button>
                              )
                            })}
                        </div>
                      </div>
                    )}

                    {results.local.length === 0 && results.tmdb.length === 0 && (
                      <div className="text-center py-12 rounded-xl" style={{ backgroundColor: '#181818', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <XCircle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                        <p className="text-sm text-gray-400">Nenhum resultado encontrado</p>
                      </div>
                    )}
                  </>
                )}

                {/* CORREÇÃO mode */}
                {mode === 'correcao' && (
                  results.local.length === 0 ? (
                    <div className="text-center py-12 rounded-xl" style={{ backgroundColor: '#181818', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <XCircle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm text-gray-400">Título não encontrado no catálogo</p>
                      <p className="text-xs mt-1" style={{ color: '#374151' }}>Correções só podem ser feitas em títulos disponíveis.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#4b5563' }}>
                        Selecione o título com problema
                      </p>
                      <div className="space-y-2">
                        {results.local.map(item => {
                          const done = reported.includes(item.tmdbId)
                          const isSelected = selectedLocal?.id === item.id
                          return (
                            <button
                              key={item.id}
                              onClick={() => !done && handleSelectLocal(item)}
                              className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                              style={{
                                backgroundColor: isSelected ? '#1a1010' : '#181818',
                                border: isSelected ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.07)',
                                opacity: done ? 0.55 : 1,
                                cursor: done ? 'default' : 'pointer',
                              }}
                            >
                              <PosterThumb posterUrl={item.posterUrl} title={item.title} />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-white truncate">{item.title}</p>
                                <p className="text-xs mb-1.5" style={{ color: '#6b7280' }}>{item.year}</p>
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-green-400" />
                                  <span className="text-xs text-green-400">No catálogo · {item.server}</span>
                                </div>
                              </div>
                              <span className="text-xs flex-shrink-0 font-medium" style={{ color: done ? '#4ade80' : isSelected ? '#ef4444' : '#4b5563' }}>
                                {done ? '✓ Enviado' : isSelected ? '● Selecionado' : 'Reportar →'}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* RIGHT: sticky panel — desktop only */}
          <div className="hidden md:block md:sticky md:top-6">
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#181818', border: '1px solid rgba(255,255,255,0.07)' }}>

              {!hasSelection ? (
                /* Empty state */
                <div className="p-8 flex flex-col items-center justify-center text-center" style={{ minHeight: '200px' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <Search className="w-5 h-5" style={{ color: '#4b5563' }} />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">
                    {mode === 'pedido' ? 'Nenhum título selecionado' : 'Nenhum título selecionado'}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#4b5563' }}>
                    Busque um título ao lado e selecione para fazer sua solicitação
                  </p>
                </div>
              ) : isCorrection && selectedLocal ? (
                /* Correction form */
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <PosterThumb posterUrl={selectedLocal.posterUrl} title={selectedLocal.title} />
                    <div>
                      <p className="font-semibold text-sm text-white">{selectedLocal.title}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{selectedLocal.year}</p>
                    </div>
                  </div>
                  <CorrectForm
                    item={selectedLocal}
                    type={type}
                    onCancel={clearSelection}
                    onSent={() => {
                      setReported(prev => [...prev, selectedLocal.tmdbId])
                      clearSelection()
                      setFeedbackError(false)
                      setFeedback('Report enviado! Nossa equipe irá verificar.')
                    }}
                  />
                </div>
              ) : (
                /* Pedido detail panel */
                <>
                  {/* Poster header */}
                  <div className="flex gap-4 p-5" style={{ backgroundColor: '#111111', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {selectedPoster
                      ? <img src={selectedPoster} alt={selectedTitle} className="rounded-lg object-cover flex-shrink-0" style={{ width: '80px', height: '120px' }} />
                      : <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: '80px', height: '120px', backgroundColor: '#222222' }}>
                          <Film className="w-8 h-8 text-gray-600" />
                        </div>
                    }
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="font-bold text-white leading-tight mb-1">{selectedTitle}</p>
                      <p className="text-sm mb-2" style={{ color: '#6b7280' }}>{selectedYear}</p>
                      {selectedLocal && (() => {
                        const servers = [selectedLocal.hasP1 && 'B2P', selectedLocal.hasP2 && 'P2B'].filter(Boolean) as string[]
                        const serversLabel = servers.length === 2 ? 'B2P e P2B' : servers.length === 1 ? `Apenas ${servers[0]}` : '—'
                        const audioLabel = selectedLocal.audioType === 'DUBLADO' ? 'Dublado' : selectedLocal.audioType === 'LEGENDADO' ? 'Legendado' : selectedLocal.audioType === 'DUBLADO_LEGENDADO' ? 'Dublado + Legendado' : null
                        return (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap gap-1.5 mb-1">
                              {selectedLocal.hasP1 && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#7c2d1240', color: '#fb923c' }}>B2P</span>}
                              {selectedLocal.hasP2 && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#1e3a5f40', color: '#60a5fa' }}>P2B</span>}
                              <AudioBadge audioType={selectedLocal.audioType} />
                            </div>
                            <p className="text-xs" style={{ color: '#6b7280' }}>
                              <span style={{ color: '#4b5563' }}>Disponível em:</span> <span className="text-white">✓ {serversLabel}</span>
                            </p>
                            {audioLabel && (
                              <p className="text-xs" style={{ color: '#6b7280' }}>
                                <span style={{ color: '#4b5563' }}>Versão atual:</span> <span className="text-white">✓ {audioLabel}</span>
                              </p>
                            )}
                          </div>
                        )
                      })()}
                      {selectedTmdb && (
                        <div className="flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-400" />
                          <span className="text-xs text-red-400">Não disponível</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* TV: type options */}
                    {isTV && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#4b5563' }}>
                          Tipo de pedido
                        </p>
                        <div className="space-y-2">
                          {availableTvOptions.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => { setTvMode(opt.value); setTvSubSeasons(''); setTvSubEpisodes(''); setTvUpdateFromSeason(''); setTvUpdateFromEpisode('') }}
                              className="w-full flex flex-col p-3 rounded-xl text-left transition-all"
                              style={{
                                backgroundColor: tvMode === opt.value ? '#1f1a0f' : '#111111',
                                border: tvMode === opt.value ? '1px solid #E8500A' : '1px solid rgba(255,255,255,0.07)',
                              }}
                            >
                              <span className="text-sm font-semibold text-white">{opt.label}</span>
                              <span className="text-xs" style={{ color: '#6b7280' }}>{opt.desc}</span>
                            </button>
                          ))}
                        </div>

                        {tvMode === 'update' && (
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div>
                              <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>A partir da temporada</p>
                              <input
                                value={tvUpdateFromSeason}
                                onChange={e => setTvUpdateFromSeason(e.target.value)}
                                placeholder="Ex: T6"
                                className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                                style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
                              />
                            </div>
                            <div>
                              <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>A partir do episódio</p>
                              <input
                                value={tvUpdateFromEpisode}
                                onChange={e => setTvUpdateFromEpisode(e.target.value)}
                                placeholder="Ex: Ep 3"
                                className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                                style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
                              />
                            </div>
                          </div>
                        )}

                        {tvMode === 'substitution' && (
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div>
                              <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>Temporada(s)</p>
                              <input
                                value={tvSubSeasons}
                                onChange={e => setTvSubSeasons(e.target.value)}
                                placeholder="Ex: T1, T2"
                                className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                                style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
                              />
                            </div>
                            <div>
                              <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>Episódio(s)</p>
                              <input
                                value={tvSubEpisodes}
                                onChange={e => setTvSubEpisodes(e.target.value)}
                                placeholder="Ex: Ep 1 ao 10"
                                className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                                style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
                              />
                            </div>
                          </div>
                        )}

                        {tvNote && (
                          <p className="text-xs rounded-lg px-3 py-2 mt-2" style={{ backgroundColor: '#111827', color: '#93c5fd' }}>
                            {tvNote}
                          </p>
                        )}
                      </div>
                    )}

                    {/* MOVIE local: what will be requested */}
                    {!isTV && selectedLocal && (
                      selectedLocal.audioType === 'DUBLADO' ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#4b5563' }}>Tipo de solicitação</p>
                          <div className="space-y-2">
                            {dubladoOptions.map(opt => (
                              <button
                                key={opt.key}
                                onClick={() => setMovieAudioOption(opt.key)}
                                className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                                style={{
                                  backgroundColor: movieAudioOption === opt.key ? '#1f1a0f' : '#111111',
                                  border: movieAudioOption === opt.key ? '1px solid #E8500A' : '1px solid rgba(255,255,255,0.07)',
                                }}
                              >
                                <span className="mt-0.5" style={{ color: movieAudioOption === opt.key ? '#E8500A' : '#4b5563' }}>{opt.icon}</span>
                                <div>
                                  <p className="text-sm font-semibold text-white">{opt.label}</p>
                                  <p className="text-xs" style={{ color: '#6b7280' }}>{opt.desc}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl p-3" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#4b5563' }}>Solicitação</p>
                          <p className="text-sm font-medium text-white">🎙️ Versão Dublada</p>
                          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Uma observação será adicionada automaticamente ao pedido.</p>
                        </div>
                      )
                    )}

                    {/* MOVIE tmdb */}
                    {!isTV && selectedTmdb && (
                      <div className="rounded-xl p-3" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#4b5563' }}>Solicitação</p>
                        <p className="text-sm font-medium text-white">Adicionar ao catálogo</p>
                        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Pedido de inclusão de novo título.</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={clearSelection}
                        className="py-2.5 px-4 rounded-xl text-sm transition"
                        style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#9ca3af' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={confirmDisabled}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50"
                        style={{ backgroundColor: '#E8500A' }}
                      >
                        {panelLoading
                          ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          : 'Confirmar Solicitação'
                        }
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>

        </div>

        </div>{/* end centered container */}
      </div>

      {/* ── Mobile drawer overlay ── */}
      <div
        className="md:hidden fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(0,0,0,0.72)',
          opacity: hasSelection ? 1 : 0,
          pointerEvents: hasSelection ? 'auto' : 'none',
        }}
        onClick={clearSelection}
      />

      {/* ── Mobile drawer ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 overflow-y-auto rounded-t-2xl"
        style={{
          backgroundColor: '#181818',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: '82vh',
          transform: hasSelection ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </div>

        {!hasSelection ? null : isCorrection && selectedLocal ? (
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <PosterThumb posterUrl={selectedLocal.posterUrl} title={selectedLocal.title} />
              <div>
                <p className="font-semibold text-sm text-white">{selectedLocal.title}</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>{selectedLocal.year}</p>
              </div>
            </div>
            <CorrectForm
              item={selectedLocal}
              type={type}
              onCancel={clearSelection}
              onSent={() => {
                setReported(prev => [...prev, selectedLocal.tmdbId])
                clearSelection()
                setFeedbackError(false)
                setFeedback('Report enviado! Nossa equipe irá verificar.')
              }}
            />
          </div>
        ) : (
          <>
            <div className="flex gap-4 p-5" style={{ backgroundColor: '#111111', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {selectedPoster
                ? <img src={selectedPoster} alt={selectedTitle} className="rounded-lg object-cover flex-shrink-0" style={{ width: '72px', height: '108px' }} />
                : <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: '72px', height: '108px', backgroundColor: '#222222' }}><Film className="w-7 h-7 text-gray-600" /></div>
              }
              <div className="flex-1 min-w-0 pt-1">
                <p className="font-bold text-white leading-tight mb-1">{selectedTitle}</p>
                <p className="text-sm mb-2" style={{ color: '#6b7280' }}>{selectedYear}</p>
                {selectedLocal && (() => {
                  const servers = [selectedLocal.hasP1 && 'B2P', selectedLocal.hasP2 && 'P2B'].filter(Boolean) as string[]
                  const serversLabel = servers.length === 2 ? 'B2P e P2B' : servers.length === 1 ? `Apenas ${servers[0]}` : '—'
                  const audioLabel = selectedLocal.audioType === 'DUBLADO' ? 'Dublado' : selectedLocal.audioType === 'LEGENDADO' ? 'Legendado' : selectedLocal.audioType === 'DUBLADO_LEGENDADO' ? 'Dublado + Legendado' : null
                  return (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {selectedLocal.hasP1 && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#7c2d1240', color: '#fb923c' }}>B2P</span>}
                        {selectedLocal.hasP2 && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#1e3a5f40', color: '#60a5fa' }}>P2B</span>}
                        <AudioBadge audioType={selectedLocal.audioType} />
                      </div>
                      <p className="text-xs" style={{ color: '#6b7280' }}><span style={{ color: '#4b5563' }}>Disponível em:</span> <span className="text-white">✓ {serversLabel}</span></p>
                      {audioLabel && <p className="text-xs" style={{ color: '#6b7280' }}><span style={{ color: '#4b5563' }}>Versão atual:</span> <span className="text-white">✓ {audioLabel}</span></p>}
                    </div>
                  )
                })()}
                {selectedTmdb && <div className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /><span className="text-xs text-red-400">Não disponível</span></div>}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {isTV && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#4b5563' }}>Tipo de pedido</p>
                  <div className="space-y-2">
                    {availableTvOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setTvMode(opt.value); setTvSubSeasons(''); setTvSubEpisodes(''); setTvUpdateFromSeason(''); setTvUpdateFromEpisode('') }}
                        className="w-full flex flex-col p-3 rounded-xl text-left transition-all"
                        style={{
                          backgroundColor: tvMode === opt.value ? '#1f1a0f' : '#111111',
                          border: tvMode === opt.value ? '1px solid #E8500A' : '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        <span className="text-sm font-semibold text-white">{opt.label}</span>
                        <span className="text-xs" style={{ color: '#6b7280' }}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                  {tvMode === 'update' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>A partir da temporada</p>
                        <input value={tvUpdateFromSeason} onChange={e => setTvUpdateFromSeason(e.target.value)} placeholder="Ex: T6" className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }} />
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>A partir do episódio</p>
                        <input value={tvUpdateFromEpisode} onChange={e => setTvUpdateFromEpisode(e.target.value)} placeholder="Ex: Ep 3" className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }} />
                      </div>
                    </div>
                  )}
                  {tvMode === 'substitution' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>Temporada(s)</p>
                        <input value={tvSubSeasons} onChange={e => setTvSubSeasons(e.target.value)} placeholder="Ex: T1, T2" className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }} />
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>Episódio(s)</p>
                        <input value={tvSubEpisodes} onChange={e => setTvSubEpisodes(e.target.value)} placeholder="Ex: Ep 1 ao 10" className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }} />
                      </div>
                    </div>
                  )}
                  {tvNote && <p className="text-xs rounded-lg px-3 py-2 mt-2" style={{ backgroundColor: '#111827', color: '#93c5fd' }}>{tvNote}</p>}
                </div>
              )}
              {!isTV && selectedLocal && (
                selectedLocal.audioType === 'DUBLADO' ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#4b5563' }}>Tipo de solicitação</p>
                    <div className="space-y-2">
                      {dubladoOptions.map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setMovieAudioOption(opt.key)}
                          className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                          style={{
                            backgroundColor: movieAudioOption === opt.key ? '#1f1a0f' : '#111111',
                            border: movieAudioOption === opt.key ? '1px solid #E8500A' : '1px solid rgba(255,255,255,0.07)',
                          }}
                        >
                          <span className="mt-0.5" style={{ color: movieAudioOption === opt.key ? '#E8500A' : '#4b5563' }}>{opt.icon}</span>
                          <div>
                            <p className="text-sm font-semibold text-white">{opt.label}</p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl p-3" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#4b5563' }}>Solicitação</p>
                    <p className="text-sm font-medium text-white">🎙️ Versão Dublada</p>
                    <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Uma observação será adicionada automaticamente ao pedido.</p>
                  </div>
                )
              )}
              {!isTV && selectedTmdb && (
                <div className="rounded-xl p-3" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#4b5563' }}>Solicitação</p>
                  <p className="text-sm font-medium text-white">Adicionar ao catálogo</p>
                  <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Pedido de inclusão de novo título.</p>
                </div>
              )}
              <div className="flex gap-2 pb-2">
                <button onClick={clearSelection} className="py-2.5 px-4 rounded-xl text-sm transition" style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#9ca3af' }}>
                  Cancelar
                </button>
                <button onClick={handleConfirm} disabled={confirmDisabled} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50" style={{ backgroundColor: '#E8500A' }}>
                  {panelLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmar Solicitação'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
