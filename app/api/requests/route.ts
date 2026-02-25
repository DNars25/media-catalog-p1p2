import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { findRequestIdsByText } from '@/lib/search'
import { RequestCreateSchema } from '@/lib/validators'
import { Prisma, RequestStatus } from '@prisma/client'

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

  const where: Prisma.RequestWhereInput = { isCorrection: false }
  if (search) {
    const ids = await findRequestIdsByText(search)
    where.id = { in: ids }
  }
  if (status) where.status = status as RequestStatus
  if (type) where.type = type as Prisma.EnumTitleTypeFilter
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
  const parsed = RequestCreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { requestedTitle, type, notes, preferredSystem, tmdbId, posterUrl, isUpdate, seasonNumber, audioType, linkedTitleId } = parsed.data

  const request = await prisma.request.create({
    data: {
      requestedTitle,
      type,
      notes: notes ?? null,
      preferredSystem: preferredSystem ?? null,
      tmdbId: tmdbId ?? null,
      posterUrl: posterUrl ?? null,
      isUpdate,
      seasonNumber: seasonNumber ?? null,
      audioType: audioType ?? null,
      linkedTitleId: linkedTitleId ?? null,
      createdById: session!.user.id,
    },
  })
  return NextResponse.json(request, { status: 201 })
}