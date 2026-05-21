import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
  if (sale.status !== 'completed') return NextResponse.json({ error: 'Only completed sales can be reverted' }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({ where: { id }, data: { status: 'refunded' } });
    for (const item of sale.items) {
      await tx.medicine.update({
        where: { id: item.medicineId },
        data: { stock: { increment: item.quantity } },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
