import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/rbac'
import { UserCreateSchema } from '@/lib/validators'
import bcrypt from 'bcryptjs'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const limit = Math.min(50, parseInt(sp.get('limit') || '20'))
  const skip = (page - 1) * limit

  const [total, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      skip, take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, username: true, email: true, role: true, createdAt: true },
    }),
  ])

  return NextResponse.json({ users, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireSuperAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = UserCreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const existingUsername = await prisma.user.findUnique({ where: { username: parsed.data.username } })
  if (existingUsername) return NextResponse.json({ error: 'Username already exists' }, { status: 409 })

  const user = await prisma.user.create({
    data: { name: parsed.data.name, username: parsed.data.username, email: parsed.data.email, passwordHash, role: parsed.data.role },
    select: { id: true, name: true, username: true, email: true, role: true, createdAt: true },
  })

  logAudit({ entityType: 'User', entityId: user.id, action: 'CREATE', userId: session!.user.id, after: user })

  return NextResponse.json(user, { status: 201 })
}
