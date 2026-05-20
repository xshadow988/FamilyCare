import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(cats.map(c => c.name));
}

export async function POST(req: Request) {
  const { name } = await req.json();
  const cat = await prisma.category.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return NextResponse.json(cat, { status: 201 });
}
