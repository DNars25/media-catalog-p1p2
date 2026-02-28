import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { sendPublicRequestCreated } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

const VALID_TYPES = ['MOVIE', 'TV']

async function getSystemUserId(): Promise<string | null> {
  if (process.env.RECEPCAO_USER_ID) return process.env.RECEPCAO_USER_ID
  const user = await prisma.user.findFirst({ where: { name: 'Vitrine' }, select: { id: true } })
  return user?.id ?? null
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, type, posterUrl, tmdbId } = body
    if (VALID_TYPES.includes(type) === false) return NextResponse.json({ error: 'Tipo invalido' }, { status: 400 })

    const systemUserId = await getSystemUserId()
    if (!systemUserId) return NextResponse.json({ error: 'Servico indisponivel' }, { status: 503 })

    const request = await prisma.request.create({
      data: {
        requestedTitle: title,
        type: type,
        posterUrl: posterUrl || null,
        tmdbId: typeof tmdbId === 'number' ? tmdbId : null,
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

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } })
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