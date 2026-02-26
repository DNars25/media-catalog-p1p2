'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: string
  userId: string
  before: unknown
  after: unknown
  createdAt: string
  user: { name: string | null; email: string }
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-500/20 text-green-400',
  CREATE_PUBLIC: 'bg-blue-500/20 text-blue-400',
  CREATE_CORRECTION: 'bg-yellow-500/20 text-yellow-400',
  UPDATE: 'bg-orange-500/20 text-orange-400',
  DELETE: 'bg-red-500/20 text-red-400',
}

const ENTITY_TYPES = ['', 'Request', 'Title', 'User']
const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'CREATE_PUBLIC', 'CREATE_CORRECTION']

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (entityType) params.set('entityType', entityType)
    if (action) params.set('action', action)
    const res = await fetch(`/api/admin/audit?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
    }
    setLoading(false)
  }, [page, entityType, action])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  function handleFilterChange() {
    setPage(1)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center gap-3 mb-6'>
        <ClipboardCheck className='w-6 h-6 text-primary' />
        <h1 className='text-2xl font-bold'>Audit Log</h1>
        <span className='text-sm text-muted-foreground ml-2'>{total} registro{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className='flex flex-wrap gap-3 mb-5'>
        <select
          value={entityType}
          onChange={e => { setEntityType(e.target.value); handleFilterChange() }}
          className='bg-secondary text-sm rounded px-3 py-1.5 border border-border'
        >
          <option value=''>Todas entidades</option>
          {ENTITY_TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={action}
          onChange={e => { setAction(e.target.value); handleFilterChange() }}
          className='bg-secondary text-sm rounded px-3 py-1.5 border border-border'
        >
          <option value=''>Todas ações</option>
          {ACTIONS.filter(Boolean).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className='rounded-lg border border-border overflow-hidden'>
        <table className='w-full text-sm'>
          <thead className='bg-secondary/50'>
            <tr>
              <th className='text-left px-4 py-3 text-muted-foreground font-medium'>Data/Hora</th>
              <th className='text-left px-4 py-3 text-muted-foreground font-medium'>Ação</th>
              <th className='text-left px-4 py-3 text-muted-foreground font-medium'>Entidade</th>
              <th className='text-left px-4 py-3 text-muted-foreground font-medium'>Usuário</th>
              <th className='px-4 py-3'></th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {loading ? (
              <tr><td colSpan={5} className='text-center py-12 text-muted-foreground'>Carregando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className='text-center py-12 text-muted-foreground'>Nenhum log encontrado.</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className='hover:bg-secondary/30 transition-colors'>
                <td className='px-4 py-3 text-muted-foreground whitespace-nowrap'>{formatDate(log.createdAt)}</td>
                <td className='px-4 py-3'>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${ACTION_COLORS[log.action] ?? 'bg-secondary text-foreground'}`}>
                    {log.action}
                  </span>
                </td>
                <td className='px-4 py-3'>
                  <span className='font-medium'>{log.entityType}</span>
                  <span className='text-muted-foreground text-xs ml-2 font-mono'>{log.entityId.slice(0, 8)}…</span>
                </td>
                <td className='px-4 py-3 text-muted-foreground'>{log.user?.name ?? log.user?.email}</td>
                <td className='px-4 py-3 text-right'>
                  <button
                    onClick={() => setSelected(log)}
                    className='text-xs text-primary hover:underline'
                  >
                    Ver detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className='flex items-center justify-between mt-4'>
          <span className='text-sm text-muted-foreground'>Página {page} de {pages}</span>
          <div className='flex gap-2'>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className='p-1.5 rounded border border-border hover:bg-secondary disabled:opacity-40'
            >
              <ChevronLeft className='w-4 h-4' />
            </button>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className='p-1.5 rounded border border-border hover:bg-secondary disabled:opacity-40'
            >
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60' onClick={() => setSelected(null)}>
          <div className='bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col' onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between px-5 py-4 border-b border-border'>
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold mr-2 ${ACTION_COLORS[selected.action] ?? 'bg-secondary text-foreground'}`}>
                  {selected.action}
                </span>
                <span className='font-medium'>{selected.entityType}</span>
                <span className='text-muted-foreground text-xs ml-2 font-mono'>{selected.entityId}</span>
              </div>
              <button onClick={() => setSelected(null)} className='text-muted-foreground hover:text-foreground'>
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-5 overflow-y-auto flex-1 space-y-4 text-sm'>
              <p className='text-muted-foreground'>{formatDate(selected.createdAt)} — {selected.user?.name ?? selected.user?.email}</p>
              {selected.before != null && (
                <div>
                  <p className='font-semibold mb-1 text-orange-400'>Antes</p>
                  <pre className='bg-secondary rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all'>
                    {JSON.stringify(selected.before, null, 2)}
                  </pre>
                </div>
              )}
              {selected.after != null && (
                <div>
                  <p className='font-semibold mb-1 text-green-400'>Depois</p>
                  <pre className='bg-secondary rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all'>
                    {JSON.stringify(selected.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
