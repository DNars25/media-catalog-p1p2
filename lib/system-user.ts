import { prisma } from '@/lib/db'

export async function getSystemUserId(): Promise<string | null> {
  if (process.env.RECEPCAO_USER_ID) return process.env.RECEPCAO_USER_ID
  const user = await prisma.user.findFirst({ where: { name: 'Vitrine' }, select: { id: true } })
  return user?.id ?? null
}
