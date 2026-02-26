import { prisma } from '@/lib/db'
import { Prisma, TitleType } from '@prisma/client'

export type Period = '7d' | '30d' | '90d' | '6m' | '1y' | 'all'

function getSince(period: Period): Date | undefined {
  if (period === 'all') return undefined
  const d = new Date()
  if (period === '7d') d.setDate(d.getDate() - 7)
  else if (period === '30d') d.setDate(d.getDate() - 30)
  else if (period === '90d') d.setDate(d.getDate() - 90)
  else if (period === '6m') d.setMonth(d.getMonth() - 6)
  else if (period === '1y') d.setFullYear(d.getFullYear() - 1)
  return d
}

function getPreviousRange(period: Period): { since: Date; until: Date } | null {
  if (period === 'all') return null
  const until = getSince(period)!
  const since = new Date(until)
  if (period === '7d') since.setDate(since.getDate() - 7)
  else if (period === '30d') since.setDate(since.getDate() - 30)
  else if (period === '90d') since.setDate(since.getDate() - 90)
  else if (period === '6m') since.setMonth(since.getMonth() - 6)
  else if (period === '1y') since.setFullYear(since.getFullYear() - 1)
  return { since, until }
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
  previousTotals?: AnalyticsTotals
  byUser: UserStat[]
  allUsers: { userId: string; userName: string }[]
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

export async function getAnalyticsData(
  period: Period,
  userId?: string,
  mediaType?: string
): Promise<AnalyticsData> {
  const since = getSince(period)

  const requestFilter: Prisma.RequestWhereInput = {
    ...(since ? { createdAt: { gte: since } } : {}),
    ...(userId ? { createdById: userId } : {}),
    ...(mediaType ? { type: mediaType as TitleType } : {}),
  }

  const titleFilter: Prisma.TitleWhereInput = {
    ...(since ? { createdAt: { gte: since } } : {}),
    ...(userId ? { createdById: userId } : {}),
    ...(mediaType ? { type: mediaType as TitleType } : {}),
  }

  const [users, requestGroups, titleGroups] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.request.groupBy({
      by: ['createdById', 'isCorrection', 'isUpdate', 'status'],
      where: requestFilter,
      _count: { _all: true },
    }),
    prisma.title.groupBy({
      by: ['createdById'],
      where: titleFilter,
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

  // Previous period for variation cards
  let previousTotals: AnalyticsTotals | undefined
  const prevRange = getPreviousRange(period)
  if (prevRange) {
    const prevRequestFilter: Prisma.RequestWhereInput = {
      createdAt: { gte: prevRange.since, lt: prevRange.until },
      ...(userId ? { createdById: userId } : {}),
      ...(mediaType ? { type: mediaType as TitleType } : {}),
    }
    const prevTitleFilter: Prisma.TitleWhereInput = {
      createdAt: { gte: prevRange.since, lt: prevRange.until },
      ...(userId ? { createdById: userId } : {}),
      ...(mediaType ? { type: mediaType as TitleType } : {}),
    }
    const [prevGroups, prevTitlesCount] = await Promise.all([
      prisma.request.groupBy({
        by: ['isCorrection', 'isUpdate', 'status'],
        where: prevRequestFilter,
        _count: { _all: true },
      }),
      prisma.title.count({ where: prevTitleFilter }),
    ])
    const prev: AnalyticsTotals = {
      requests: 0, requestsDone: 0,
      corrections: 0, correctionsDone: 0,
      updates: 0, updatesDone: 0,
      titles: prevTitlesCount,
    }
    for (const g of prevGroups) {
      const count = g._count._all
      if (g.isCorrection) {
        prev.corrections += count
        if (g.status === 'CONCLUIDO') prev.correctionsDone += count
      } else if (g.isUpdate) {
        prev.updates += count
        if (g.status === 'CONCLUIDO') prev.updatesDone += count
      } else {
        prev.requests += count
        if (g.status === 'CONCLUIDO') prev.requestsDone += count
      }
    }
    previousTotals = prev
  }

  // Monthly chart data — capped at 24 months
  const chartSince = since ?? new Date(new Date().setMonth(new Date().getMonth() - 23))

  const reqWhere = [Prisma.sql`"createdAt" >= ${chartSince}`]
  if (userId) reqWhere.push(Prisma.sql`"createdById" = ${userId}`)
  if (mediaType) reqWhere.push(Prisma.sql`"type" = ${mediaType}::"TitleType"`)

  const titleWhere = [Prisma.sql`"createdAt" >= ${chartSince}`]
  if (userId) titleWhere.push(Prisma.sql`"createdById" = ${userId}`)
  if (mediaType) titleWhere.push(Prisma.sql`"type" = ${mediaType}::"TitleType"`)

  const [rawRequests, rawTitles] = await Promise.all([
    prisma.$queryRaw<RawMonthReqRow[]>(Prisma.sql`
      SELECT to_char("createdAt", 'YYYY-MM') as ym,
             "isCorrection", "isUpdate",
             count(*)::int as cnt
      FROM "Request"
      WHERE ${Prisma.join(reqWhere, ' AND ')}
      GROUP BY to_char("createdAt", 'YYYY-MM'), "isCorrection", "isUpdate"
      ORDER BY to_char("createdAt", 'YYYY-MM')
    `),
    prisma.$queryRaw<RawMonthTitleRow[]>(Prisma.sql`
      SELECT to_char("createdAt", 'YYYY-MM') as ym,
             count(*)::int as cnt
      FROM "Title"
      WHERE ${Prisma.join(titleWhere, ' AND ')}
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

  const allUsers = users.map(u => ({ userId: u.id, userName: u.name }))

  return { period, totals, previousTotals, byUser, allUsers, monthly }
}
