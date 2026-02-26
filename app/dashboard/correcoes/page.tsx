'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { AlertTriangle, Film, Trash2 } from 'lucide-react'

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
  EM_ANDAMENTO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  EM_PROGRESSO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  CONCLUIDO: 'bg-green-500/20 text-green-400 border-green-500/30',
  REJEITADO: 'bg-red-500/20 text-red-400 border-red-500/30',
}
const statusLabel: Record<string, string> = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em Andamento',
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
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [total, setTotal] = useState(0)

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

  const filters = ['', 'ABERTO', 'EM_PROGRESSO', 'CONCLUIDO', 'REJEITADO']

  return (
    <div className='p-4 sm:p-6'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold flex items-center gap-2'>
          <AlertTriangle className='w-5 h-5 sm:w-6 sm:h-6 text-red-400' />
          Correções
        </h1>
        <p className='text-muted-foreground text-sm mt-1'>Problemas reportados pelos usuários via Vitrine</p>
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
