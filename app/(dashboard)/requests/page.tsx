'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Plus, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react'
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
  createdAt: string
  createdBy: { name: string }
  linkedTitle: { id: string; title: string } | null
}

const STATUS_OPTIONS = ['ABERTO', 'EM_PROGRESSO', 'CONCLUIDO', 'REJEITADO']

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
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    requestedTitle: '',
    type: 'MOVIE',
    notes: '',
    preferredSystem: '',
  })
  const [formLoading, setFormLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      ...(search && { search }),
      ...(filterStatus && { status: filterStatus }),
    })
    const res = await fetch(`/api/requests?${params}`)
    const data = await res.json()
    setRequests(data.requests || [])
    setTotal(data.total || 0)
    setPages(data.pages || 1)
    setLoading(false)
  }, [page, search, filterStatus])

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
        ...form,
        preferredSystem: form.preferredSystem || null,
      }),
    })
    setFormLoading(false)
    if (res.ok) {
      toast.success('Pedido criado!')
      setShowForm(false)
      setForm({ requestedTitle: '', type: 'MOVIE', notes: '', preferredSystem: '' })
      fetch_()
    } else {
      toast.error('Erro ao criar pedido')
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { toast.success('Status atualizado'); fetch_() }
    else toast.error('Erro ao atualizar')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este pedido?')) return
    const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Pedido excluído'); fetch_() }
    else toast.error('Erro ao excluir')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground mt-1">{total} pedidos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Pedido
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Buscar pedidos..."
          className="w-64"
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sistema</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Autor</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
              {isAdmin && <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-muted-foreground"><p className="text-lg font-medium">Nenhum pedido encontrado</p></td></tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium text-sm">{r.requestedTitle}</p>
                    {r.linkedTitle && <p className="text-xs text-primary mt-0.5">→ {r.linkedTitle.title}</p>}
                    {r.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.notes}</p>}
                  </td>
                  <td className="py-3 px-4"><Badge status={r.type as any} /></td>
                  <td className="py-3 px-4">
                    {isAdmin ? (
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        className="bg-muted border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    ) : (
                      <Badge status={r.status as any} />
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{r.preferredSystem || '—'}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{r.createdBy.name}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  {isAdmin && (
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Novo Pedido</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Título *</label>
                <input
                  value={form.requestedTitle}
                  onChange={(e) => setForm({ ...form, requestedTitle: e.target.value })}
                  placeholder="Nome do filme ou série"
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="MOVIE">Filme</option>
                    <option value="TV">Série</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">Sistema</label>
                  <select
                    value={form.preferredSystem}
                    onChange={(e) => setForm({ ...form, preferredSystem: e.target.value })}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Sem preferência</option>
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="AMBOS">Ambos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Informações adicionais..."
                  rows={3}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-border hover:bg-secondary text-sm transition-colors">Cancelar</button>
              <button
                onClick={handleSubmit}
                disabled={formLoading}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
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
