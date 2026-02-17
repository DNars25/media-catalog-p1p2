import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { getTMDBDetails } from '@/lib/tmdb'
import { rateLimit } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(`tmdb:${ip}`, 30, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { error } = await requireAuth()
  if (error) return error

  const type = req.nextUrl.searchParams.get('type') as 'movie' | 'tv'
  const tmdbId = parseInt(req.nextUrl.searchParams.get('tmdbId') || '')

  if (!type || !tmdbId) return NextResponse.json({ error: 'type and tmdbId required' }, { status: 400 })

  try {
    const result = await getTMDBDetails(type, tmdbId)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: 'TMDB error' }, { status: 500 })
  }
}
