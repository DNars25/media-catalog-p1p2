import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import { getAnalyticsData, Period } from '@/lib/analytics'

const VALID_PERIODS: Period[] = ['30d', '90d', '1y', 'all']

function pct(done: number, total: number) {
  if (!total) return '0%'
  return Math.round((done / total) * 100) + '%'
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const period = (req.nextUrl.searchParams.get('period') || '30d') as Period
  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const { byUser } = await getAnalyticsData(period)

  const header = [
    'Usuário',
    'Pedidos',
    'Pedidos Atendidos',
    '% Atendidos',
    'Correções',
    'Correções Resolvidas',
    '% Resolvidas',
    'Atualizações',
    'Atualizações Concluídas',
    '% Concluídas',
    'Títulos Cadastrados',
    'Total Atividades',
  ]

  const rows = byUser.map(u => [
    u.userName,
    u.requests,
    u.requestsDone,
    pct(u.requestsDone, u.requests),
    u.corrections,
    u.correctionsDone,
    pct(u.correctionsDone, u.corrections),
    u.updates,
    u.updatesDone,
    pct(u.updatesDone, u.updates),
    u.titles,
    u.requests + u.corrections + u.updates + u.titles,
  ])

  const csv = [header, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="analytics-${period}-${date}.csv"`,
    },
  })
}
