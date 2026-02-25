import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { put } from '@vercel/blob'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024

export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }
  const uid = session.user.id

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Tipo nao permitido' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Arquivo muito grande' }, { status: 400 })

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filename = `avatars/${uid}-${Date.now()}.${ext}`

  try {
    const blob = await put(filename, file, { access: 'public', addRandomSuffix: false, allowOverwrite: true })
    await prisma.user.update({ where: { id: uid }, data: { image: blob.url } })
    return NextResponse.json({ url: blob.url })
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar arquivo' }, { status: 500 })
  }
}
