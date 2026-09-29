import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const purchase = await prisma.purchase.findUnique({ where: { id } });
  if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Reverse the stock this purchase added — quantity is strips, stock is tablets.
    //
    // The subtraction is a decrement, not a figure computed from a stock value
    // read a moment earlier. Reading and writing back loses anything that moved
    // in between, which at a busy counter is a sale: the till takes ten tablets
    // off, this writes a total that was calculated before they left, and the
    // sale is undone. Postgres applies a decrement against the current row.
    const med = await tx.medicine.findUnique({
      where: { id: purchase.medicineId },
      select: { id: true, tabletsPerStrip: true },
    });
    if (med) {
      const tabletsAdded = purchase.quantity * Math.max(1, med.tabletsPerStrip);
      await tx.medicine.update({
        where: { id: med.id },
        data: { stock: { decrement: tabletsAdded } },
      });
    }
    await tx.purchase.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
