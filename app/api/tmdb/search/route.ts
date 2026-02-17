import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { searchTMDB } from '@/lib/tmdb'
import { rateLimit } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(`tmdb:${ip}`, 30, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { error } = await requireAuth()
  if (error) return error

  const query = req.nextUrl.searchParams.get('query') || ''
  const type = (req.nextUrl.searchParams.get('type') || 'multi') as 'movie' | 'tv' | 'multi'

  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 })

  try {
    const results = await searchTMDB(query, type)
    return NextResponse.json(results)
  } catch (e) {
    return NextResponse.json({ error: 'TMDB error' }, { status: 500 })
  }
}
