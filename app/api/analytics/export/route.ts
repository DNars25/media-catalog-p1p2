import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import { getAnalyticsData } from '@/lib/analytics'
import * as XLSX from 'xlsx'

function pct(done: number, total: number) {
  if (!total) return '0%'
  return Math.round((done / total) * 100) + '%'
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const startParam = sp.get('startDate')
  const endParam = sp.get('endDate')
  const format = sp.get('format') || 'csv'
  const userId = sp.get('userId') || undefined
  const mediaType = sp.get('mediaType') || undefined

  let startDate: Date
  let endDate: Date

  if (startParam && endParam) {
    startDate = new Date(startParam)
    endDate = new Date(endParam)
    endDate.setHours(23, 59, 59, 999)
  } else {
    endDate = new Date()
    startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
  }

  const { byUser, monthly, totals } = await getAnalyticsData(startDate, endDate, userId, mediaType)
  const date = new Date().toISOString().slice(0, 10)
  const rangeLabel = `${startDate.toISOString().slice(0, 10)}_${endDate.toISOString().slice(0, 10)}`

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new()

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

    const monthHeader = ['Mês', 'Pedidos', 'Correções', 'Atualizações', 'Títulos']
    const monthRows = monthly.map(m => [m.month, m.requests, m.corrections, m.updates, m.titles])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([monthHeader, ...monthRows]), 'Mensal')

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
        'Content-Disposition': `attachment; filename="analytics-${rangeLabel}-${date}.xlsx"`,
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
      'Content-Disposition': `attachment; filename="analytics-${rangeLabel}-${date}.csv"`,
    },
  })
}
