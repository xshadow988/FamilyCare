import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  // Delete in FK-safe order
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.category.deleteMany();
  return NextResponse.json({ ok: true });
}
