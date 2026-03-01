import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { Prisma, TitleType, PreferredSystem, RequestStatus } from '@prisma/client'
import { logAudit } from '@/lib/audit'
import { sendPublicRequestCreated } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { CorrecoesCreateSchema } from '@/lib/validators'
import { getSystemUserId } from '@/lib/system-user'

// GET — lista correções (requer autenticação)
export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const sp = req.nextUrl.searchParams
    const status = sp.get('status') || ''
    const page = Math.max(1, parseInt(sp.get('page') || '1'))
    const limit = Math.min(50, parseInt(sp.get('limit') || '20'))
    const skip = (page - 1) * limit

    const where: Prisma.RequestWhereInput = { isCorrection: true }
    if (status) where.status = status as RequestStatus

    const [total, corrections] = await Promise.all([
      prisma.request.count({ where }),
      prisma.request.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { createdBy: { select: { name: true, email: true } } },
      }),
    ])

    return NextResponse.json({
      corrections,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST — cria correção (público, via vitrine)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = CorrecoesCreateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { title, type, tmdbId, posterUrl, server, notes, seasonNumber, episodeNotes } = parsed.data

    const systemUserId = await getSystemUserId()
    if (!systemUserId) {
      return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 })
    }

    // Monta descrição do problema
    let fullNotes = `Problema: ${notes}`
    if (server) fullNotes += `\nServidor: ${server}`
    if (type === 'TV' && seasonNumber) {
      fullNotes += `\nTemporada: ${seasonNumber}`
      if (episodeNotes) fullNotes += `\nEpisódios: ${episodeNotes}`
    }

    // Resolve preferredSystem para o enum do banco (P1/P2/AMBOS)
    const systemMap: Record<string, PreferredSystem> = { B2P: 'P1', P2B: 'P2', Ambos: 'AMBOS' }
    const preferredSystem: PreferredSystem | null = server ? (systemMap[server] ?? null) : null

    // Tenta linkar ao título existente no catálogo
    let linkedTitleId: string | null = null
    if (tmdbId) {
      const existing = await prisma.title.findUnique({
        where: { tmdbId_type: { tmdbId, type: type as TitleType } },
        select: { id: true },
      })
      if (existing) linkedTitleId = existing.id
    }

    const correction = await prisma.request.create({
      data: {
        requestedTitle: title,
        type: type as TitleType,
        tmdbId: tmdbId ?? null,
        posterUrl: posterUrl ?? null,
        requestedBy: 'Vitrine',
        status: 'ABERTO',
        isUpdate: false,
        isCorrection: true,
        notes: fullNotes,
        seasonNumber: seasonNumber ?? null,
        preferredSystem,
        linkedTitleId,
        createdById: systemUserId,
      },
    })

    logAudit({ entityType: 'Request', entityId: correction.id, action: 'CREATE_CORRECTION', userId: systemUserId, after: correction })
    createNotification(
      'CORRECAO',
      `Correção reportada: ${title}`,
      `${type === 'MOVIE' ? 'Filme' : 'Série'} reportado via Vitrine`
    )

    const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, select: { email: true } })
    sendPublicRequestCreated({
      adminEmails: admins.map(a => a.email),
      requestTitle: title,
      source: 'Correção',
      type,
    })

    return NextResponse.json({ ok: true, id: correction.id })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
