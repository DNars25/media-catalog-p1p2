import { prisma } from '@/lib/db'

export async function createNotification(type: 'PEDIDO' | 'CORRECAO', title: string, body: string) {
  await prisma.notification.create({ data: { type, title, body } }).catch(() => {})
}
