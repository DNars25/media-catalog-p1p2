import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const body = await req.json()
  const { title, type, posterUrl, year } = body

  const request = await prisma.request.create({
    data: {
      requestedTitle: title,
      type: type,
      posterUrl: posterUrl || null,
      requestedBy: 'Recepção',
      status: 'ABERTO',
      isUpdate: false
    }
  })

  return NextResponse.json({ ok: true, id: request.id })
}