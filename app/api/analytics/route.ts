import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import { getAnalyticsData, Period } from '@/lib/analytics'

const VALID_PERIODS: Period[] = ['30d', '90d', '1y', 'all']

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const period = (req.nextUrl.searchParams.get('period') || '30d') as Period
  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const data = await getAnalyticsData(period)
  return NextResponse.json(data)
}
