'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { BarChart2, Download, Loader2, TrendingUp, AlertTriangle, RefreshCw, Film } from 'lucide-react'
import type { AnalyticsData, Period } from '@/lib/analytics'

const UserBarChart = dynamic(
  () => import('./analytics-charts').then(m => m.UserBarChart),
  { ssr: false, loading: () => <div className='h-[280px] flex items-center justify-center text-muted-foreground text-sm'>Carregando gráfico...</div> }
)
const MonthlyLineChart = dynamic(
  () => import('./analytics-charts').then(m => m.MonthlyLineChart),
  { ssr: false, loading: () => <div className='h-[280px] flex items-center justify-center text-muted-foreground text-sm'>Carregando gráfico...</div> }
)

const PERIODS: { value: Period; label: string }[] = [
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '1y', label: '1 ano' },
  { value: 'all', label: 'Tudo' },
]

function pct(done: number, total: number) {
  if (!total) return '0'
  return Math.round((done / total) * 100).toString()
}

function StatCard({ icon, label, value, sub, colorClass }: {
  icon: React.ReactNode
  label: string
  value: number
  sub: string
  colorClass: string
}) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className='flex items-center gap-2 mb-2'>
        {icon}
        <span className='text-sm font-medium text-muted-foreground'>{label}</span>
      </div>
      <p className='text-3xl font-bold'>{value.toLocaleString('pt-BR')}</p>
      <p className='text-xs text-muted-foreground mt-1'>{sub}</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [period, setPeriod] = useState<Period>('30d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) router.replace('/dashboard')
  }, [status, isAdmin, router])

  const fetchData = useCallback(() => {
    setLoading(true)
    fetch('/api/analytics?period=' + period)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  function handleExport() {
    setExporting(true)
    const a = document.createElement('a')
    a.href = '/api/analytics/export?period=' + period
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

  return (
    <div className='p-4 sm:p-6 space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center gap-4 justify-between'>
        <div>
          <h1 className='text-2xl font-bold flex items-center gap-2'>
            <BarChart2 className='w-6 h-6 text-primary' />
            Analytics
          </h1>
          <p className='text-muted-foreground text-sm mt-1'>Atividade dos usuários no sistema</p>
        </div>
        <div className='flex items-center gap-3 flex-wrap'>
          <div className='flex gap-1 bg-muted rounded-lg p-1'>
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  period === p.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || loading || !data}
            className='flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition text-sm font-medium disabled:opacity-50'
          >
            {exporting
              ? <Loader2 className='w-4 h-4 animate-spin' />
              : <Download className='w-4 h-4' />}
            Exportar CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center h-64'>
          <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
        </div>
      ) : !data ? (
        <div className='text-center py-16 text-muted-foreground'>
          <BarChart2 className='w-8 h-8 mx-auto mb-2 text-muted-foreground/40' />
          <p>Erro ao carregar dados</p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            <StatCard
              icon={<TrendingUp className='w-5 h-5 text-blue-400' />}
              label='Pedidos'
              value={data.totals.requests}
              sub={`${pct(data.totals.requestsDone, data.totals.requests)}% atendidos`}
              colorClass='bg-blue-500/10 border-blue-500/20'
            />
            <StatCard
              icon={<AlertTriangle className='w-5 h-5 text-red-400' />}
              label='Correções'
              value={data.totals.corrections}
              sub={`${pct(data.totals.correctionsDone, data.totals.corrections)}% resolvidas`}
              colorClass='bg-red-500/10 border-red-500/20'
            />
            <StatCard
              icon={<RefreshCw className='w-5 h-5 text-purple-400' />}
              label='Atualizações'
              value={data.totals.updates}
              sub={`${pct(data.totals.updatesDone, data.totals.updates)}% concluídas`}
              colorClass='bg-purple-500/10 border-purple-500/20'
            />
            <StatCard
              icon={<Film className='w-5 h-5 text-green-400' />}
              label='Títulos Cadastrados'
              value={data.totals.titles}
              sub='novos títulos no período'
              colorClass='bg-green-500/10 border-green-500/20'
            />
          </div>

          {/* Bar chart per user */}
          {data.byUser.length > 0 && (
            <div className='bg-card border border-border rounded-xl p-5'>
              <h2 className='font-semibold mb-4'>Atividade por Usuário</h2>
              <UserBarChart data={data.byUser} />
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
                        <td className='py-3 px-4 text-right'>
                          <span className='text-sm font-bold'>
                            {u.requests + u.corrections + u.updates + u.titles}
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
