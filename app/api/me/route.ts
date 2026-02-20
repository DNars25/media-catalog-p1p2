export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session == null || session.user == null || session.user.id == null) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true }
  });
  return NextResponse.json({ image: user?.image ?? null });
}
