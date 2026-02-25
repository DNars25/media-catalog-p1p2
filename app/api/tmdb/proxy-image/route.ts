import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const imageUrl = req.nextUrl.searchParams.get('url')
  if (!imageUrl || !imageUrl.startsWith('https://image.tmdb.org/')) {
    return new NextResponse('URL inválida', { status: 400 })
  }

  const res = await fetch(imageUrl)
  if (!res.ok) return new NextResponse('Imagem não encontrada', { status: 404 })

  const buffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'image/jpeg'

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'attachment; filename="cover.jpg"',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
