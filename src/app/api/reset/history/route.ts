import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Resets ONLY sales history + purchases. Preserves medicines, categories, stock.
export async function POST() {
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchase.deleteMany();
  return NextResponse.json({ ok: true });
}
