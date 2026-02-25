import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const VALID_TYPES = ['MOVIE', 'TV']

async function getSystemUserId(): Promise<string | null> {
  if (process.env.RECEPCAO_USER_ID) return process.env.RECEPCAO_USER_ID
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } })
  return admin?.id ?? null
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, type, posterUrl } = body
    if (VALID_TYPES.includes(type) === false) return NextResponse.json({ error: 'Tipo invalido' }, { status: 400 })

    const systemUserId = await getSystemUserId()
    if (!systemUserId) return NextResponse.json({ error: 'Servico indisponivel' }, { status: 503 })

    const request = await prisma.request.create({
      data: {
        requestedTitle: title,
        type: type,
        posterUrl: posterUrl || null,
        requestedBy: 'Vitrine',
        status: 'ABERTO',
        isUpdate: false,
        createdById: systemUserId
      }
    })

    return NextResponse.json({ ok: true, id: request.id })
  } catch (err) {
    console.error('Erro ao criar solicitacao:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}