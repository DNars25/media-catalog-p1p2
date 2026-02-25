'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Plus, Loader2, ChevronLeft, ChevronRight, X, Search, Pencil } from 'lucide-react'
import { Badge } from '@/components/badges'
import { SearchInput } from '@/components/search-input'
import { formatDate } from '@/lib/utils'

interface Request {
  id: string
  requestedTitle: string
  type: string
  status: string
  preferredSystem: string | null
  notes: string | null
  audioType: string | null
  posterUrl: string | null
  createdAt: string
  createdBy: { name: string }
  linkedTitle: { id: string; title: string } | null
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

function getAudioLabel(audio: string | null): { label: string; complete: boolean } {
  if (!audio) return { label: '—', complete: false }
  const map: Record<string, string> = {
    DUBLADO: 'Dub',
    LEGENDADO: 'Leg',
    DUBLADO_LEGENDADO: 'Dub/Leg',
    TODAS_DUBLADO: 'Todas-Dub',
    TODAS_LEGENDADO: 'Todas-Leg',
    TODAS_DUBLADO_LEGENDADO: 'Todas-Dub/Leg',
  }
  const label = map[audio] || audio
  const complete = audio === 'DUBLADO_LEGENDADO' || audio === 'TODAS_DUBLADO_LEGENDADO' || audio.includes('Dublado + Legendado')
  return { label, complete }
}

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

export default function RequestsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const [requests, setRequests] = useState<Request[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [audioModal, setAudioModal] = useState<{ id: string; type: string; current?: string | null; newStatus: string } | null>(null)
  const [form, setForm] = useState({ requestedTitle: '', type: 'MOVIE', notes: '', preferredSystem: '', tmdbId: null as number | null, posterUrl: null as string | null, overview: null as string | null, releaseYear: null as number | null })
  const [formLoading, setFormLoading] = useState(false)
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([])
  const [tmdbSearching, setTmdbSearching] = useState(false)
  const [tmdbSelected, setTmdbSelected] = useState<TMDBResult | null>(null)
  const searchTimeout = useRef<NodeJS.Timeout>()

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
    setForm((f) => ({ ...f, requestedTitle: r.title, type: r.type === 'MOVIE' ? 'MOVIE' : 'TV', tmdbId: r.tmdbId, posterUrl: r.posterUrl, overview: r.overview, releaseYear: r.releaseYear }))
  }

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: page.toString(), limit: '20', ...(search && { search }), ...(filterStatus && { status: filterStatus }), ...(filterType && { type: filterType }) })
    const res = await fetch('/api/requests?' + params + '&isUpdate=false')
    const data = await res.json()
    setRequests(data.requests || [])
    setTotal(data.total || 0)
    setPages(data.pages || 1)
    setLoading(false)
  }, [page, search, filterStatus, filterType])

  useEffect(() => {
    const t = setTimeout(fetch_, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetch_])

  const handleSubmit = async () => {
    if (!form.requestedTitle.trim()) { toast.error('Título obrigatório'); return }
    setFormLoading(true)
    const res = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestedTitle: form.requestedTitle, type: form.type, notes: form.notes || null, preferredSystem: form.preferredSystem || null, tmdbId: form.tmdbId || null, posterUrl: form.posterUrl || null }) })
    setFormLoading(false)
    if (res.ok) { toast.success('Pedido criado!'); resetForm(); fetch_() }
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
      body: JSON.stringify({ status, audioType })
    })
    if (res.ok) {
      const { complete } = getAudioLabel(audioType)
      if (status === 'CONCLUIDO') {
        toast.success(complete ? '✅ Concluído — Dub/Leg!' : '🎙️ Concluído — você pode atualizar o áudio depois')
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
    setForm({ requestedTitle: '', type: 'MOVIE', notes: '', preferredSystem: '', tmdbId: null, posterUrl: null, overview: null, releaseYear: null })
    setTmdbQuery(''); setTmdbSelected(null); setTmdbResults([])
  }

  return (
    <div className="p-4 sm:p-8">
      {audioModal && audioModal.type === 'MOVIE' && (
        <AudioMovieModal
          current={audioModal.current}
          onConfirm={(a) => applyUpdate(audioModal.id, audioModal.newStatus, a)}
          onCancel={() => setAudioModal(null)}
        />
      )}
      {audioModal && audioModal.type === 'TV' && (
        <AudioTVModal
          current={audioModal.current}
          onConfirm={(a) => applyUpdate(audioModal.id, audioModal.newStatus, a)}
          onCancel={() => setAudioModal(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground mt-1">{total} pedidos</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Novo Pedido
        </button>
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
          {["", "ABERTO", "EM_PROGRESSO", "CONCLUIDO", "REJEITADO"].map((s) => (
            <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }} className={"px-4 py-1.5 rounded-full text-sm font-medium transition border " + (filterStatus === s ? "bg-blue-600 border-blue-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500")}>
              {s === "" ? "Todos" : s === "EM_PROGRESSO" ? "Em Progresso" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
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
                <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {r.posterUrl ? (<img src={r.posterUrl} alt={r.requestedTitle} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />) : (<div className="w-10 h-14 bg-muted rounded-lg flex-shrink-0" />)}
                        <div>
                          <p className="font-medium text-sm">{r.requestedTitle}</p>
                    {r.linkedTitle && <p className="text-xs text-primary mt-0.5">→ {r.linkedTitle.title}</p>}
                    {r.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.notes}</p>}
                        </div>
                      </div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell"><Badge status={r.type as any} /></td>
                  <td className="py-3 px-4">
                    {isAdmin ? (
                      <select value={r.status} onChange={(e) => handleStatusChange(r.id, e.target.value, r.type, r.audioType)} className="bg-muted border border-border rounded-md px-2 py-1 text-xs focus:outline-none">
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                    ) : <Badge status={r.status as any} />}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    {r.status === 'CONCLUIDO' ? (
                      <div className="flex items-center gap-2">
                        <span className={"text-xs px-2 py-1 rounded-lg font-medium " + (audio.complete ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400')}>
                          {audio.label}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => setAudioModal({ id: r.id, type: r.type, current: r.audioType, newStatus: 'CONCLUIDO' })}
                            title="Atualizar áudio"
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informações adicionais..." rows={3}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={resetForm} className="flex-1 py-2 rounded-lg border border-border hover:bg-secondary text-sm transition-colors">Cancelar</button>
              <button onClick={handleSubmit} disabled={formLoading}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Criar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
