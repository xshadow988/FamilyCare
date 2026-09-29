/**
 * Puts INV-2026-0828 back.
 *
 * That sale was rung up at 13:14 PKT on 2026-09-29, after the backup at 12:53,
 * so the restore from that backup could not bring it back. Every field below
 * comes from a read of the live row taken before it was lost, except one:
 *
 *   known  — invoice number, timestamp, cashier, status, total, and the three
 *            lines (Letrozone, Cycin, Danzen-DS, ten tablets each)
 *   proven — the three lines at the medicines' own per-tablet prices come to
 *            exactly 3000.00, which is the total that was recorded, so there
 *            was no discount and no price was overridden at the counter
 *   assumed— paymentMethod. 'cash' is what the POS defaults to. Nothing in
 *            what was read tells us either way.
 *
 * Idempotent: if the invoice already exists it changes nothing, so this cannot
 * double-count if it is run twice or alongside a point-in-time recovery.
 */
import { prisma, connectWithRetry } from './_db.mjs';

const INVOICE = 'INV-2026-0828';
const WHEN = new Date('2026-09-29T08:14:35.923Z');
const LINES = [
  { name: 'Letrozone', tablets: 10 },
  { name: 'Cycin', tablets: 10 },
  { name: 'Danzen-DS', tablets: 10 },
];
const RECORDED_TOTAL = 3000;
const apply = process.argv.includes('--confirm');

await connectWithRetry();

const existing = await prisma.sale.findUnique({ where: { invoiceNumber: INVOICE } });
if (existing) {
  console.log(`${INVOICE} is already present (created ${existing.createdAt.toISOString()}). Nothing to do.`);
  await prisma.$disconnect();
  process.exit(0);
}

const items = [];
let subtotal = 0;
for (const line of LINES) {
  const med = await prisma.medicine.findFirst({ where: { name: line.name } });
  if (!med) {
    console.error(`X "${line.name}" is not in the catalogue — stopping rather than guessing.`);
    await prisma.$disconnect();
    process.exit(1);
  }
  const tps = Math.max(1, med.tabletsPerStrip);
  const perTablet = med.sellingPrice / tps;
  const total = perTablet * line.tablets;
  subtotal += total;
  items.push({
    medicineId: med.id,
    medicineName: med.name,
    quantity: line.tablets,
    unit: med.unit,
    price: perTablet,
    total,
    stockBefore: med.stock,
  });
}

console.log(`${INVOICE}  ${WHEN.toISOString()}`);
for (const i of items) {
  console.log(
    `  ${i.medicineName.padEnd(12)} ${String(i.quantity).padStart(3)} ${i.unit.toLowerCase()}` +
    ` x Rs ${i.price.toFixed(2).padStart(7)} = Rs ${i.total.toFixed(2).padStart(8)}` +
    `   stock ${i.stockBefore} -> ${i.stockBefore - i.quantity}`,
  );
}
console.log(`  subtotal Rs ${subtotal.toFixed(2)} · discount Rs 0.00 · total Rs ${subtotal.toFixed(2)}`);

if (Math.abs(subtotal - RECORDED_TOTAL) > 0.01) {
  console.error(`\nX computed total ${subtotal.toFixed(2)} does not match the ${RECORDED_TOTAL} that was recorded.`);
  console.error('  Prices have moved since. Stopping rather than writing a sale that does not add up.');
  await prisma.$disconnect();
  process.exit(1);
}
console.log(`  matches the recorded total exactly.`);

if (!apply) {
  console.log('\nDRY RUN — nothing written. Re-run with --confirm to insert it.');
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.$transaction(async (tx) => {
  await tx.sale.create({
    data: {
      invoiceNumber: INVOICE,
      date: WHEN,
      createdAt: WHEN,
      subtotal,
      tax: 0,
      discount: 0,
      total: subtotal,
      paymentMethod: 'cash',
      cashierName: 'Admin',
      customerName: null,
      status: 'completed',
      items: {
        create: items.map(({ stockBefore, ...i }) => i),
      },
    },
  });

  for (const i of items) {
    await tx.medicine.update({
      where: { id: i.medicineId },
      data: { stock: { decrement: i.quantity } },
    });
  }
});

console.log(`\n${INVOICE} restored, and the stock taken off the shelf.`);
await prisma.$disconnect();
