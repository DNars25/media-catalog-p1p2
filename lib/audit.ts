import { prisma } from './db'

export async function logAudit(params: {
  entityType: string
  entityId: string
  action: string
  userId: string
  before?: unknown
  after?: unknown
}): Promise<void> {
  const before = params.before != null ? JSON.parse(JSON.stringify(params.before)) : undefined
  const after = params.after != null ? JSON.parse(JSON.stringify(params.after)) : undefined

  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId,
      before: before ?? undefined,
      after: after ?? undefined,
    },
  }).catch(() => {})
}
