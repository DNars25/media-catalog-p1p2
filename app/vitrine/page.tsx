'use client'
import { useState } from 'react'
import { Search, Film, Tv, CheckCircle, XCircle, Send, Loader2 } from 'lucide-react'

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

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
      style={{ backgroundColor: active ? '#f97316' : '#252525', border: active ? '1px solid #f97316' : '1px solid #2a2a2a' }}
    >
      {label}
    </button>
  )
}

function PosterBox({ posterUrl, title }: { posterUrl: string | null; title: string }) {
  return posterUrl
    ? <img src={posterUrl} alt={title} className="w-12 rounded object-cover flex-shrink-0" style={{ height: '68px', minWidth: '46px' }} />
    : <div className="w-12 rounded flex items-center justify-center flex-shrink-0" style={{ height: '68px', minWidth: '46px', backgroundColor: '#2a2a2a' }}>
        <Film className="w-4 h-4 text-gray-600" />
      </div>
}

// ── Inline form shown after selecting a title for correction ──
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

  // Only show servers that the title actually has
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
    <div className="mt-2 rounded-xl p-4 space-y-3" style={{ backgroundColor: '#1a1010', border: '1px solid #3a1a1a' }}>
      <p className="text-sm font-semibold text-white">"{item.title}"</p>

      {/* Tipo do problema */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Tipo do problema</p>
        <div className="flex gap-2">
          {(['offline', 'outro'] as const).map(pt => (
            <button
              key={pt}
              onClick={() => { setProblemType(pt); setProblem('') }}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: problemType === pt ? '#ef4444' : '#252525', border: problemType === pt ? '1px solid #ef4444' : '1px solid #2a2a2a' }}
            >
              {pt === 'offline' ? 'Offline' : 'Outro Problema'}
            </button>
          ))}
        </div>
      </div>

      {/* Servidor */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Sistema</p>
        <div className="flex gap-2">
          {servers.map(s => (
            <button
              key={s}
              onClick={() => setServer(s)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: server === s ? '#ef4444' : '#252525', border: server === s ? '1px solid #ef4444' : '1px solid #2a2a2a' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Descrição — apenas para Outro Problema */}
      {problemType === 'outro' && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Descreva o problema <span className="text-red-400">*</span></p>
          <textarea
            value={problem}
            onChange={e => setProblem(e.target.value)}
            placeholder="Ex: Áudio dessincronizado, legendas incorretas..."
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
          />
        </div>
      )}

      {/* Temporada / Episódios (somente TV) */}
      {type === 'TV' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">Temporada</p>
            <input
              type="number"
              min={1}
              value={season}
              onChange={e => setSeason(e.target.value)}
              placeholder="Ex: 2"
              className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">Episódios <span className="text-gray-600">(opcional)</span></p>
            <input
              type="text"
              value={episodes}
              onChange={e => setEpisodes(e.target.value)}
              placeholder="Ex: 3, 5-8"
              className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg text-sm text-gray-400 transition"
          style={{ border: '1px solid #2a2a2a' }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ backgroundColor: '#ef4444' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmar Report'}
        </button>
      </div>
    </div>
  )
}

// ── TV Request Panel ──
function TvRequestPanel({
  onCancel, onConfirm, tvMode, setTvMode, tvSubSeasons, setTvSubSeasons,
  tvSubEpisodes, setTvSubEpisodes, panelLoading, buildTvNote,
}: {
  onCancel: () => void
  onConfirm: () => void
  tvMode: 'new' | 'update' | 'substitution'
  setTvMode: (m: 'new' | 'update' | 'substitution') => void
  tvSubSeasons: string
  setTvSubSeasons: (v: string) => void
  tvSubEpisodes: string
  setTvSubEpisodes: (v: string) => void
  panelLoading: boolean
  buildTvNote: (mode: 'new' | 'update' | 'substitution', s: string, e: string) => string
}) {
  const options: { value: 'new' | 'update' | 'substitution'; label: string; icon: string }[] = [
    { value: 'new', label: 'Novo título', icon: '🆕' },
    { value: 'update', label: 'Atualização de episódios/temporadas', icon: '🔄' },
    { value: 'substitution', label: 'Substituição de áudio (Dub↔Leg)', icon: '🎙️' },
  ]

  const note = buildTvNote(tvMode, tvSubSeasons, tvSubEpisodes)

  return (
    <div className="mt-1 rounded-xl p-4 space-y-3" style={{ backgroundColor: '#0f1a0f', border: '1px solid #1a3a1a' }}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Tipo de pedido</p>
      <div className="space-y-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => { setTvMode(opt.value); setTvSubSeasons(''); setTvSubEpisodes('') }}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-left text-sm font-medium text-white transition"
            style={{
              backgroundColor: tvMode === opt.value ? '#14532d40' : '#1a1a1a',
              border: tvMode === opt.value ? '1px solid #166534' : '1px solid #2a2a2a',
            }}
          >
            <span>{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {tvMode === 'substitution' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>Temporada(s)</p>
            <input
              value={tvSubSeasons}
              onChange={e => setTvSubSeasons(e.target.value)}
              placeholder="Ex: T2"
              className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>Episódio(s)</p>
            <input
              value={tvSubEpisodes}
              onChange={e => setTvSubEpisodes(e.target.value)}
              placeholder="Ex: Ep 1 ao 10"
              className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            />
          </div>
        </div>
      )}

      {note && (
        <p className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: '#1a1a2a', color: '#93c5fd' }}>
          {note}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-sm transition" style={{ border: '1px solid #2a2a2a', color: '#9ca3af' }}>
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={panelLoading}
          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ backgroundColor: '#f97316' }}
        >
          {panelLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ──
export default function VitrinePage() {
  const [mode, setMode] = useState<Mode>('pedido')
  const [type, setType] = useState<ContentType>('MOVIE')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ local: LocalItem[]; tmdb: TmdbItem[] } | null>(null)
  const [requested, setRequested] = useState<number[]>([])
  const [reported, setReported] = useState<number[]>([])
  const [correctingId, setCorrectingId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [altAudioPanel, setAltAudioPanel] = useState<string | null>(null)
  const [tvPanel, setTvPanel] = useState<{ tmdbId: number; title: string; posterUrl: string | null } | null>(null)
  const [tvMode, setTvMode] = useState<'new' | 'update' | 'substitution'>('new')
  const [tvSubSeasons, setTvSubSeasons] = useState('')
  const [tvSubEpisodes, setTvSubEpisodes] = useState('')
  const [panelLoading, setPanelLoading] = useState(false)

  function closePanels() {
    setAltAudioPanel(null)
    setTvPanel(null)
    setTvMode('new')
    setTvSubSeasons('')
    setTvSubEpisodes('')
  }

  function reset() {
    setResults(null)
    setQuery('')
    setFeedback('')
    setCorrectingId(null)
    closePanels()
  }

  function buildTvNote(mode: 'new' | 'update' | 'substitution', seasons: string, episodes: string): string {
    if (mode === 'update') return 'Solicitação de atualização de episódios/temporadas.'
    if (mode === 'substitution') {
      const parts = [seasons.trim(), episodes.trim()].filter(Boolean)
      if (!parts.length) return 'Solicitação de substituição de áudio.'
      return `Solicitação de substituição de áudio — ${parts.join(', ')}.`
    }
    return ''
  }

  async function sendAltAudio(item: LocalItem) {
    setPanelLoading(true)
    try {
      const version = item.audioType === 'DUBLADO' ? 'LEGENDADA' : 'DUBLADA'
      const res = await fetch('/api/recepcao-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title, type, posterUrl: item.posterUrl, tmdbId: item.tmdbId,
          notes: `Solicitação de versão ${version} — título já existente no catálogo.`,
        }),
      })
      if (res.ok) {
        setRequested(prev => [...prev, item.tmdbId])
        closePanels()
        setFeedback('Pedido enviado com sucesso!')
      } else {
        setFeedback('Erro ao enviar pedido. Tente novamente.')
      }
    } finally {
      setPanelLoading(false)
    }
  }

  async function sendTvRequest() {
    if (!tvPanel) return
    setPanelLoading(true)
    try {
      const notes = buildTvNote(tvMode, tvSubSeasons, tvSubEpisodes)
      const res = await fetch('/api/recepcao-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: tvPanel.title, type: 'TV', posterUrl: tvPanel.posterUrl, tmdbId: tvPanel.tmdbId,
          notes: notes || null,
          isUpdate: tvMode === 'update',
        }),
      })
      if (res.ok) {
        setRequested(prev => [...prev, tvPanel.tmdbId])
        closePanels()
        setFeedback('Pedido enviado com sucesso!')
      } else {
        setFeedback('Erro ao enviar pedido. Tente novamente.')
      }
    } finally {
      setPanelLoading(false)
    }
  }

  const handleModeChange = (m: Mode) => { setMode(m); reset() }
  const handleTypeChange = (t: ContentType) => { setType(t); reset() }

  const search = async () => {
    if (query.trim().length < 2) return
    setLoading(true)
    setResults(null)
    setFeedback('')
    setCorrectingId(null)
    try {
      const res = await fetch('/api/vitrine?q=' + encodeURIComponent(query.trim()) + '&type=' + type)
      if (!res.ok) throw new Error()
      setResults(await res.json())
    } catch {
      setFeedback('Erro ao buscar. Tente novamente.')
      setResults({ local: [], tmdb: [] })
    } finally {
      setLoading(false)
    }
  }

  const sendRequest = async (item: TmdbItem) => {
    const res = await fetch('/api/recepcao-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: item.title, type, posterUrl: item.poster, tmdbId: item.tmdbId }),
    })
    if (res.ok) {
      setRequested(prev => [...prev, item.tmdbId])
      setFeedback('Pedido enviado com sucesso!')
    } else {
      setFeedback('Erro ao enviar pedido. Tente novamente.')
    }
  }

  const typeLabel = type === 'MOVIE' ? 'filme' : 'série'
  const placeholder = mode === 'pedido'
    ? `Buscar ${typeLabel}...`
    : `Buscar ${typeLabel} no catálogo...`

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{
        backgroundColor: '#080808',
        backgroundImage: 'url(/layout/Layout-1.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-xl mx-auto">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/Logo-transparente.png" alt="Encoding Solutions" style={{ width: '300px', maxWidth: '90vw' }} />
        </div>

        <div className="rounded-2xl p-6 space-y-5" style={{ backgroundColor: '#151515' }}>

          {/* Solicitação Para */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Solicitação Para</p>
            <div className="flex gap-2">
              <Chip label="Pedido" active={mode === 'pedido'} onClick={() => handleModeChange('pedido')} />
              <Chip label="Correção" active={mode === 'correcao'} onClick={() => handleModeChange('correcao')} />
            </div>
            {mode === 'correcao' && (
              <p className="text-xs text-gray-600 mt-2">Reporte somente títulos ou episódios offline.</p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Tipo</p>
            <div className="flex gap-2">
              <Chip label="Filme" active={type === 'MOVIE'} onClick={() => handleTypeChange('MOVIE')} />
              <Chip label="Série" active={type === 'TV'} onClick={() => handleTypeChange('TV')} />
            </div>
          </div>

          {/* Buscar */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Buscar {type === 'MOVIE' ? 'Filme' : 'Série'}
            </p>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder={placeholder}
                className="flex-1 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
              />
              <button
                onClick={search}
                disabled={loading || query.trim().length < 2}
                className="px-4 py-2 rounded-lg text-white transition disabled:opacity-50"
                style={{ backgroundColor: '#f97316' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="mt-3 p-3 rounded-lg text-center text-sm" style={{ backgroundColor: '#1a3a1a', color: '#4ade80' }}>
            {feedback}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="mt-3 space-y-2">

            {/* ── PEDIDO MODE ── */}
            {mode === 'pedido' && (
              <>
                {results.local.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">Disponível no catálogo</p>
                    {results.local.map(item => {
                      const alreadyRequested = requested.includes(item.tmdbId)
                      const showAltPanel = altAudioPanel === item.id
                      const showTvPanel = tvPanel?.tmdbId === item.tmdbId
                      const canRequestAlt = item.audioType !== 'DUBLADO_LEGENDADO'
                      return (
                        <div key={item.id} className="mb-2">
                          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#151515' }}>
                            <PosterBox posterUrl={item.posterUrl} title={item.title} />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-white">{item.title}</p>
                              <p className="text-xs text-gray-400">{item.year}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                                {item.hasP1 && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#7c2d1240', color: '#fb923c' }}>B2P</span>}
                                {item.hasP2 && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#1e3a5f40', color: '#60a5fa' }}>P2B</span>}
                                {item.audioType === 'DUBLADO' && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#4a1d9640', color: '#c084fc' }}>Dub</span>}
                                {item.audioType === 'LEGENDADO' && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#4a1d9640', color: '#c084fc' }}>Leg</span>}
                                {item.audioType === 'DUBLADO_LEGENDADO' && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#14532d40', color: '#4ade80' }}>Dub+Leg</span>}
                              </div>
                            </div>
                            {!alreadyRequested && canRequestAlt && (
                              <button
                                onClick={() => {
                                  if (item.type === 'TV') {
                                    setTvPanel(showTvPanel ? null : { tmdbId: item.tmdbId, title: item.title, posterUrl: item.posterUrl })
                                    setAltAudioPanel(null)
                                    setTvMode('new'); setTvSubSeasons(''); setTvSubEpisodes('')
                                  } else {
                                    setAltAudioPanel(showAltPanel ? null : item.id)
                                    setTvPanel(null)
                                  }
                                }}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition"
                                style={{ backgroundColor: (showAltPanel || showTvPanel) ? '#252525' : '#f9731620', color: '#f97316', border: '1px solid #f9731640' }}
                              >
                                {(showAltPanel || showTvPanel) ? 'Cancelar' : 'Versão alternativa'}
                              </button>
                            )}
                            {alreadyRequested && (
                              <span className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: '#60a5fa' }}>
                                <CheckCircle className="w-3 h-3" /> Solicitado
                              </span>
                            )}
                          </div>

                          {/* Painel áudio alternativo — Filmes */}
                          {showAltPanel && item.type === 'MOVIE' && (
                            <div className="mt-1 rounded-xl p-4 space-y-3" style={{ backgroundColor: '#0f0f1a', border: '1px solid #1a1a3a' }}>
                              <p className="text-sm text-white font-medium">
                                {item.audioType === 'DUBLADO' ? '📝 Solicitar versão Legendada' : '🎙️ Solicitar versão Dublada'}
                              </p>
                              <p className="text-xs" style={{ color: '#9ca3af' }}>
                                Uma observação será adicionada automaticamente ao pedido.
                              </p>
                              <div className="flex gap-2">
                                <button onClick={() => setAltAudioPanel(null)} className="flex-1 py-2 rounded-lg text-sm transition" style={{ border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                                  Cancelar
                                </button>
                                <button onClick={() => sendAltAudio(item)} disabled={panelLoading} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50" style={{ backgroundColor: '#f97316' }}>
                                  {panelLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmar'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Painel TV — local */}
                          {showTvPanel && <TvRequestPanel onCancel={closePanels} onConfirm={sendTvRequest} tvMode={tvMode} setTvMode={setTvMode} tvSubSeasons={tvSubSeasons} setTvSubSeasons={setTvSubSeasons} tvSubEpisodes={tvSubEpisodes} setTvSubEpisodes={setTvSubEpisodes} panelLoading={panelLoading} buildTvNote={buildTvNote} />}
                        </div>
                      )
                    })}
                  </div>
                )}

                {results.tmdb.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">Não encontrado no catálogo</p>
                    {results.tmdb
                      .filter(t => !results.local.some(l => l.tmdbId === t.tmdbId))
                      .map(item => {
                        const done = requested.includes(item.tmdbId)
                        const showTvPanel = tvPanel?.tmdbId === item.tmdbId
                        return (
                          <div key={item.tmdbId} className="mb-2">
                            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#151515' }}>
                              <PosterBox posterUrl={item.poster} title={item.title} />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-white">{item.title}</p>
                                <p className="text-xs text-gray-400">{item.year}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                                  <span className="text-xs text-red-400">Não disponível</span>
                                </div>
                              </div>
                              {done
                                ? <span className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: '#60a5fa' }}><CheckCircle className="w-3 h-3" /> Solicitado</span>
                                : type === 'TV'
                                  ? <button
                                      onClick={() => {
                                        setTvPanel(showTvPanel ? null : { tmdbId: item.tmdbId, title: item.title, posterUrl: item.poster })
                                        setAltAudioPanel(null)
                                        setTvMode('new'); setTvSubSeasons(''); setTvSubEpisodes('')
                                      }}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0 transition"
                                      style={{ backgroundColor: showTvPanel ? '#252525' : '#f97316' }}
                                    >
                                      {showTvPanel ? 'Cancelar' : <><Send className="w-3 h-3" /> Solicitar</>}
                                    </button>
                                  : <button onClick={() => sendRequest(item)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0" style={{ backgroundColor: '#f97316' }}>
                                      <Send className="w-3 h-3" /> Solicitar
                                    </button>
                              }
                            </div>
                            {showTvPanel && <TvRequestPanel onCancel={closePanels} onConfirm={sendTvRequest} tvMode={tvMode} setTvMode={setTvMode} tvSubSeasons={tvSubSeasons} setTvSubSeasons={setTvSubSeasons} tvSubEpisodes={tvSubEpisodes} setTvSubEpisodes={setTvSubEpisodes} panelLoading={panelLoading} buildTvNote={buildTvNote} />}
                          </div>
                        )
                      })}
                  </div>
                )}

                {results.local.length === 0 && results.tmdb.length === 0 && (
                  <div className="text-center text-gray-400 py-8 rounded-xl" style={{ backgroundColor: '#151515' }}>
                    <XCircle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    <p>Nenhum resultado encontrado</p>
                  </div>
                )}
              </>
            )}

            {/* ── CORREÇÃO MODE ── */}
            {mode === 'correcao' && (
              <>
                {results.local.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 rounded-xl" style={{ backgroundColor: '#151515' }}>
                    <XCircle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm">Título não encontrado no catálogo</p>
                    <p className="text-xs text-gray-600 mt-1">Correções só podem ser feitas em títulos disponíveis.</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">Selecione o título com problema</p>
                    {results.local.map(item => (
                      <div key={item.id} className="mb-2">
                        {reported.includes(item.tmdbId) ? (
                          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#151515', opacity: 0.6 }}>
                            <PosterBox posterUrl={item.posterUrl} title={item.title} />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-white">{item.title}</p>
                              <p className="text-xs text-gray-400">{item.year}</p>
                            </div>
                            <span className="text-xs text-green-400 flex items-center gap-1 flex-shrink-0">
                              <CheckCircle className="w-3.5 h-3.5" /> Enviado
                            </span>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setCorrectingId(correctingId === item.tmdbId ? null : item.tmdbId)}
                              className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition"
                              style={{
                                backgroundColor: correctingId === item.tmdbId ? '#1a1010' : '#151515',
                                border: correctingId === item.tmdbId ? '1px solid #3a1a1a' : '1px solid transparent',
                              }}
                            >
                              <PosterBox posterUrl={item.posterUrl} title={item.title} />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-white">{item.title}</p>
                                <p className="text-xs text-gray-400">{item.year}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                                  <span className="text-xs text-green-400">No catálogo · {item.server}</span>
                                </div>
                              </div>
                              <span className="text-xs text-red-400 flex-shrink-0 font-medium">
                                {correctingId === item.tmdbId ? 'Cancelar' : 'Reportar'}
                              </span>
                            </button>

                            {correctingId === item.tmdbId && (
                              <CorrectForm
                                item={item}
                                type={type}
                                onCancel={() => setCorrectingId(null)}
                                onSent={() => {
                                  setReported(prev => [...prev, item.tmdbId])
                                  setCorrectingId(null)
                                  setFeedback('Report enviado! Nossa equipe irá verificar.')
                                }}
                              />
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
