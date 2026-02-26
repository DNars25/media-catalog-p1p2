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

  const userId = req.nextUrl.searchParams.get('userId') || undefined
  const mediaType = req.nextUrl.searchParams.get('mediaType') || undefined

  try {
    const data = await getAnalyticsData(period, userId, mediaType)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[analytics]', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
