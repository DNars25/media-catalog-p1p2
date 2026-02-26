import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import { getAnalyticsData, Period } from '@/lib/analytics'
import * as XLSX from 'xlsx'

const VALID_PERIODS: Period[] = ['7d', '30d', '90d', '6m', '1y', 'all']

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

  const format = req.nextUrl.searchParams.get('format') || 'csv'
  const userId = req.nextUrl.searchParams.get('userId') || undefined
  const mediaType = req.nextUrl.searchParams.get('mediaType') || undefined

  const { byUser, monthly, totals } = await getAnalyticsData(period, userId, mediaType)
  const date = new Date().toISOString().slice(0, 10)

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Por Usuário
    const userHeader = [
      'Usuário', 'Pedidos', 'Pedidos Atendidos', '% Atendidos',
      'Correções', 'Correções Resolvidas', '% Resolvidas',
      'Atualizações', 'Atualizações Concluídas', '% Concluídas',
      'Títulos Cadastrados', 'Total',
    ]
    const userRows = byUser.map(u => [
      u.userName, u.requests, u.requestsDone, pct(u.requestsDone, u.requests),
      u.corrections, u.correctionsDone, pct(u.correctionsDone, u.corrections),
      u.updates, u.updatesDone, pct(u.updatesDone, u.updates),
      u.titles, u.requests + u.corrections + u.updates + u.titles,
    ])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([userHeader, ...userRows]), 'Por Usuário')

    // Sheet 2: Evolução Mensal
    const monthHeader = ['Mês', 'Pedidos', 'Correções', 'Atualizações', 'Títulos']
    const monthRows = monthly.map(m => [m.month, m.requests, m.corrections, m.updates, m.titles])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([monthHeader, ...monthRows]), 'Mensal')

    // Sheet 3: Totais
    const totaisRows = [
      ['Métrica', 'Total', 'Concluídos', '% Conclusão'],
      ['Pedidos', totals.requests, totals.requestsDone, pct(totals.requestsDone, totals.requests)],
      ['Correções', totals.corrections, totals.correctionsDone, pct(totals.correctionsDone, totals.corrections)],
      ['Atualizações', totals.updates, totals.updatesDone, pct(totals.updatesDone, totals.updates)],
      ['Títulos Cadastrados', totals.titles, '', ''],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(totaisRows), 'Totais')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="analytics-${period}-${date}.xlsx"`,
      },
    })
  }

  // Default: CSV
  const header = [
    'Usuário', 'Pedidos', 'Pedidos Atendidos', '% Atendidos',
    'Correções', 'Correções Resolvidas', '% Resolvidas',
    'Atualizações', 'Atualizações Concluídas', '% Concluídas',
    'Títulos Cadastrados', 'Total Atividades',
  ]
  const rows = byUser.map(u => [
    u.userName, u.requests, u.requestsDone, pct(u.requestsDone, u.requests),
    u.corrections, u.correctionsDone, pct(u.correctionsDone, u.corrections),
    u.updates, u.updatesDone, pct(u.updatesDone, u.updates),
    u.titles, u.requests + u.corrections + u.updates + u.titles,
  ])
  const csv = [header, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="analytics-${period}-${date}.csv"`,
    },
  })
}
