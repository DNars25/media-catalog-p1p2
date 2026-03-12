import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const startParam = sp.get('startDate');
  const endParam = sp.get('endDate');

  let dateFilter: { createdAt?: { gte?: Date; lte?: Date } } = {};

  if (startParam && endParam) {
    const startDate = new Date(startParam);
    const endDate = new Date(endParam);
    endDate.setHours(23, 59, 59, 999);
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      dateFilter = { createdAt: { gte: startDate, lte: endDate } };
    }
  } else {
    // Default: last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 30);
    dateFilter = { createdAt: { gte: since } };
  }

  const [resolverDivergencia, resolverMapeamento, auditGroups] = await Promise.all([
    prisma.auditLog.count({
      where: { action: 'RESOLVER_DIVERGENCIA', ...dateFilter },
    }),
    prisma.auditLog.count({
      where: { action: 'RESOLVER_MAPEAMENTO', ...dateFilter },
    }),
    prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        action: { in: ['RESOLVER_DIVERGENCIA', 'RESOLVER_MAPEAMENTO'] },
        ...dateFilter,
      },
      _count: { _all: true },
    }),
  ]);

  const byUser: Record<string, number> = {};
  for (const g of auditGroups) {
    byUser[g.userId] = g._count._all;
  }

  return NextResponse.json({ resolverDivergencia, resolverMapeamento, byUser });
}
