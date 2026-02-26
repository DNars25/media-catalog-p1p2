import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/rbac'
import { UserUpdateSchema } from '@/lib/validators'
import bcrypt from 'bcryptjs'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSuperAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = UserUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { password, email, ...rest } = parsed.data
  const data: { name?: string; email?: string; role?: 'SUPER_ADMIN' | 'ADMIN' | 'USER'; passwordHash?: string } = { ...rest }
  if (email && email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } })
    if (emailTaken) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    data.email = email
  }
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 12)
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  logAudit({ entityType: 'User', entityId: user.id, action: 'UPDATE', userId: session!.user.id, before: existing, after: user })

  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSuperAdmin()
  if (error) return error

  const existing = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.user.delete({ where: { id: params.id } })
  logAudit({ entityType: 'User', entityId: params.id, action: 'DELETE', userId: session!.user.id, before: existing })

  return NextResponse.json({ success: true })
}
