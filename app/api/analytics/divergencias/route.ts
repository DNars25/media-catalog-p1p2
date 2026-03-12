import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Period } from '@/lib/analytics';

function getSince(period: Period): Date | undefined {
  if (period === 'all') return undefined;
  const d = new Date();
  if (period === '7d') d.setDate(d.getDate() - 7);
  else if (period === '30d') d.setDate(d.getDate() - 30);
  else if (period === '90d') d.setDate(d.getDate() - 90);
  else if (period === '6m') d.setMonth(d.getMonth() - 6);
  else if (period === '1y') d.setFullYear(d.getFullYear() - 1);
  return d;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const period = (new URL(req.url).searchParams.get('period') ?? '30d') as Period;
  const since = getSince(period);
  const dateFilter = since ? { createdAt: { gte: since } } : {};

  const [resolverDivergencia, resolverMapeamento] = await Promise.all([
    prisma.auditLog.count({
      where: { action: 'RESOLVER_DIVERGENCIA', ...dateFilter },
    }),
    prisma.auditLog.count({
      where: { action: 'RESOLVER_MAPEAMENTO', ...dateFilter },
    }),
  ]);

  return NextResponse.json({ resolverDivergencia, resolverMapeamento });
}
