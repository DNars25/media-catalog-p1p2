'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Plus, Loader2, ChevronLeft, ChevronRight, X, Search, Pencil, FileText, Flame, Printer, Trash2 } from 'lucide-react'
import { Badge } from '@/components/badges'
import { SearchInput } from '@/components/search-input'
import { formatDate } from '@/lib/utils'

type RequestType = 'MOVIE' | 'TV'
type RequestStatusType = 'ABERTO' | 'EM_ANDAMENTO' | 'EM_PROGRESSO' | 'CONCLUIDO' | 'REJEITADO'

interface Request {
  id: string
  requestedTitle: string
  type: RequestType
  status: RequestStatusType
  preferredSystem: string | null
  notes: string | null
  audioType: string | null
  posterUrl: string | null
  priority: boolean
  createdAt: string
  createdBy: { name: string }
  completedBy: { name: string } | null
  linkedTitle: { id: string; title: string } | null
  requestCount: number
}

interface TMDBResult {
  tmdbId: number
  type: string
  title: string
  overview: string
  posterUrl: string | null
  releaseYear: number | null
}

const STATUS_OPTIONS = ['ABERTO', 'EM_PROGRESSO', 'CONCLUIDO', 'REJEITADO']

const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto', EM_ANDAMENTO: 'Em Andamento', EM_PROGRESSO: 'Em Progresso',
  CONCLUIDO: 'Concluído', REJEITADO: 'Rejeitado',
}

function getAudioLabel(audio: string | null): { label: string; complete: boolean } {
  if (!audio) return { label: '—', complete: false }
  const map: Record<string, string> = {
    DUBLADO: 'Dub', LEGENDADO: 'Leg', DUBLADO_LEGENDADO: 'Dub/Leg',
    TODAS_DUBLADO: 'Todas-Dub', TODAS_LEGENDADO: 'Todas-Leg', TODAS_DUBLADO_LEGENDADO: 'Todas-Dub/Leg',
  }
  const label = map[audio] || audio
  const complete = audio === 'DUBLADO_LEGENDADO' || audio === 'TODAS_DUBLADO_LEGENDADO' || audio.includes('Dublado + Legendado')
  return { label, complete }
}

// ─── Extrato Modal ────────────────────────────────────────────────────────────

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const diffToMon = (day === 0 ? -6 : 1 - day)
  const mon = new Date(now); mon.setDate(now.getDate() + diffToMon); mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(mon), to: fmt(sun) }
}

type ViewFilter = 'todos' | 'concluidos' | 'aberto'

function ExtratoModal({ onClose }: { onClose: () => void }) {
  const week = getWeekRange()
  const [from, setFrom] = useState(week.from)
  const [to, setTo] = useState(week.to)
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(false)
  const [viewFilter, setViewFilter] = useState<ViewFilter>('todos')
  const [completedByFilter, setCompletedByFilter] = useState<string>('')

  const fetchExtrato = useCallback(async () => {
    if (!from || !to) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to: to + 'T23:59:59', limit: '200', page: '1' })
      const res = await fetch('/api/requests?' + params + '&isUpdate=false')
      const data = await res.json()
      setRequests(data.requests || [])
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { fetchExtrato() }, [fetchExtrato])

  // Unique handlers (users who completed at least one request in the period)
  const handlers = Array.from(
    new Map(
      requests
        .filter(r => r.completedBy)
        .map(r => [r.completedBy!.name, r.completedBy!.name])
    ).values()
  ).sort()

  const displayed = requests.filter(r => {
    if (viewFilter === 'concluidos') { if (r.status !== 'CONCLUIDO') return false }
    else if (viewFilter === 'aberto') { if (r.status !== 'ABERTO' && r.status !== 'EM_PROGRESSO') return false }
    if (completedByFilter && r.completedBy?.name !== completedByFilter) return false
    return true
  })

  const stats = {
    total: requests.length,
    aberto: requests.filter(r => r.status === 'ABERTO').length,
    emProgresso: requests.filter(r => r.status === 'EM_PROGRESSO').length,
    concluido: requests.filter(r => r.status === 'CONCLUIDO').length,
    rejeitado: requests.filter(r => r.status === 'REJEITADO').length,
    prioridade: requests.filter(r => r.priority).length,
    filmes: requests.filter(r => r.type === 'MOVIE').length,
    series: requests.filter(r => r.type === 'TV').length,
  }

  const viewFilterLabel = viewFilter === 'concluidos' ? 'Concluídos' : viewFilter === 'aberto' ? 'Em Aberto' : 'Todos'

  function handlePrint() {
    const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR')
    const rows = displayed.map(r => `
      <tr>
        <td>${r.priority ? '🔴 ' : ''}${r.requestedTitle}</td>
        <td>${r.type === 'MOVIE' ? 'Filme' : 'Série'}</td>
        <td>${STATUS_LABELS[r.status] || r.status}</td>
        <td>${r.completedBy?.name ?? '—'}</td>
        <td>${r.createdBy.name}</td>
        <td>${fmtDate(r.createdAt)}</td>
      </tr>`).join('')

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"><title>Extrato de Pedidos</title>
      <style>
        body{font-family:sans-serif;padding:24px;color:#111}
        h1{font-size:20px;margin-bottom:4px}p.sub{color:#666;font-size:13px;margin-bottom:16px}
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
        .stat{background:#f3f4f6;border-radius:8px;padding:12px;text-align:center}
        .stat-v{font-size:22px;font-weight:700}.stat-l{font-size:11px;color:#666;margin-top:2px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{background:#f3f4f6;text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase}
        td{padding:7px 10px;border-bottom:1px solid #e5e7eb}
        tr:last-child td{border-bottom:none}
      </style></head><body>
      <h1>Extrato de Pedidos — ${viewFilterLabel}</h1>
      <p class="sub">Período: ${fmtDate(from)} — ${fmtDate(to)} · ${displayed.length} pedido${displayed.length !== 1 ? 's' : ''}</p>
      <div class="stats">
        <div class="stat"><div class="stat-v">${stats.total}</div><div class="stat-l">Total</div></div>
        <div class="stat"><div class="stat-v">${stats.concluido}</div><div class="stat-l">Concluídos</div></div>
        <div class="stat"><div class="stat-v">${stats.emProgresso}</div><div class="stat-l">Em Progresso</div></div>
        <div class="stat"><div class="stat-v">${stats.prioridade}</div><div class="stat-l">Prioridade</div></div>
        <div class="stat"><div class="stat-v">${stats.aberto}</div><div class="stat-l">Abertos</div></div>
        <div class="stat"><div class="stat-v">${stats.rejeitado}</div><div class="stat-l">Rejeitados</div></div>
        <div class="stat"><div class="stat-v">${stats.filmes}</div><div class="stat-l">Filmes</div></div>
        <div class="stat"><div class="stat-v">${stats.series}</div><div class="stat-l">Séries</div></div>
      </div>
      <table><thead><tr><th>Título</th><th>Tipo</th><th>Status</th><th>Concluído por</th><th>Solicitado por</th><th>Data</th></tr></thead>
      <tbody>${rows}</tbody></table>
      </body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Extrato de Pedidos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Selecione o período e imprima</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Date range */}
        <div className="p-5 border-b border-border flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">De</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Até</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <button onClick={handlePrint} disabled={loading || displayed.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition ml-auto">
            <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
          </button>
        </div>

        {/* Completed by filter */}
        {handlers.length > 0 && (
          <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium shrink-0">Atendido por:</span>
            <button onClick={() => setCompletedByFilter('')}
              className={"px-3 py-1 rounded-full text-xs font-medium transition border " + (!completedByFilter ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
              Todos
            </button>
            {handlers.map(name => (
              <button key={name} onClick={() => setCompletedByFilter(completedByFilter === name ? '' : name)}
                className={"px-3 py-1 rounded-full text-xs font-medium transition border " + (completedByFilter === name ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
                {name}
              </button>
            ))}
          </div>
        )}

        {/* View filter */}
        <div className="px-5 py-3 border-b border-border flex gap-2">
          {([
            { v: 'todos', l: 'Todos', count: requests.length },
            { v: 'concluidos', l: 'Concluídos', count: stats.concluido },
            { v: 'aberto', l: 'Em Aberto', count: stats.aberto + stats.emProgresso },
          ] as { v: ViewFilter; l: string; count: number }[]).map(({ v, l, count }) => (
            <button key={v} onClick={() => setViewFilter(v)}
              className={"px-3 py-1.5 rounded-full text-sm font-medium transition border " + (viewFilter === v ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground")}>
              {l} <span className="ml-1 opacity-70">{count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Stats */}
            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-border">
              {[
                { label: 'Total', value: stats.total, color: 'text-foreground' },
                { label: 'Concluídos', value: stats.concluido, color: 'text-green-400' },
                { label: 'Em Progresso', value: stats.emProgresso, color: 'text-blue-400' },
                { label: 'Abertos', value: stats.aberto, color: 'text-yellow-400' },
                { label: 'Prioridade', value: stats.prioridade, color: 'text-red-400' },
                { label: 'Rejeitados', value: stats.rejeitado, color: 'text-zinc-500' },
                { label: 'Filmes', value: stats.filmes, color: 'text-purple-400' },
                { label: 'Séries', value: stats.series, color: 'text-orange-400' },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded-lg p-3 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* List */}
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {displayed.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhum pedido neste filtro</p>
              ) : displayed.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                  {r.priority && <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.requestedTitle}</p>
                    <p className="text-xs text-muted-foreground">{r.type === 'MOVIE' ? 'Filme' : 'Série'} · {r.createdBy.name}</p>
                  </div>
                  <Badge status={r.status} />
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(r.createdAt)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Audio Modals ─────────────────────────────────────────────────────────────

function AudioMovieModal({ current, onConfirm, onCancel }: { current?: string | null; onConfirm: (audio: string) => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold mb-2">{current ? 'Atualizar Áudio' : 'Concluir Pedido'}</h3>
        <p className="text-sm text-muted-foreground mb-6">Como o conteúdo foi disponibilizado?</p>
        <div className="grid grid-cols-1 gap-3">
          {[
            { value: 'DUBLADO', label: '🎙️ Dublado (Dub)' },
            { value: 'LEGENDADO', label: '📝 Legendado (Leg)' },
            { value: 'DUBLADO_LEGENDADO', label: '✅ Dublado + Legendado (Dub/Leg)' },
          ].map((opt) => (
            <button key={opt.value} onClick={() => onConfirm(opt.value)}
              className={"w-full py-3 px-4 rounded-xl border transition-all text-sm font-medium text-left " + (current === opt.value ? 'bg-primary/20 border-primary' : 'border-border hover:bg-primary hover:text-primary-foreground hover:border-primary')}>
              {opt.label} {current === opt.value ? '← atual' : ''}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
      </div>
    </div>
  )
}

function AudioTVModal({ current, onConfirm, onCancel }: { current?: string | null; onConfirm: (audio: string) => void; onCancel: () => void }) {
  const [selected, setSelected] = useState('')
  const [customSeason, setCustomSeason] = useState('')
  const [customAudio, setCustomAudio] = useState('')

  const options = [
    { value: 'TODAS_DUBLADO', label: '🎙️ Todas as temporadas — Dub' },
    { value: 'TODAS_LEGENDADO', label: '📝 Todas as temporadas — Leg' },
    { value: 'TODAS_DUBLADO_LEGENDADO', label: '✅ Todas as temporadas — Dub/Leg' },
    { value: 'CUSTOM', label: '🎛️ Temporada(s) específica(s)...' },
  ]

  const handleConfirm = () => {
    if (selected === 'CUSTOM') {
      if (!customSeason || !customAudio) { toast.error('Preencha a temporada e o áudio'); return }
      onConfirm('Temporada(s) ' + customSeason + ' — ' + customAudio)
    } else {
      onConfirm(selected)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold mb-2">{current ? 'Atualizar Áudio — Série' : 'Concluir Pedido — Série'}</h3>
        <p className="text-sm text-muted-foreground mb-4">Como o conteúdo foi disponibilizado?</p>
        <div className="grid grid-cols-1 gap-2">
          {options.map((opt) => (
            <button key={opt.value} onClick={() => setSelected(opt.value)}
              className={"w-full py-3 px-4 rounded-xl border transition-all text-sm font-medium text-left " + (selected === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-secondary')}>
              {opt.label}
            </button>
          ))}
        </div>
        {selected === 'CUSTOM' && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Temporada(s)</label>
              <input value={customSeason} onChange={(e) => setCustomSeason(e.target.value)} placeholder="Ex: 1, 2 e 3"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Áudio</label>
              <select value={customAudio} onChange={(e) => setCustomAudio(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Selecione...</option>
                <option value="Dub">Dub</option>
                <option value="Leg">Leg</option>
                <option value="Dub/Leg">Dub/Leg</option>
              </select>
            </div>
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border hover:bg-secondary text-sm transition-colors">Cancelar</button>
          <button onClick={handleConfirm} disabled={!selected}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const { data: session } = useSession()
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role ?? '')
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
  const [requests, setRequests] = useState<Request[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ABERTO')
  const [filterType, setFilterType] = useState('')
  const [filterPriority, setFilterPriority] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showExtrato, setShowExtrato] = useState(false)
  const [audioModal, setAudioModal] = useState<{ id: string; type: string; current?: string | null; newStatus: string } | null>(null)
  const [form, setForm] = useState({
    requestedTitle: '', type: 'MOVIE', notes: '', preferredSystem: '',
    tmdbId: null as number | null, posterUrl: null as string | null,
    overview: null as string | null, releaseYear: null as number | null,
    priority: false,
  })
  const [formLoading, setFormLoading] = useState(false)
  const [confirmLimpar, setConfirmLimpar] = useState(false)
  const [limparLoading, setLimparLoading] = useState(false)
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([])
  const [tmdbSearching, setTmdbSearching] = useState(false)
  const [tmdbSelected, setTmdbSelected] = useState<TMDBResult | null>(null)
  const searchTimeout = useRef<NodeJS.Timeout>()
  const [libraryTitle, setLibraryTitle] = useState<{ hasP1: boolean; hasP2: boolean; audioType: string | null } | null>(null)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [audioRequest, setAudioRequest] = useState(false)
  const [tvMode, setTvMode] = useState<'new' | 'update' | 'substitution'>('new')
  const [substitutionSeasons, setSubstitutionSeasons] = useState('')
  const [substitutionEpisodes, setSubstitutionEpisodes] = useState('')

  const handleTmdbSearch = (value: string) => {
    setTmdbQuery(value)
    setTmdbSelected(null)
    clearTimeout(searchTimeout.current)
    if (!value.trim()) { setTmdbResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setTmdbSearching(true)
      const res = await fetch('/api/tmdb/search?query=' + encodeURIComponent(value) + '&type=multi')
      const data = await res.json()
      setTmdbResults(Array.isArray(data) ? data : [])
      setTmdbSearching(false)
    }, 400)
  }

  const handleTmdbSelect = (r: TMDBResult) => {
    setTmdbSelected(r)
    setTmdbResults([])
    setTmdbQuery(r.title)
    setForm((f) => ({ ...f, requestedTitle: r.title, type: r.type === 'MOVIE' ? 'MOVIE' : 'TV', tmdbId: r.tmdbId, posterUrl: r.posterUrl, overview: r.overview, releaseYear: r.releaseYear, notes: '' }))
    setAudioRequest(false)
    setTvMode('new')
    setSubstitutionSeasons('')
    setSubstitutionEpisodes('')
    setLibraryTitle(null)
  }

  useEffect(() => {
    if (!tmdbSelected) {
      setLibraryTitle(null); setAudioRequest(false)
      setTvMode('new'); setSubstitutionSeasons(''); setSubstitutionEpisodes('')
      return
    }
    const titleType = tmdbSelected.type === 'MOVIE' ? 'MOVIE' : 'TV'
    setLibraryLoading(true)
    fetch(`/api/titles?tmdbId=${tmdbSelected.tmdbId}&type=${titleType}&limit=1`)
      .then(r => r.json())
      .then(data => {
        const found = data.titles?.[0] ?? null
        setLibraryTitle(found ? { hasP1: found.hasP1, hasP2: found.hasP2, audioType: found.audioType } : null)
      })
      .catch(() => setLibraryTitle(null))
      .finally(() => setLibraryLoading(false))
  }, [tmdbSelected])

  function buildSubstitutionNote(seasons: string, episodes: string): string {
    const parts = [seasons.trim(), episodes.trim()].filter(Boolean)
    if (!parts.length) return 'Solicitação de substituição de áudio.'
    return `Solicitação de substituição de áudio — ${parts.join(', ')}.`
  }

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(), limit: '20',
      ...(search && { search }),
      ...(filterStatus && { status: filterStatus }),
      ...(filterType && { type: filterType }),
      ...(filterPriority && { priority: 'true' }),
    })
    const res = await fetch('/api/requests?' + params + '&isUpdate=false')
    const data = await res.json()
    setRequests(data.requests || [])
    setTotal(data.total || 0)
    setPages(data.pages || 1)
    setLoading(false)
  }, [page, search, filterStatus, filterType, filterPriority])

  useEffect(() => {
    const t = setTimeout(fetch_, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetch_])

  const handleSubmit = async () => {
    if (!form.requestedTitle.trim()) { toast.error('Título obrigatório'); return }
    setFormLoading(true)
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestedTitle: form.requestedTitle, type: form.type,
        notes: form.notes || null, preferredSystem: form.preferredSystem || null,
        tmdbId: form.tmdbId || null, posterUrl: form.posterUrl || null,
        priority: form.priority,
        ...(form.type === 'TV' && tvMode === 'update' ? { isUpdate: true } : {}),
      }),
    })
    setFormLoading(false)
    if (res.ok) { toast.success(form.priority ? '🔴 Pedido de prioridade criado!' : 'Pedido criado!'); resetForm(); fetch_() }
    else toast.error('Erro ao criar pedido')
  }

  const handleStatusChange = async (id: string, status: string, type: string, currentAudio: string | null) => {
    if (status === 'CONCLUIDO') {
      setAudioModal({ id, type, current: currentAudio, newStatus: 'CONCLUIDO' })
      return
    }
    await applyUpdate(id, status, null)
  }

  const applyUpdate = async (id: string, status: string, audioType: string | null) => {
    const res = await fetch('/api/requests/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, audioType }),
    })
    if (res.ok) {
      const data = await res.json()
      const { complete } = getAudioLabel(audioType)
      if (status === 'CONCLUIDO') {
        if (data.savedToLibrary) {
          toast.success(complete ? '✅ Concluído e salvo na biblioteca — Dub/Leg!' : '✅ Concluído e salvo na biblioteca!')
        } else {
          const reason = data.saveError === 'no_tmdb_id' ? ' (pedido sem TMDB ID)' : data.saveError ? ` (erro: ${data.saveError})` : ''
          toast.warning(`Concluído — título não salvo na biblioteca${reason}`)
        }
      } else {
        toast.success('Status atualizado')
      }
      fetch_()
    } else {
      toast.error('Erro ao atualizar')
    }
    setAudioModal(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este pedido?')) return
    const res = await fetch('/api/requests/' + id, { method: 'DELETE' })
    if (res.ok) { toast.success('Pedido excluído'); fetch_() }
    else toast.error('Erro ao excluir')
  }

  const resetForm = () => {
    setShowForm(false)
    setForm({ requestedTitle: '', type: 'MOVIE', notes: '', preferredSystem: '', tmdbId: null, posterUrl: null, overview: null, releaseYear: null, priority: false })
    setTmdbQuery(''); setTmdbSelected(null); setTmdbResults([])
    setLibraryTitle(null); setAudioRequest(false); setTvMode('new'); setSubstitutionSeasons(''); setSubstitutionEpisodes('')
  }

  return (
    <div className="p-4 sm:p-8">
      {audioModal && audioModal.type === 'MOVIE' && (
        <AudioMovieModal current={audioModal.current} onConfirm={(a) => applyUpdate(audioModal.id, audioModal.newStatus, a)} onCancel={() => setAudioModal(null)} />
      )}
      {audioModal && audioModal.type === 'TV' && (
        <AudioTVModal current={audioModal.current} onConfirm={(a) => applyUpdate(audioModal.id, audioModal.newStatus, a)} onCancel={() => setAudioModal(null)} />
      )}
      {showExtrato && <ExtratoModal onClose={() => setShowExtrato(false)} />}

      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground mt-1">{total} pedidos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isSuperAdmin && (
            confirmLimpar ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Apagar todos os concluídos?</span>
                <button onClick={() => setConfirmLimpar(false)} className="px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:bg-secondary transition">Cancelar</button>
                <button
                  onClick={async () => {
                    setLimparLoading(true)
                    try {
                      const res = await fetch('/api/admin/limpar-concluidos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'requests' }) })
                      const d = await res.json()
                      toast.success(`${d.deleted} pedido(s) removido(s)`)
                      setConfirmLimpar(false)
                      fetch_()
                    } catch { toast.error('Erro ao limpar') }
                    finally { setLimparLoading(false) }
                  }}
                  disabled={limparLoading}
                  className="px-3 py-1.5 rounded-lg text-xs bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30 transition font-medium disabled:opacity-50"
                >
                  {limparLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmLimpar(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Limpar Concluídos
              </button>
            )
          )}
          <button onClick={() => setShowExtrato(true)}
            className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors text-muted-foreground">
            <FileText className="w-4 h-4" /> Extrato
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Novo Pedido
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Buscar pedidos..." className="w-full sm:w-64" />
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {[{ v: '', l: 'Todos' }, { v: 'MOVIE', l: '🎬 Filmes' }, { v: 'TV', l: '📺 Séries' }].map(({ v, l }) => (
            <button key={v} onClick={() => { setFilterType(v); setPage(1) }}
              className={"px-3 py-1.5 rounded-md text-sm font-medium transition-all " + (filterType === v ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground')}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {["ABERTO", "EM_PROGRESSO", "CONCLUIDO", "REJEITADO", ""].map((s) => (
            <button key={s} onClick={() => { setFilterStatus(s); setPage(1) }}
              className={"px-4 py-1.5 rounded-full text-sm font-medium transition border " + (filterStatus === s ? "bg-blue-600 border-blue-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500")}>
              {s === "" ? "Todos" : s === "EM_PROGRESSO" ? "Em Progresso" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
          <button onClick={() => { setFilterPriority(v => !v); setPage(1) }}
            className={"flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition border " + (filterPriority ? "bg-red-600 border-red-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500")}>
            <Flame className="w-3.5 h-3.5" /> Prioridade
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Áudio</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Sistema</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Autor</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Data</th>
                {isAdmin && <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-muted-foreground"><p className="text-lg font-medium">Nenhum pedido encontrado</p></td></tr>
              ) : requests.map((r) => {
                const audio = getAudioLabel(r.audioType)
                return (
                  <tr key={r.id} className={"border-b border-border/50 hover:bg-secondary/30 transition-colors " + (r.priority ? 'bg-red-500/5' : '')}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {r.posterUrl ? (<img src={r.posterUrl} alt={r.requestedTitle} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />) : (<div className="w-10 h-14 bg-muted rounded-lg flex-shrink-0" />)}
                        <div>
                          <div className="flex items-center gap-1.5">
                            {r.priority && <span title="Alta Prioridade"><Flame className="w-3.5 h-3.5 text-red-400 shrink-0" /></span>}
                            <p className="font-medium text-sm">{r.requestedTitle}</p>
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-orange-500/20 text-orange-400 shrink-0">
                              {r.requestCount === 1 ? '1 solicitação' : `${r.requestCount} solicitações`}
                            </span>
                          </div>
                          {r.linkedTitle && <p className="text-xs text-primary mt-0.5">→ {r.linkedTitle.title}</p>}
                          {r.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell"><Badge status={r.type} /></td>
                    <td className="py-3 px-4">
                      {isAdmin ? (
                        <select value={r.status} onChange={(e) => handleStatusChange(r.id, e.target.value, r.type, r.audioType)} className="bg-muted border border-border rounded-md px-2 py-1 text-xs focus:outline-none">
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                        </select>
                      ) : <Badge status={r.status} />}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      {r.status === 'CONCLUIDO' ? (
                        <div className="flex items-center gap-2">
                          <span className={"text-xs px-2 py-1 rounded-lg font-medium " + (audio.complete ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400')}>
                            {audio.label}
                          </span>
                          {isAdmin && (
                            <button onClick={() => setAudioModal({ id: r.id, type: r.type, current: r.audioType, newStatus: 'CONCLUIDO' })}
                              title="Atualizar áudio" className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">{{ P1: 'B2P', P2: 'P2B', AMBOS: 'Ambos' }[r.preferredSystem ?? ''] || r.preferredSystem || '—'}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground hidden lg:table-cell">{r.createdBy.name}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap hidden lg:table-cell">{formatDate(r.createdAt)}</td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">Página {page} de {pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={resetForm}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Novo Pedido</h2>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Buscar no TMDB (opcional)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={tmdbQuery} onChange={(e) => handleTmdbSearch(e.target.value)} placeholder="Buscar filme ou série..."
                    className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  {tmdbSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                {tmdbResults.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden divide-y divide-border mt-2">
                    {tmdbResults.map((r) => (
                      <button key={r.tmdbId + '-' + r.type} onClick={() => handleTmdbSelect(r)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left">
                        {r.posterUrl ? <img src={r.posterUrl} alt={r.title} className="w-8 h-12 rounded object-cover shrink-0" /> : <div className="w-8 h-12 rounded bg-muted shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.type === 'MOVIE' ? 'Filme' : 'Série'} • {r.releaseYear || '?'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {tmdbSelected && (
                <div className="flex gap-3 bg-muted rounded-xl p-3 border border-border">
                  {tmdbSelected.posterUrl && <img src={tmdbSelected.posterUrl} alt={tmdbSelected.title} className="w-16 h-24 rounded-lg object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{tmdbSelected.title}</p>
                    <p className="text-xs text-muted-foreground mb-1">{tmdbSelected.type === 'MOVIE' ? 'Filme' : 'Série'} • {tmdbSelected.releaseYear || '?'}</p>
                    {tmdbSelected.overview && <p className="text-xs text-muted-foreground line-clamp-3">{tmdbSelected.overview}</p>}
                  </div>
                </div>
              )}

              {/* ── Info de catálogo para Filmes ── */}
              {tmdbSelected && form.type === 'MOVIE' && (
                libraryLoading ? (
                  <p className="text-xs text-muted-foreground">Verificando catálogo...</p>
                ) : libraryTitle ? (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Já no catálogo</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">Disponível em:</span>
                      {libraryTitle.hasP1 && <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-medium">B2P</span>}
                      {libraryTitle.hasP2 && <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">P2B</span>}
                      {libraryTitle.audioType === 'DUBLADO' && <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">Dub</span>}
                      {libraryTitle.audioType === 'LEGENDADO' && <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">Leg</span>}
                      {libraryTitle.audioType === 'DUBLADO_LEGENDADO' && <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">Dub+Leg</span>}
                    </div>
                    {libraryTitle.audioType === 'DUBLADO_LEGENDADO' ? (
                      <p className="text-xs text-green-400 font-medium">Já disponível em Dub+Leg</p>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer mt-1">
                        <input
                          type="checkbox"
                          checked={audioRequest}
                          onChange={e => {
                            const checked = e.target.checked
                            setAudioRequest(checked)
                            if (checked) {
                              const version = libraryTitle.audioType === 'DUBLADO' ? 'LEGENDADA' : 'DUBLADA'
                              setForm(f => ({ ...f, notes: `Solicitação de versão ${version} do título já existente no catálogo.` }))
                            } else {
                              setForm(f => ({ ...f, notes: '' }))
                            }
                          }}
                          className="rounded border-border"
                        />
                        <span className="text-sm">
                          {libraryTitle.audioType === 'DUBLADO' ? 'Solicitar versão Legendada' : 'Solicitar versão Dublada'}
                        </span>
                      </label>
                    )}
                  </div>
                ) : null
              )}

              {/* ── Modo de pedido para Séries ── */}
              {tmdbSelected && form.type === 'TV' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground block">Tipo de pedido</label>
                  <div className="space-y-2">
                    {([
                      { value: 'new', label: 'Novo título', desc: 'Série ainda não existe no catálogo' },
                      { value: 'update', label: 'Atualização', desc: 'Novos episódios ou temporadas disponíveis' },
                      { value: 'substitution', label: 'Substituição Dub→Leg ou Leg→Dub', desc: 'Adicionar áudio alternativo em temporadas específicas' },
                    ] as { value: 'new' | 'update' | 'substitution'; label: string; desc: string }[]).map(opt => (
                      <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${tvMode === opt.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary/50'}`}>
                        <input
                          type="radio"
                          name="tvMode"
                          value={opt.value}
                          checked={tvMode === opt.value}
                          onChange={() => {
                            setTvMode(opt.value)
                            setSubstitutionSeasons('')
                            setSubstitutionEpisodes('')
                            setForm(f => ({ ...f, notes: '' }))
                          }}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {tvMode === 'substitution' && (
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Temporada(s)</label>
                        <input
                          value={substitutionSeasons}
                          onChange={e => {
                            setSubstitutionSeasons(e.target.value)
                            setForm(f => ({ ...f, notes: buildSubstitutionNote(e.target.value, substitutionEpisodes) }))
                          }}
                          placeholder="Ex: Temporada 2"
                          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Episódio(s)</label>
                        <input
                          value={substitutionEpisodes}
                          onChange={e => {
                            setSubstitutionEpisodes(e.target.value)
                            setForm(f => ({ ...f, notes: buildSubstitutionNote(substitutionSeasons, e.target.value) }))
                          }}
                          placeholder="Ex: Episódios 1 ao 10"
                          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Título *</label>
                <input value={form.requestedTitle} onChange={(e) => setForm({ ...form, requestedTitle: e.target.value })} placeholder="Nome do filme ou série"
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">Tipo</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="MOVIE">Filme</option>
                    <option value="TV">Série</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">Sistema</label>
                  <select value={form.preferredSystem} onChange={(e) => setForm({ ...form, preferredSystem: e.target.value })}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">Sem preferência</option>
                    <option value="P1">B2P</option>
                    <option value="P2">P2B</option>
                    <option value="AMBOS">Ambos</option>
                  </select>
                </div>
              </div>

              {/* Priority toggle */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">Prioridade</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setForm(f => ({ ...f, priority: false }))}
                    className={"flex-1 py-2.5 rounded-xl border text-sm font-medium transition " + (!form.priority ? 'bg-muted border-border text-foreground' : 'border-border text-muted-foreground hover:bg-muted')}>
                    Normal
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, priority: true }))}
                    className={"flex-1 py-2.5 rounded-xl border text-sm font-medium transition flex items-center justify-center gap-2 " + (form.priority ? 'bg-red-600/20 border-red-500 text-red-400' : 'border-border text-muted-foreground hover:bg-muted')}>
                    <Flame className="w-3.5 h-3.5" /> Alta Prioridade
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informações adicionais..." rows={3}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={resetForm} className="flex-1 py-2 rounded-lg border border-border hover:bg-secondary text-sm transition-colors">Cancelar</button>
              <button onClick={handleSubmit} disabled={formLoading}
                className={"flex-1 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 " + (form.priority ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90')}>
                {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {form.priority ? '🔴 Criar com Prioridade' : 'Criar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
