import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { sendPublicRequestCreated } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { RecepcaoRequestSchema } from '@/lib/validators'
import { getSystemUserId } from '@/lib/system-user'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = RecepcaoRequestSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { title, type, posterUrl, tmdbId } = parsed.data

    const systemUserId = await getSystemUserId()
    if (!systemUserId) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 })

    const request = await prisma.request.create({
      data: {
        requestedTitle: title,
        type: type,
        posterUrl: posterUrl ?? null,
        tmdbId: tmdbId ?? null,
        requestedBy: 'Vitrine',
        status: 'ABERTO',
        isUpdate: false,
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
