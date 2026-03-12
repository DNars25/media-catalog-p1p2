import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import { getAnalyticsData } from '@/lib/analytics'

function defaultRange(): { startDate: Date; endDate: Date } {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  return { startDate, endDate }
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const startParam = sp.get('startDate')
  const endParam = sp.get('endDate')
  const userId = sp.get('userId') || undefined
  const mediaType = sp.get('mediaType') || undefined

  let startDate: Date
  let endDate: Date

  if (startParam && endParam) {
    startDate = new Date(startParam)
    endDate = new Date(endParam)
    endDate.setHours(23, 59, 59, 999)
  } else {
    const def = defaultRange()
    startDate = def.startDate
    endDate = def.endDate
  }

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  try {
    const data = await getAnalyticsData(startDate, endDate, userId, mediaType)
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
