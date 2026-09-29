import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const purchases = await prisma.purchase.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(purchases.map(p => ({ ...p, date: p.date.toISOString() })));
}

export async function POST(req: Request) {
  const body = await req.json();

  // Highest issued, not how many rows exist: a deleted purchase used to make
  // the counter hand out a number that was already on another row. Purchase
  // invoice numbers carry no unique index, so the clash was silent.
  const year = new Date().getFullYear();
  const issued = await prisma.purchase.findMany({
    where: { invoiceNumber: { startsWith: `PO-${year}-` } },
    select: { invoiceNumber: true },
  });
  const highest = issued.reduce((max, p) => {
    const seq = Number(p.invoiceNumber.split('-')[2]);
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, 0);
  const invoiceNumber = body.invoiceNumber ||
    `PO-${year}-${String(highest + 1).padStart(4, '0')}`;

  // quantity is in STRIPS; stock is tracked in tablets
  const tabletsPerStrip = Math.max(1, Math.floor(body.tabletsPerStrip ?? 1));
  const tabletsAdded = body.quantity * tabletsPerStrip;

  const purchase = await prisma.$transaction(async (tx) => {
    const newPurchase = await tx.purchase.create({
      data: {
        date: new Date(body.date),
        medicineId: body.medicineId,
        medicineName: body.medicineName,
        quantity: body.quantity,
        purchasePrice: body.purchasePrice,
        sellingPrice: typeof body.sellingPrice === 'number' ? body.sellingPrice : 0,
        total: body.total,
        invoiceNumber,
        status: 'received',
      },
    });

    // Increment stock (in tablets) and update prices + tablets-per-strip
    await tx.medicine.update({
      where: { id: body.medicineId },
      data: {
        stock: { increment: tabletsAdded },
        purchasePrice: body.purchasePrice,
        tabletsPerStrip,
        ...(typeof body.sellingPrice === 'number' && body.sellingPrice > 0
          ? { sellingPrice: body.sellingPrice }
          : {}),
      },
    });

    return newPurchase;
  });

  return NextResponse.json({ ...purchase, date: purchase.date.toISOString() }, { status: 201 });
}
