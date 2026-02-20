export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() { return NextResponse.json({ ok: true }); }

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Arquivo muito grande' }, { status: 400 });
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const url = 'data:' + file.type + ';base64,' + base64;
  await prisma.user.update({ where: { id: userId }, data: { image: url } });
  return NextResponse.json({ url });
}