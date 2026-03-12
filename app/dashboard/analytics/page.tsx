'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BarChart2, Download, Loader2, TrendingUp, AlertTriangle, RefreshCw, Film, FileSpreadsheet, Printer } from 'lucide-react'
import type { AnalyticsData } from '@/lib/analytics'
import { UserBarChart, MonthlyLineChart } from './analytics-charts'

const MEDIA_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'MOVIE', label: 'Filmes' },
  { value: 'TV', label: 'Séries' },
]

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function defaultDates() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { start: toInputDate(start), end: toInputDate(end) }
}

function pct(done: number, total: number) {
  if (!total) return '0'
  return Math.round((done / total) * 100).toString()
}

function calcVariation(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

function StatCard({ icon, label, value, sub, colorClass, variation }: {
  icon: React.ReactNode
  label: string
  value: number
  sub: string
  colorClass: string
  variation?: number | null
}) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className='flex items-center gap-2 mb-2'>
        {icon}
        <span className='text-sm font-medium text-muted-foreground'>{label}</span>
      </div>
      <p className='text-3xl font-bold'>{value.toLocaleString('pt-BR')}</p>
      <div className='flex items-center justify-between mt-1 gap-2'>
        <p className='text-xs text-muted-foreground'>{sub}</p>
        {variation != null && (
          <span className={`text-xs font-semibold whitespace-nowrap ${variation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {variation >= 0 ? '↑' : '↓'} {Math.abs(variation)}%
          </span>
        )}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role ?? '')

  const { start: defaultStart, end: defaultEnd } = defaultDates()
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  // Committed values (only update on Apply)
  const [appliedStart, setAppliedStart] = useState(defaultStart)
  const [appliedEnd, setAppliedEnd] = useState(defaultEnd)

  const [userId, setUserId] = useState('')
  const [mediaType, setMediaType] = useState('')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [allUsers, setAllUsers] = useState<{ userId: string; userName: string }[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [divData, setDivData] = useState<{ resolverDivergencia: number; resolverMapeamento: number; byUser: Record<string, number> } | null>(null)

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) router.replace('/dashboard')
  }, [status, isAdmin, router])

  const fetchData = useCallback(() => {
    if (!isAdmin) return
    setLoading(true)
    setErrorMsg(null)
    const params = new URLSearchParams({ startDate: appliedStart, endDate: appliedEnd })
    if (userId) params.set('userId', userId)
    if (mediaType) params.set('mediaType', mediaType)
    const divParams = new URLSearchParams({ startDate: appliedStart, endDate: appliedEnd })
    Promise.all([
      fetch('/api/analytics?' + params.toString()).then(r => r.json()),
      fetch('/api/analytics/divergencias?' + divParams.toString()).then(r => r.json()),
    ])
      .then(([d, div]) => {
        if (d?.error) { setErrorMsg(d.error); setData(null) }
        else {
          setData(d)
          if (d.allUsers?.length) setAllUsers(d.allUsers)
        }
        if (!div?.error) setDivData(div)
      })
      .catch(e => { setErrorMsg(String(e)); setData(null) })
      .finally(() => setLoading(false))
  }, [appliedStart, appliedEnd, userId, mediaType, isAdmin])

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) fetchData()
  }, [fetchData, status, isAdmin])

  function applyRange() {
    setAppliedStart(startDate)
    setAppliedEnd(endDate)
  }

  function setQuickRange(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    const s = toInputDate(start)
    const e = toInputDate(end)
    setStartDate(s)
    setEndDate(e)
    setAppliedStart(s)
    setAppliedEnd(e)
  }

  function handleExport(format: 'csv' | 'xlsx') {
    setExporting(true)
    const params = new URLSearchParams({ startDate: appliedStart, endDate: appliedEnd, format })
    if (userId) params.set('userId', userId)
    if (mediaType) params.set('mediaType', mediaType)
    const a = document.createElement('a')
    a.href = '/api/analytics/export?' + params.toString()
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => setExporting(false), 1500)
  }

  if (status === 'loading' || (status === 'authenticated' && !isAdmin)) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  const prev = data?.previousTotals

  return (
    <div className='p-4 sm:p-6 space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 print:hidden'>
        <div className='flex flex-col sm:flex-row sm:items-center gap-4 justify-between'>
          <div>
            <h1 className='text-2xl font-bold flex items-center gap-2'>
              <BarChart2 className='w-6 h-6 text-primary' />
              Analytics
            </h1>
            <p className='text-muted-foreground text-sm mt-1'>Atividade dos usuários no sistema</p>
          </div>
          {/* Export buttons */}
          <div className='flex items-center gap-2 flex-wrap'>
            <button
              onClick={() => window.print()}
              className='flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border hover:bg-secondary transition text-sm font-medium'
            >
              <Printer className='w-4 h-4' />
              PDF
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting || loading || !data}
              className='flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition text-sm font-medium disabled:opacity-50'
            >
              {exporting ? <Loader2 className='w-4 h-4 animate-spin' /> : <Download className='w-4 h-4' />}
              CSV
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              disabled={exporting || loading || !data}
              className='flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition text-sm font-medium disabled:opacity-50'
            >
              {exporting ? <Loader2 className='w-4 h-4 animate-spin' /> : <FileSpreadsheet className='w-4 h-4' />}
              Excel
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className='flex flex-wrap gap-3 items-end'>
          {/* Date range */}
          <div className='flex flex-col gap-1.5'>
            <span className='text-xs text-muted-foreground font-medium'>Período</span>
            <div className='flex items-center gap-2 flex-wrap'>
              {/* Quick-fill shortcuts */}
              <div className='flex gap-1 bg-muted rounded-lg p-1'>
                {[
                  { label: '7d', days: 7 },
                  { label: '30d', days: 30 },
                  { label: '90d', days: 90 },
                  { label: '1a', days: 365 },
                ].map(q => (
                  <button
                    key={q.days}
                    onClick={() => setQuickRange(q.days)}
                    className='px-3 py-1.5 rounded-md text-sm font-medium transition text-muted-foreground hover:text-foreground hover:bg-secondary'
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              {/* Date inputs */}
              <div className='flex items-center gap-2'>
                <div className='flex flex-col gap-0.5'>
                  <label className='text-xs text-muted-foreground'>Data inicial</label>
                  <input
                    type='date'
                    value={startDate}
                    max={endDate}
                    onChange={e => setStartDate(e.target.value)}
                    className='px-3 py-1.5 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary'
                  />
                </div>
                <span className='text-muted-foreground text-sm mt-4'>→</span>
                <div className='flex flex-col gap-0.5'>
                  <label className='text-xs text-muted-foreground'>Data final</label>
                  <input
                    type='date'
                    value={endDate}
                    min={startDate}
                    onChange={e => setEndDate(e.target.value)}
                    className='px-3 py-1.5 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary'
                  />
                </div>
              </div>
              <button
                onClick={applyRange}
                disabled={loading}
                className='mt-4 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50'
              >
                Aplicar
              </button>
            </div>
          </div>

          {/* Media type */}
          <div className='flex flex-col gap-1.5'>
            <span className='text-xs text-muted-foreground font-medium'>Tipo</span>
            <div className='flex gap-1 bg-muted rounded-lg p-1'>
              {MEDIA_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setMediaType(t.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    mediaType === t.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* User filter */}
          {allUsers.length > 0 && (
            <div className='flex flex-col gap-1.5'>
              <span className='text-xs text-muted-foreground font-medium'>Usuário</span>
              <select
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className='px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary'
              >
                <option value=''>Todos os usuários</option>
                {allUsers.map(u => (
                  <option key={u.userId} value={u.userId}>{u.userName}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Print header (only visible when printing) */}
      <div className='hidden print:block mb-4'>
        <h1 className='text-xl font-bold'>Analytics</h1>
        <p className='text-sm text-gray-500'>
          {appliedStart} até {appliedEnd}
          {mediaType ? ` · ${MEDIA_TYPES.find(t => t.value === mediaType)?.label}` : ''}
          {userId && allUsers.length > 0 ? ` · ${allUsers.find(u => u.userId === userId)?.userName}` : ''}
          {' · '}Gerado em {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      {loading ? (
        <div className='flex items-center justify-center h-64'>
          <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
        </div>
      ) : !data ? (
        <div className='text-center py-16 text-muted-foreground'>
          <BarChart2 className='w-8 h-8 mx-auto mb-2 text-muted-foreground/40' />
          <p>Erro ao carregar dados</p>
          {errorMsg && <p className='text-xs mt-2 font-mono text-red-400 max-w-md mx-auto break-words'>{errorMsg}</p>}
        </div>
      ) : (
        <>
          {/* Stat cards — 5 cards */}
          <div className='grid grid-cols-2 lg:grid-cols-5 gap-4'>
            <StatCard
              icon={<TrendingUp className='w-5 h-5 text-blue-400' />}
              label='Pedidos'
              value={data.totals.requests}
              sub={`${pct(data.totals.requestsDone, data.totals.requests)}% atendidos`}
              colorClass='bg-blue-500/10 border-blue-500/20'
              variation={prev ? calcVariation(data.totals.requests, prev.requests) : undefined}
            />
            <StatCard
              icon={<AlertTriangle className='w-5 h-5 text-red-400' />}
              label='Correções'
              value={data.totals.corrections}
              sub={`${pct(data.totals.correctionsDone, data.totals.corrections)}% resolvidas`}
              colorClass='bg-red-500/10 border-red-500/20'
              variation={prev ? calcVariation(data.totals.corrections, prev.corrections) : undefined}
            />
            <StatCard
              icon={<RefreshCw className='w-5 h-5 text-purple-400' />}
              label='Atualizações'
              value={data.totals.updates}
              sub={`${pct(data.totals.updatesDone, data.totals.updates)}% concluídas`}
              colorClass='bg-purple-500/10 border-purple-500/20'
              variation={prev ? calcVariation(data.totals.updates, prev.updates) : undefined}
            />
            <StatCard
              icon={<Film className='w-5 h-5 text-green-400' />}
              label='Títulos Cadastrados'
              value={data.totals.titles}
              sub='novos títulos no período'
              colorClass='bg-green-500/10 border-green-500/20'
              variation={prev ? calcVariation(data.totals.titles, prev.titles) : undefined}
            />
            <StatCard
              icon={<AlertTriangle className='w-5 h-5 text-yellow-400' />}
              label='Divergências Resolvidas'
              value={divData ? divData.resolverDivergencia + divData.resolverMapeamento : 0}
              sub={divData ? `${divData.resolverDivergencia} temp · ${divData.resolverMapeamento} mapeamento` : 'carregando...'}
              colorClass='bg-yellow-500/10 border-yellow-500/20'
            />
          </div>

          {/* Bar chart per user */}
          {data.byUser.length > 0 && (
            <div className='bg-card border border-border rounded-xl p-5'>
              <h2 className='font-semibold mb-4'>Atividade por Usuário</h2>
              <UserBarChart data={data.byUser} divByUser={divData?.byUser} />
            </div>
          )}

          {/* Line chart monthly */}
          {data.monthly.length > 1 && (
            <div className='bg-card border border-border rounded-xl p-5'>
              <h2 className='font-semibold mb-4'>Evolução Mensal</h2>
              <MonthlyLineChart data={data.monthly} />
            </div>
          )}

          {/* Per-user detail table */}
          {data.byUser.length > 0 ? (
            <div className='bg-card border border-border rounded-xl overflow-hidden'>
              <div className='p-5 border-b border-border'>
                <h2 className='font-semibold'>Detalhamento por Usuário</h2>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-border'>
                      <th className='text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Usuário</th>
                      <th className='text-center py-3 px-4 text-xs font-semibold text-blue-400 uppercase tracking-wider'>Pedidos</th>
                      <th className='text-center py-3 px-4 text-xs font-semibold text-red-400 uppercase tracking-wider hidden sm:table-cell'>Correções</th>
                      <th className='text-center py-3 px-4 text-xs font-semibold text-purple-400 uppercase tracking-wider hidden sm:table-cell'>Atualizações</th>
                      <th className='text-center py-3 px-4 text-xs font-semibold text-green-400 uppercase tracking-wider hidden md:table-cell'>Títulos</th>
                      <th className='text-center py-3 px-4 text-xs font-semibold text-yellow-400 uppercase tracking-wider hidden md:table-cell'>Divergências</th>
                      <th className='text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byUser.map(u => (
                      <tr key={u.userId} className='border-b border-border/50 hover:bg-secondary/30 transition-colors'>
                        <td className='py-3 px-4'>
                          <div className='flex items-center gap-3'>
                            <div className='w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0'>
                              {u.userName.charAt(0).toUpperCase()}
                            </div>
                            <span className='font-medium text-sm'>{u.userName}</span>
                          </div>
                        </td>
                        <td className='py-3 px-4 text-center'>
                          <div className='text-sm font-semibold'>{u.requests}</div>
                          {u.requests > 0 && (
                            <div className='text-xs text-muted-foreground'>{pct(u.requestsDone, u.requests)}% atend.</div>
                          )}
                        </td>
                        <td className='py-3 px-4 text-center hidden sm:table-cell'>
                          <div className='text-sm font-semibold'>{u.corrections}</div>
                          {u.corrections > 0 && (
                            <div className='text-xs text-muted-foreground'>{pct(u.correctionsDone, u.corrections)}% res.</div>
                          )}
                        </td>
                        <td className='py-3 px-4 text-center hidden sm:table-cell'>
                          <div className='text-sm font-semibold'>{u.updates}</div>
                          {u.updates > 0 && (
                            <div className='text-xs text-muted-foreground'>{pct(u.updatesDone, u.updates)}% conc.</div>
                          )}
                        </td>
                        <td className='py-3 px-4 text-center hidden md:table-cell'>
                          <div className='text-sm font-semibold'>{u.titles}</div>
                        </td>
                        <td className='py-3 px-4 text-center hidden md:table-cell'>
                          <div className='text-sm font-semibold text-yellow-400'>
                            {divData?.byUser?.[u.userId] ?? 0}
                          </div>
                        </td>
                        <td className='py-3 px-4 text-right'>
                          <span className='text-sm font-bold'>
                            {u.requests + u.corrections + u.updates + u.titles + (divData?.byUser?.[u.userId] ?? 0)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className='text-center py-16 text-muted-foreground'>
              <BarChart2 className='w-8 h-8 mx-auto mb-2 text-muted-foreground/40' />
              <p>Nenhuma atividade no período selecionado</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
