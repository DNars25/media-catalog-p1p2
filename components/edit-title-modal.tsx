'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { X, Loader2 } from 'lucide-react'

interface TitleForModal {
  id: string
  title: string
  type: 'MOVIE' | 'TV'
  hasP1: boolean
  hasP2: boolean
  internalStatus: string
  tvStatus: string | null
  tvSeasons: number | null
  tvEpisodes: number | null
}

interface EditTitleModalProps {
  title: TitleForModal
  onClose: () => void
  onSaved: () => void
}

export function EditTitleModal({ title, onClose, onSaved }: EditTitleModalProps) {
  const [form, setForm] = useState({
    hasP1: title.hasP1,
    hasP2: title.hasP2,
    internalStatus: title.internalStatus,
    tvStatus: title.tvStatus || '',
    tvSeasons: title.tvSeasons || '',
    tvEpisodes: title.tvEpisodes || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    const res = await fetch(`/api/titles/${title.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        tvSeasons: form.tvSeasons ? parseInt(String(form.tvSeasons)) : null,
        tvEpisodes: form.tvEpisodes ? parseInt(String(form.tvEpisodes)) : null,
        tvStatus: form.tvStatus || null,
      }),
    })
    setLoading(false)
    if (res.ok) {
      toast.success('Título atualizado!')
      onSaved()
    } else {
      toast.error('Erro ao salvar')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold truncate">{title.title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          {/* P1/P2 toggles */}
          <div className="flex gap-4">
            {(['P1', 'P2'] as const).map((p) => {
              const key = p === 'P1' ? 'hasP1' : 'hasP2'
              const label = p === 'P1' ? 'B2P' : 'P2B'
              return (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <div
                    className={`w-10 h-6 rounded-full transition-colors ${form[key] ? 'bg-primary' : 'bg-muted'}`}
                    onClick={() => setForm({ ...form, [key]: !form[key] })}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm font-semibold">{label}</span>
                </label>
              )
            })}
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1.5">Status Interno</label>
            <select
              value={form.internalStatus}
              onChange={(e) => setForm({ ...form, internalStatus: e.target.value })}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="AGUARDANDO_DOWNLOAD">Aguardando Download</option>
              <option value="DISPONIVEL">Disponível</option>
              <option value="INDISPONIVEL">Indisponível</option>
            </select>
          </div>

          {title.type === 'TV' && (
            <>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Status da Série</label>
                <select
                  value={form.tvStatus}
                  onChange={(e) => setForm({ ...form, tvStatus: e.target.value })}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Não definido</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="FINALIZADA">Finalizada</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">Temporadas</label>
                  <input
                    type="number"
                    value={form.tvSeasons}
                    onChange={(e) => setForm({ ...form, tvSeasons: e.target.value })}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">Episódios</label>
                  <input
                    type="number"
                    value={form.tvEpisodes}
                    onChange={(e) => setForm({ ...form, tvEpisodes: e.target.value })}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border hover:bg-secondary text-sm transition-colors">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
