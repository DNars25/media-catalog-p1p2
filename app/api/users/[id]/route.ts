import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/rbac'
import { UserUpdateSchema } from '@/lib/validators'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = UserUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { password, ...rest } = parsed.data
  const data: { name?: string; role?: 'ADMIN' | 'USER'; passwordHash?: string } = { ...rest }
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 12)
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
