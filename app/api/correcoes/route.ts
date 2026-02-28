import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/rbac'
import { Prisma, TitleType, PreferredSystem, RequestStatus } from '@prisma/client'
import { logAudit } from '@/lib/audit'
import { sendPublicRequestCreated } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

async function getSystemUserId(): Promise<string | null> {
  if (process.env.RECEPCAO_USER_ID) return process.env.RECEPCAO_USER_ID
  const user = await prisma.user.findFirst({ where: { name: 'Vitrine' }, select: { id: true } })
  return user?.id ?? null
}

// GET — lista correções (requer autenticação)
export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

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
}

// POST — cria correção (público, via vitrine)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, type, tmdbId, posterUrl, server, notes, seasonNumber, episodeNotes } = body

    if (!['MOVIE', 'TV'].includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }
    if (!title || !notes) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }
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
        where: { tmdbId_type: { tmdbId: parseInt(tmdbId), type: type as TitleType } },
        select: { id: true },
      })
      if (existing) linkedTitleId = existing.id
    }

    const correction = await prisma.request.create({
      data: {
        requestedTitle: title,
        type: type as TitleType,
        tmdbId: tmdbId ? parseInt(tmdbId) : null,
        posterUrl: posterUrl || null,
        requestedBy: 'Vitrine',
        status: 'ABERTO',
        isUpdate: false,
        isCorrection: true,
        notes: fullNotes,
        seasonNumber: seasonNumber ? parseInt(seasonNumber) : null,
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

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } })
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
