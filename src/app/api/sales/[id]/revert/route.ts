import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
  if (sale.status !== 'completed') {
    return NextResponse.json({ error: 'Only completed sales can be reverted' }, { status: 400 });
  }

  // The check above is a courtesy for the error message; it cannot decide the
  // outcome. Two clicks on Revert — a double tap, or the same invoice open on
  // two screens — both read 'completed' and both used to pay the stock back,
  // putting the goods on the shelf twice for one refund. The conditional update
  // below is what actually decides: exactly one of them matches a row that is
  // still 'completed', and the other finds nothing and stops.
  const reverted = await prisma.$transaction(async (tx) => {
    const claimed = await tx.sale.updateMany({
      where: { id, status: 'completed' },
      data: { status: 'refunded' },
    });
    if (claimed.count === 0) return false;

    for (const item of sale.items) {
      await tx.medicine.update({
        where: { id: item.medicineId },
        data: { stock: { increment: item.quantity } },
      });
    }
    return true;
  });

  if (!reverted) {
    return NextResponse.json(
      { error: 'This sale has already been reverted. Nothing was changed.' },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
