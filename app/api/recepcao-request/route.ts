import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const SYSTEM_USER_ID = 'a61ae843-85f5-4410-a856-f7448a8b7eb0'

export async function POST(req: Request) {
  const body = await req.json()
  const { title, type, posterUrl } = body

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
}