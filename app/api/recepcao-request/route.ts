import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { sendPublicRequestCreated } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { RecepcaoRequestSchema } from '@/lib/validators'
import { getSystemUserId } from '@/lib/system-user'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!checkRateLimit(`recepcao:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: 'Muitas solicitações. Tente novamente em 10 minutos.' }, { status: 429 })
  }
  try {
    const body = await req.json()
    const parsed = RecepcaoRequestSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { title, type, posterUrl, tmdbId, notes, isUpdate } = parsed.data

    const systemUserId = await getSystemUserId()
    if (!systemUserId) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 })

    const request = await prisma.request.create({
      data: {
        requestedTitle: title,
        type: type,
        posterUrl: posterUrl ?? null,
        tmdbId: tmdbId ?? null,
        notes: notes ?? null,
        requestedBy: 'Vitrine',
        status: 'ABERTO',
        isUpdate: isUpdate ?? false,
        source: 'VITRINE',
        createdById: systemUserId
      }
    })

    logAudit({ entityType: 'Request', entityId: request.id, action: 'CREATE_PUBLIC', userId: systemUserId, after: request })
    createNotification(
      'PEDIDO',
      `Novo pedido: ${title}`,
      `${type === 'MOVIE' ? 'Filme' : 'Série'} solicitado via Vitrine`
    )

    const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, select: { email: true } })
    sendPublicRequestCreated({
      adminEmails: admins.map(a => a.email),
      requestTitle: title,
      source: 'Vitrine',
      type,
    })

    return NextResponse.json({ ok: true, id: request.id })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
