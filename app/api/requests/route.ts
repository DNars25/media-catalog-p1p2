import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const search = sp.get('search') || ''
  const status = sp.get('status') || ''
  const type = sp.get('type') || ''
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const limit = Math.min(50, parseInt(sp.get('limit') || '20'))
  const skip = (page - 1) * limit

  const where: any = {}
  if (search) where.requestedTitle = { contains: search, mode: 'insensitive' }
  if (status) where.status = status
  if (type) where.type = type
  const isUpdate = sp.get("isUpdate")
  if (isUpdate === "true") where.isUpdate = true
  if (isUpdate === "false") where.isUpdate = false

  const [total, requests] = await Promise.all([
    prisma.request.count({ where }),
    prisma.request.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        createdBy: { select: { name: true, email: true } },
        linkedTitle: { select: { id: true, title: true } },
      },
    }),
  ])

  return NextResponse.json({ requests, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { requestedTitle, type, notes, preferredSystem, tmdbId, posterUrl, isUpdate, seasonNumber, audioType } = body

  if (!requestedTitle) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

  const request = await prisma.request.create({
    data: {
      requestedTitle,
      type: type || 'MOVIE',
      notes: notes || null,
      preferredSystem: preferredSystem || null,
      tmdbId: tmdbId || null,
      posterUrl: posterUrl || null,
      isUpdate: isUpdate || false,
      seasonNumber: seasonNumber || null,
      audioType: audioType || null,
      createdById: session!.user.id,
    },
  })
  return NextResponse.json(request, { status: 201 })
}