import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  await prisma.category.deleteMany({ where: { name: decodeURIComponent(name) } });
  return NextResponse.json({ ok: true });
}
