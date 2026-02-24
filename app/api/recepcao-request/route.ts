import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const SYSTEM_USER_ID = '97a1f24d-5035-4781-b11d-ebca229d8618'
const VALID_TYPES = ['MOVIE', 'TV']

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, type, posterUrl } = body
    if (VALID_TYPES.includes(type) === false) return NextResponse.json({ error: 'Tipo invalido' }, { status: 400 })

    const request = await prisma.request.create({
      data: {
        requestedTitle: title,
        type: type,
        posterUrl: posterUrl || null,
        requestedBy: 'Recepcao',
        status: 'ABERTO',
        isUpdate: false,
        createdById: SYSTEM_USER_ID
      }
    })

    return NextResponse.json({ ok: true, id: request.id })
  } catch (err) {
    console.error('Erro ao criar solicitacao:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}