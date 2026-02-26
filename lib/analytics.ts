import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export type Period = '30d' | '90d' | '1y' | 'all'

function getSince(period: Period): Date | undefined {
  if (period === 'all') return undefined
  const d = new Date()
  if (period === '30d') d.setDate(d.getDate() - 30)
  else if (period === '90d') d.setDate(d.getDate() - 90)
  else if (period === '1y') d.setFullYear(d.getFullYear() - 1)
  return d
}

export interface UserStat {
  userId: string
  userName: string
  requests: number
  requestsDone: number
  corrections: number
  correctionsDone: number
  updates: number
  updatesDone: number
  titles: number
}

export interface MonthlyPoint {
  month: string
  requests: number
  corrections: number
  updates: number
  titles: number
}

export interface AnalyticsTotals {
  requests: number
  requestsDone: number
  corrections: number
  correctionsDone: number
  updates: number
  updatesDone: number
  titles: number
}

export interface AnalyticsData {
  period: Period
  totals: AnalyticsTotals
  byUser: UserStat[]
  monthly: MonthlyPoint[]
}

type RawMonthReqRow = {
  ym: string
  isCorrection: boolean
  isUpdate: boolean
  cnt: number
}

type RawMonthTitleRow = {
  ym: string
  cnt: number
}

export async function getAnalyticsData(period: Period): Promise<AnalyticsData> {
  const since = getSince(period)
  const dateFilter: Prisma.RequestWhereInput = since ? { createdAt: { gte: since } } : {}
  const titleDateFilter: Prisma.TitleWhereInput = since ? { createdAt: { gte: since } } : {}

  const [users, requestGroups, titleGroups] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.request.groupBy({
      by: ['createdById', 'isCorrection', 'isUpdate', 'status'],
      where: dateFilter,
      _count: { _all: true },
    }),
    prisma.title.groupBy({
      by: ['createdById'],
      where: titleDateFilter,
      _count: { _all: true },
    }),
  ])

  const statsMap = new Map<string, UserStat>()
  for (const u of users) {
    statsMap.set(u.id, {
      userId: u.id,
      userName: u.name,
      requests: 0, requestsDone: 0,
      corrections: 0, correctionsDone: 0,
      updates: 0, updatesDone: 0,
      titles: 0,
    })
  }

  for (const g of requestGroups) {
    const s = statsMap.get(g.createdById)
    if (!s) continue
    const count = g._count._all
    if (g.isCorrection) {
      s.corrections += count
      if (g.status === 'CONCLUIDO') s.correctionsDone += count
    } else if (g.isUpdate) {
      s.updates += count
      if (g.status === 'CONCLUIDO') s.updatesDone += count
    } else {
      s.requests += count
      if (g.status === 'CONCLUIDO') s.requestsDone += count
    }
  }

  for (const g of titleGroups) {
    const s = statsMap.get(g.createdById)
    if (s) s.titles += g._count._all
  }

  const byUser = Array.from(statsMap.values())
    .filter(s => s.requests > 0 || s.corrections > 0 || s.updates > 0 || s.titles > 0)
    .sort((a, b) =>
      (b.requests + b.corrections + b.updates + b.titles) -
      (a.requests + a.corrections + a.updates + a.titles)
    )

  const totals: AnalyticsTotals = {
    requests: byUser.reduce((acc, u) => acc + u.requests, 0),
    requestsDone: byUser.reduce((acc, u) => acc + u.requestsDone, 0),
    corrections: byUser.reduce((acc, u) => acc + u.corrections, 0),
    correctionsDone: byUser.reduce((acc, u) => acc + u.correctionsDone, 0),
    updates: byUser.reduce((acc, u) => acc + u.updates, 0),
    updatesDone: byUser.reduce((acc, u) => acc + u.updatesDone, 0),
    titles: byUser.reduce((acc, u) => acc + u.titles, 0),
  }

  // Monthly chart data — capped at 24 months
  const chartSince = since ?? new Date(new Date().setMonth(new Date().getMonth() - 23))

  const [rawRequests, rawTitles] = await Promise.all([
    prisma.$queryRaw<RawMonthReqRow[]>(Prisma.sql`
      SELECT to_char("createdAt", 'YYYY-MM') as ym,
             "isCorrection", "isUpdate",
             count(*)::int as cnt
      FROM "Request"
      WHERE "createdAt" >= ${chartSince}
      GROUP BY to_char("createdAt", 'YYYY-MM'), "isCorrection", "isUpdate"
      ORDER BY to_char("createdAt", 'YYYY-MM')
    `),
    prisma.$queryRaw<RawMonthTitleRow[]>(Prisma.sql`
      SELECT to_char("createdAt", 'YYYY-MM') as ym,
             count(*)::int as cnt
      FROM "Title"
      WHERE "createdAt" >= ${chartSince}
      GROUP BY to_char("createdAt", 'YYYY-MM')
      ORDER BY to_char("createdAt", 'YYYY-MM')
    `),
  ])

  const monthlyMap = new Map<string, MonthlyPoint>()
  const ensureMonth = (ym: string) => {
    if (!monthlyMap.has(ym)) {
      const [year, month] = ym.split('-')
      const d = new Date(parseInt(year), parseInt(month) - 1)
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      monthlyMap.set(ym, { month: label, requests: 0, corrections: 0, updates: 0, titles: 0 })
    }
    return monthlyMap.get(ym)!
  }

  for (const r of rawRequests) {
    const m = ensureMonth(r.ym)
    const cnt = Number(r.cnt)
    if (r.isCorrection) m.corrections += cnt
    else if (r.isUpdate) m.updates += cnt
    else m.requests += cnt
  }

  for (const r of rawTitles) {
    const m = ensureMonth(r.ym)
    m.titles += Number(r.cnt)
  }

  const monthly = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => v)

  return { period, totals, byUser, monthly }
}
