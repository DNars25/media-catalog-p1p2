'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, X } from 'lucide-react'
import { Badge } from '@/components/badges'
import { formatDate } from '@/lib/utils'

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' })
  const [formLoading, setFormLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/users')
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) { toast.error('Preencha todos os campos'); return }
    setFormLoading(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setFormLoading(false)
    if (res.ok) {
      toast.success('Usuário criado!')
      setShowForm(false)
      setForm({ name: '', email: '', password: '', role: 'USER' })
      fetchUsers()
    } else {
      const err = await res.json()
      toast.error(res.status === 409 ? 'Email já existe' : 'Erro ao criar usuário')
    }
  }

  const handleRoleChange = async (id: string, role: string) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) { toast.success('Role atualizada'); fetchUsers() }
    else toast.error('Erro ao atualizar')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este usuário?')) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Usuário excluído'); fetchUsers() }
    else toast.error('Erro ao excluir')
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground mt-1">{users.length} usuários cadastrados</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Email</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Criado em</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell">{u.email}</td>
                  <td className="py-3 px-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-muted border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">{formatDate(u.createdAt)}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Create user modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Novo Usuário</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Nome', key: 'name', type: 'text', placeholder: 'Nome completo' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'email@exemplo.com' },
                { label: 'Senha', key: 'password', type: 'password', placeholder: '••••••••' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">{field.label}</label>
                  <input
                    type={field.type}
                    value={(form as any)[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              ))}

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-border hover:bg-secondary text-sm transition-colors">Cancelar</button>
              <button
                onClick={handleCreate}
                disabled={formLoading}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
