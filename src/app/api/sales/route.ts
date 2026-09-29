import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type SaleItemBody = {
  medicineId: string; medicineName: string;
  quantity: number; unit: string; price: number; total: number;
};
type SaleBody = {
  date: string; subtotal: number; tax?: number; discount?: number; total: number;
  paymentMethod: string; cashierName: string; customerName?: string; status?: string;
  items: SaleItemBody[];
};

export async function GET() {
  const sales = await prisma.sale.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(
    sales.map(s => ({ ...s, date: s.date.toISOString() }))
  );
}

/**
 * The next free invoice number for a year.
 *
 * Counting the rows was wrong twice over: a refunded sale still counts, and two
 * tills ringing up at the same moment both read the same count and then both
 * try to write the same number. The unique index catches the collision, but the
 * transaction it aborts is the one that also decrements stock — so the second
 * sale vanished whole. Taking the highest number actually issued removes the
 * first problem; the caller retries on the second.
 */
async function nextInvoiceNumber(year: number): Promise<string> {
  // Compared as numbers, not as text. The sequence is padded to four digits,
  // so a string sort puts 'INV-2026-9999' above 'INV-2026-10000' and the
  // counter would stick on the ten-thousandth sale of a year. One short
  // column for one year is a few kilobytes.
  const issued = await prisma.sale.findMany({
    where: { invoiceNumber: { startsWith: `INV-${year}-` } },
    select: { invoiceNumber: true },
  });
  const highest = issued.reduce((max, sale) => {
    const seq = Number(sale.invoiceNumber.split('-')[2]);
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, 0);
  return `INV-${year}-${String(highest + 1).padStart(4, '0')}`;
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'A sale needs at least one item.' }, { status: 400 });
  }

  const year = new Date().getFullYear();

  // Two tills can still pick the same number between the read and the write.
  // The unique index is what actually decides it; this just tries again.
  for (let attempt = 0; attempt < 5; attempt++) {
    const invoiceNumber = await nextInvoiceNumber(year);
    try {
      const sale = await createSale(invoiceNumber, body);
      return NextResponse.json({ ...sale, date: sale.date.toISOString() }, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: someone else took this number. P2025: a line refers to a
        // medicine that is no longer there — retrying cannot help that.
        if (err.code === 'P2002') continue;
        if (err.code === 'P2025') {
          return NextResponse.json(
            { error: 'One of these medicines no longer exists. Reload the page and ring the sale up again.' },
            { status: 409 },
          );
        }
      }
      throw err;
    }
  }

  return NextResponse.json(
    { error: 'Could not allocate an invoice number. Nothing was saved — please try again.' },
    { status: 503 },
  );
}

async function createSale(invoiceNumber: string, body: SaleBody) {
  return prisma.$transaction(async (tx) => {
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
          create: body.items.map((item: SaleItemBody) => ({
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

    // Decrement stock for each item. An unknown medicine throws P2025 here and
    // takes the whole transaction with it, so a sale is never recorded against
    // stock that was not moved.
    for (const item of body.items) {
      await tx.medicine.update({
        where: { id: item.medicineId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return newSale;
  });
}
