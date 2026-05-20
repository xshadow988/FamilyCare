import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const sales = await prisma.sale.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(
    sales.map(s => ({ ...s, date: s.date.toISOString() }))
  );
}

export async function POST(req: Request) {
  const body = await req.json();

  // Generate invoice number server-side
  const count = await prisma.sale.count();
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  const sale = await prisma.$transaction(async (tx) => {
    const newSale = await tx.sale.create({
      data: {
        invoiceNumber,
        date: new Date(body.date),
        subtotal: body.subtotal,
        tax: body.tax ?? 0,
        discount: body.discount ?? 0,
        total: body.total,
        paymentMethod: body.paymentMethod,
        cashierName: body.cashierName,
        customerName: body.customerName ?? null,
        status: body.status ?? 'completed',
        items: {
          create: body.items.map((item: {
            medicineId: string; medicineName: string;
            quantity: number; unit: string; price: number; total: number;
          }) => ({
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            total: item.total,
          })),
        },
      },
      include: { items: true },
    });

    // Decrement stock for each item
    for (const item of body.items) {
      await tx.medicine.update({
        where: { id: item.medicineId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return newSale;
  });

  return NextResponse.json({ ...sale, date: sale.date.toISOString() }, { status: 201 });
}
