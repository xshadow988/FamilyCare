import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const purchases = await prisma.purchase.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(purchases.map(p => ({ ...p, date: p.date.toISOString() })));
}

export async function POST(req: Request) {
  const body = await req.json();

  const count = await prisma.purchase.count();
  const invoiceNumber = body.invoiceNumber ||
    `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  const purchase = await prisma.$transaction(async (tx) => {
    const newPurchase = await tx.purchase.create({
      data: {
        date: new Date(body.date),
        medicineId: body.medicineId,
        medicineName: body.medicineName,
        quantity: body.quantity,
        purchasePrice: body.purchasePrice,
        total: body.total,
        invoiceNumber,
        status: 'received',
      },
    });

    // Increment stock and update prices (buy + sale) from the purchase
    await tx.medicine.update({
      where: { id: body.medicineId },
      data: {
        stock: { increment: body.quantity },
        purchasePrice: body.purchasePrice,
        ...(typeof body.sellingPrice === 'number' && body.sellingPrice > 0
          ? { sellingPrice: body.sellingPrice }
          : {}),
      },
    });

    return newPurchase;
  });

  return NextResponse.json({ ...purchase, date: purchase.date.toISOString() }, { status: 201 });
}
