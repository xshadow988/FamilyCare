import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const purchase = await prisma.purchase.findUnique({ where: { id } });
  if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Reverse the stock this purchase added (never below 0)
    const med = await tx.medicine.findUnique({ where: { id: purchase.medicineId } });
    if (med) {
      await tx.medicine.update({
        where: { id: med.id },
        data: { stock: Math.max(0, med.stock - purchase.quantity) },
      });
    }
    await tx.purchase.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
