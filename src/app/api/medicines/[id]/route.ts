import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Editing a medicine no longer rewrites its stock unless the stock fields were
 * actually changed.
 *
 * The edit dialog is filled from a medicine list the browser loaded at sign-in
 * and never refreshes. Sending the whole form back wrote that hours-old stock
 * figure over the live one, erasing every sale rung up in between — the till
 * had decremented the shelf correctly and a later, unrelated price edit put the
 * tablets back. Verified in production: Moxef was sold 10 tablets at 05:37 on
 * 2026-09-29 and its row was rewritten the same minute, leaving 50 on the shelf
 * where the ledger said 45.
 *
 * So the client sends `stock` only when someone typed a new count, and this
 * leaves the column alone otherwise. A count that IS sent still wins outright —
 * someone who has just counted the shelf knows better than the ledger — but it
 * is now always a deliberate act rather than a side effect of saving a price.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const data: Prisma.MedicineUpdateInput = {
    name: body.name,
    category: body.category,
    unit: body.unit,
    purchasePrice: body.purchasePrice,
    sellingPrice: body.sellingPrice,
    minStock: body.minStock,
    tabletsPerStrip: body.tabletsPerStrip ?? 1,
  };
  if (typeof body.stock === 'number' && Number.isFinite(body.stock)) {
    data.stock = Math.round(body.stock);
  }

  const medicine = await prisma.medicine.update({ where: { id }, data });
  return NextResponse.json(medicine);
}

/**
 * A medicine that has been sold cannot be deleted.
 *
 * `SaleItem.medicineId` is a bare string with no foreign key, so deleting the
 * medicine leaves the sale rows pointing at nothing: cost of goods sold stops
 * resolving for those lines, the sale can no longer be reverted (the revert
 * puts stock back on a row that is gone, and throws), and the history quietly
 * stops adding up. Production already carries 17 such orphaned lines across
 * two deleted medicines.
 *
 * Setting the stock to zero takes it off the shelf without taking it out of
 * the books.
 */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [soldLines, purchaseLines] = await Promise.all([
    prisma.saleItem.count({ where: { medicineId: id } }),
    prisma.purchase.count({ where: { medicineId: id } }),
  ]);

  if (soldLines > 0 || purchaseLines > 0) {
    return NextResponse.json(
      {
        error:
          `This medicine appears in ${soldLines} sale line(s) and ${purchaseLines} purchase(s). ` +
          `Deleting it would break those records. Set its stock to 0 instead.`,
      },
      { status: 409 },
    );
  }

  await prisma.medicine.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
