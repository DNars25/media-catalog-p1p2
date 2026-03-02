'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { AlertTriangle, Film, Trash2, Plus, Search, Loader2, X, CheckCircle } from 'lucide-react'

interface Correction {
  id: string
  requestedTitle: string
  type: string
  posterUrl: string | null
  notes: string | null
  preferredSystem: string | null
  seasonNumber: number | null
  status: string
  createdAt: string
  createdById: string
  createdBy: { name: string; email: string }
}

const statusColor: Record<string, string> = {
  ABERTO: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  EM_PROGRESSO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  CONCLUIDO: 'bg-green-500/20 text-green-400 border-green-500/30',
  REJEITADO: 'bg-red-500/20 text-red-400 border-red-500/30',
}
const statusLabel: Record<string, string> = {
  ABERTO: 'Aberto',
  EM_PROGRESSO: 'Em Progresso',
  CONCLUIDO: 'Resolvido',
  REJEITADO: 'Rejeitado',
}
const serverLabel: Record<string, string> = {
  P1: 'B2P',
  P2: 'P2B',
  AMBOS: 'Ambos',
}

function parseNotes(notes: string | null) {
  if (!notes) return { problem: null, server: null, season: null, episodes: null }
  const lines = notes.split('\n')
  const get = (prefix: string) => {
    const line = lines.find(l => l.startsWith(prefix))
    return line ? line.replace(prefix, '').trim() : null
  }
  return {
    problem: get('Problema:'),
    server: get('Servidor:'),
    season: get('Temporada:'),
    episodes: get('Episódios:'),
  }
}

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
}

function NovaCorrecaoModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<'MOVIE' | 'TV'>('MOVIE')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<LocalItem[] | null>(null)
  const [selected, setSelected] = useState<LocalItem | null>(null)
  const [server, setServer] = useState<'B2P' | 'P2B'>('B2P')
  const [problemType, setProblemType] = useState<'offline' | 'outro'>('offline')
  const [problem, setProblem] = useState('')
  const [season, setSeason] = useState('')
  const [episodes, setEpisodes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSearch() {
    if (query.trim().length < 2) return
    setSearching(true)
    setResults(null)
    setSelected(null)
    try {
      const res = await fetch(`/api/vitrine?q=${encodeURIComponent(query.trim())}&type=${type}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setResults(data.local ?? [])
    } catch {
      toast.error('Erro ao buscar títulos')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function selectItem(item: LocalItem) {
    setSelected(item)
    setType(item.type as 'MOVIE' | 'TV')
    const servers: ('B2P' | 'P2B')[] = []
    if (item.hasP1) servers.push('B2P')
    if (item.hasP2) servers.push('P2B')
    setServer(servers[0] ?? 'B2P')
    setProblemType('offline')
    setProblem('')
    setSeason('')
    setEpisodes('')
  }

  async function handleSubmit() {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/correcoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selected.title,
          tmdbId: selected.tmdbId,
          posterUrl: selected.posterUrl,
          type,
          server,
          notes: problemType === 'offline' ? 'Offline' : problem,
          seasonNumber: season ? parseInt(season) : null,
          episodeNotes: episodes || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Correção criada!')
      onCreated()
      onClose()
    } catch {
      toast.error('Erro ao criar correção')
    } finally {
      setSubmitting(false)
    }
  }

  const availableServers: ('B2P' | 'P2B')[] = selected
    ? (selected.hasP1 || selected.hasP2)
      ? [...(selected.hasP1 ? ['B2P' as const] : []), ...(selected.hasP2 ? ['P2B' as const] : [])]
      : ['B2P', 'P2B']
    : ['B2P', 'P2B']

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
      <div className='bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl'>

        {/* Header */}
        <div className='flex items-center justify-between p-5 border-b border-border flex-shrink-0'>
          <div>
            <h2 className='font-semibold text-base'>Nova Correção</h2>
            <p className='text-xs text-muted-foreground mt-0.5'>Reporte um título com problema no catálogo</p>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-secondary transition text-muted-foreground'>
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='p-5 space-y-4 overflow-y-auto'>
          {/* Tipo */}
          <div>
            <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2'>Tipo</p>
            <div className='flex gap-2'>
              {(['MOVIE', 'TV'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setType(t); setResults(null); setSelected(null) }}
                  disabled={selected !== null}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition border disabled:opacity-50 disabled:cursor-not-allowed ${type === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'}`}
                >
                  {t === 'MOVIE' ? 'Filme' : 'Série'}
                </button>
              ))}
            </div>
          </div>

          {/* Busca */}
          <div>
            <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2'>
              Buscar {type === 'MOVIE' ? 'Filme' : 'Série'}
            </p>
            <div className='flex gap-2'>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={`Buscar ${type === 'MOVIE' ? 'filme' : 'série'} no catálogo...`}
                className='flex-1 rounded-lg px-3 py-2 text-sm bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-ring'
              />
              <button
                onClick={handleSearch}
                disabled={searching || query.trim().length < 2}
                className='px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 transition'
              >
                {searching ? <Loader2 className='w-4 h-4 animate-spin' /> : <Search className='w-4 h-4' />}
              </button>
            </div>
          </div>

          {/* Resultados */}
          {results !== null && !selected && (
            <div>
              {results.length === 0 ? (
                <p className='text-sm text-muted-foreground text-center py-4'>Nenhum título encontrado no catálogo</p>
              ) : (
                <div className='space-y-1.5'>
                  <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2'>Selecione o título</p>
                  {results.map(item => (
                    <button
                      key={item.id}
                      onClick={() => selectItem(item)}
                      className='w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/50 hover:border-muted-foreground/30 transition text-left'
                    >
                      {item.posterUrl
                        ? <img src={item.posterUrl} alt={item.title} className='w-9 h-12 object-cover rounded flex-shrink-0' />
                        : <div className='w-9 h-12 bg-muted rounded flex-shrink-0 flex items-center justify-center'><Film className='w-3.5 h-3.5 text-muted-foreground' /></div>
                      }
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium'>{item.title}</p>
                        <p className='text-xs text-muted-foreground'>{item.year}</p>
                        <div className='flex items-center gap-1 mt-0.5'>
                          <CheckCircle className='w-3 h-3 text-green-400' />
                          <span className='text-xs text-green-400'>{item.server}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Formulário de correção */}
          {selected && (
            <div className='bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-3'>
              <div className='flex items-center gap-2'>
                {selected.posterUrl
                  ? <img src={selected.posterUrl} alt={selected.title} className='w-8 h-11 object-cover rounded flex-shrink-0' />
                  : <div className='w-8 h-11 bg-muted rounded flex-shrink-0' />
                }
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-semibold'>{selected.title}</p>
                  <button onClick={() => setSelected(null)} className='text-xs text-muted-foreground hover:text-foreground transition'>
                    Trocar título
                  </button>
                </div>
              </div>

              {/* Tipo do problema */}
              <div>
                <p className='text-xs text-muted-foreground mb-2'>Tipo do problema</p>
                <div className='flex gap-2'>
                  {(['offline', 'outro'] as const).map(pt => (
                    <button
                      key={pt}
                      onClick={() => { setProblemType(pt); setProblem('') }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition border ${problemType === pt ? 'bg-destructive/20 text-destructive border-destructive/40' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
                    >
                      {pt === 'offline' ? 'Offline' : 'Outro Problema'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição — apenas para Outro Problema */}
              {problemType === 'outro' && (
                <div>
                  <p className='text-xs text-muted-foreground mb-1'>Descreva o problema <span className='text-destructive'>*</span></p>
                  <textarea
                    value={problem}
                    onChange={e => setProblem(e.target.value)}
                    placeholder='Ex: Áudio dessincronizado, legendas incorretas...'
                    rows={3}
                    className='w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-ring resize-none'
                  />
                </div>
              )}

              {/* Servidor */}
              <div>
                <p className='text-xs text-muted-foreground mb-2'>Sistema offline</p>
                <div className='flex gap-2'>
                  {availableServers.map(s => (
                    <button
                      key={s}
                      onClick={() => setServer(s)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition border ${server === s ? 'bg-destructive/20 text-destructive border-destructive/40' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temporada / Episódios (somente TV) */}
              {type === 'TV' && (
                <div className='flex gap-2'>
                  <div className='flex-1'>
                    <p className='text-xs text-muted-foreground mb-1'>Temporada</p>
                    <input
                      type='number'
                      min={1}
                      value={season}
                      onChange={e => setSeason(e.target.value)}
                      placeholder='Ex: 2'
                      className='w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-ring'
                    />
                  </div>
                  <div className='flex-1'>
                    <p className='text-xs text-muted-foreground mb-1'>Episódios <span className='text-muted-foreground/50'>(opcional)</span></p>
                    <input
                      type='text'
                      value={episodes}
                      onChange={e => setEpisodes(e.target.value)}
                      placeholder='Ex: 3, 5-8'
                      className='w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-ring'
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex gap-2 p-5 border-t border-border flex-shrink-0'>
          <button
            onClick={onClose}
            className='flex-1 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition'
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selected || (problemType === 'outro' && problem.trim().length < 3) || submitting}
            className='flex-1 py-2 rounded-lg text-sm font-semibold bg-destructive text-destructive-foreground disabled:opacity-40 transition hover:bg-destructive/90'
          >
            {submitting ? <Loader2 className='w-4 h-4 animate-spin mx-auto' /> : 'Criar Correção'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CorrectionCard({ c, isAdmin, userId, onStatusChange, onDelete }: {
  c: Correction
  isAdmin: boolean
  userId: string
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const parsed = parseNotes(c.notes)
  const serverDisplay = c.preferredSystem ? (serverLabel[c.preferredSystem] || c.preferredSystem) : parsed.server
  const canDelete = isAdmin || c.createdById === userId

  async function handleStatus(status: string) {
    setUpdating(true)
    await onStatusChange(c.id, status)
    setUpdating(false)
  }

  return (
    <div className='bg-card border border-border rounded-xl overflow-hidden'>
      <div className='flex items-start gap-3 p-4 cursor-pointer hover:bg-secondary/20 transition' onClick={() => setOpen(o => !o)}>
        {c.posterUrl
          ? <img src={c.posterUrl} alt={c.requestedTitle} className='w-10 h-14 object-cover rounded flex-shrink-0' />
          : <div className='w-10 h-14 bg-muted rounded flex-shrink-0 flex items-center justify-center'><Film className='w-4 h-4 text-muted-foreground' /></div>
        }
        <div className='flex-1 min-w-0'>
          <div className='flex items-start justify-between gap-2'>
            <div className='min-w-0'>
              <div className='flex items-center gap-2 flex-wrap'>
                <p className='font-semibold text-sm'>{c.requestedTitle}</p>
                <span className='text-xs text-muted-foreground'>{c.type === 'MOVIE' ? 'Filme' : 'Série'}</span>
                {serverDisplay && (
                  <span className='text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium'>
                    {serverDisplay}
                  </span>
                )}
              </div>
              {parsed.problem && <p className='text-xs text-muted-foreground mt-0.5 line-clamp-2'>{parsed.problem}</p>}
              {c.type === 'TV' && (c.seasonNumber || parsed.season) && (
                <p className='text-xs text-muted-foreground'>
                  Temp {c.seasonNumber || parsed.season}
                  {parsed.episodes ? ` · Eps ${parsed.episodes}` : ''}
                </p>
              )}
              <p className='text-xs text-muted-foreground/60 mt-0.5'>
                {new Date(c.createdAt).toLocaleDateString('pt-BR')} · {c.createdBy.name}
              </p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${statusColor[c.status] || 'bg-muted text-muted-foreground border-border'}`}>
              {statusLabel[c.status] || c.status}
            </span>
          </div>
        </div>
      </div>

      {open && (
        <div className='px-4 pb-4 border-t border-border pt-3 space-y-3'>
          {parsed.problem && (
            <div className='bg-muted rounded-lg p-3'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'>Descrição do Problema</p>
              <p className='text-sm'>{parsed.problem}</p>
            </div>
          )}

          {isAdmin && (
            <div>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2'>Alterar Status</p>
              <div className='flex gap-2 flex-wrap'>
                {['ABERTO', 'EM_PROGRESSO', 'CONCLUIDO', 'REJEITADO'].map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatus(s)}
                    disabled={updating || c.status === s}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border disabled:opacity-40 ${c.status === s ? statusColor[s] : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                  >
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {canDelete && (
            <div className='flex justify-end pt-1'>
              {confirmDelete ? (
                <div className='flex items-center gap-2'>
                  <span className='text-xs text-muted-foreground'>Confirmar exclusão?</span>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className='px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:bg-secondary transition'
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    className='px-3 py-1.5 rounded-lg text-xs bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30 transition font-medium'
                  >
                    Excluir
                  </button>
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                  className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition'
                >
                  <Trash2 className='w-3.5 h-3.5' /> Excluir
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CorrecoesPage() {
  const { data: session } = useSession()
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role ?? '')
  const userId = session?.user?.id || ''
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('ABERTO')
  const [total, setTotal] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [confirmLimpar, setConfirmLimpar] = useState(false)
  const [limparLoading, setLimparLoading] = useState(false)

  const fetchCorrections = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (filterStatus) params.append('status', filterStatus)
    fetch('/api/correcoes?' + params)
      .then(r => r.json())
      .then(d => { setCorrections(d.corrections || []); setTotal(d.total || 0) })
      .catch(() => toast.error('Erro ao carregar correções'))
      .finally(() => setLoading(false))
  }, [filterStatus])

  useEffect(() => { fetchCorrections() }, [fetchCorrections])

  async function handleStatusChange(id: string, status: string) {
    try {
      const res = await fetch('/api/requests/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast.success('Status atualizado!')
      fetchCorrections()
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch('/api/requests/' + id, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Correção excluída!')
      fetchCorrections()
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  const filters = ['ABERTO', 'EM_PROGRESSO', 'CONCLUIDO', 'REJEITADO', '']

  return (
    <div className='p-4 sm:p-6'>
      {showModal && (
        <NovaCorrecaoModal onClose={() => setShowModal(false)} onCreated={fetchCorrections} />
      )}

      <div className='mb-6 flex items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold flex items-center gap-2'>
            <AlertTriangle className='w-5 h-5 sm:w-6 sm:h-6 text-red-400' />
            Correções
          </h1>
          <p className='text-muted-foreground text-sm mt-1'>Problemas reportados pelos usuários via Vitrine</p>
        </div>
        <div className='flex items-center gap-2 flex-shrink-0'>
          {isSuperAdmin && (
            confirmLimpar ? (
              <div className='flex items-center gap-2'>
                <span className='text-xs text-muted-foreground'>Apagar todos os concluídos?</span>
                <button onClick={() => setConfirmLimpar(false)} className='px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:bg-secondary transition'>Cancelar</button>
                <button
                  onClick={async () => {
                    setLimparLoading(true)
                    try {
                      const res = await fetch('/api/admin/limpar-concluidos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'corrections' }) })
                      const d = await res.json()
                      toast.success(`${d.deleted} correção(ões) removida(s)`)
                      setConfirmLimpar(false)
                      fetchCorrections()
                    } catch { toast.error('Erro ao limpar') }
                    finally { setLimparLoading(false) }
                  }}
                  disabled={limparLoading}
                  className='px-3 py-1.5 rounded-lg text-xs bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30 transition font-medium disabled:opacity-50'
                >
                  {limparLoading ? <Loader2 className='w-3 h-3 animate-spin' /> : 'Confirmar'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmLimpar(true)}
                className='flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition text-sm font-medium'
              >
                <Trash2 className='w-4 h-4' />
                Limpar Concluídos
              </button>
            )
          )}
          <button
            onClick={() => setShowModal(true)}
            className='flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition text-sm font-medium'
          >
            <Plus className='w-4 h-4' />
            Nova Correção
          </button>
        </div>
      </div>

      <div className='flex gap-2 flex-wrap mb-6'>
        {filters.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${filterStatus === s ? 'bg-primary border-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'}`}
          >
            {s === '' ? `Todos (${total})` : statusLabel[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className='text-center py-16 text-muted-foreground'>Carregando...</div>
      ) : corrections.length === 0 ? (
        <div className='text-center py-16 text-muted-foreground'>
          <AlertTriangle className='w-8 h-8 mx-auto mb-2 text-muted-foreground/40' />
          <p>Nenhuma correção encontrada</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {corrections.map(c => (
            <CorrectionCard key={c.id} c={c} isAdmin={isAdmin} userId={userId} onStatusChange={handleStatusChange} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
