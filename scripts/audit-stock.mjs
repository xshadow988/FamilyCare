/**
 * READ-ONLY audit of stock movements.
 *
 * Answers one question: where has the ledger (purchases in, sales out) stopped
 * agreeing with the `stock` column, and in which direction? Stock sitting
 * ABOVE what the ledger implies is the signature of a deduction that was
 * undone — which is what "I sold it but it never came off the shelf" looks
 * like from the database side.
 *
 * Runs no writes of any kind. Safe against production.
 */
import { prisma, connectWithRetry } from './_db.mjs';

const money = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

await connectWithRetry();

const [medicines, purchases, sales] = await [
  await prisma.medicine.findMany(),
  await prisma.purchase.findMany(),
  await prisma.sale.findMany({ include: { items: true }, orderBy: { createdAt: 'asc' } }),
];

console.log(`medicines ${medicines.length} · purchases ${purchases.length} · sales ${sales.length}\n`);

/* ---------- 1. invoice numbering: gaps prove sales that failed mid-write ---------- */
const nums = sales
  .map((s) => /^INV-(\d{4})-(\d+)$/.exec(s.invoiceNumber))
  .filter(Boolean)
  .map((m) => ({ year: m[1], seq: Number(m[2]) }));

const byYear = {};
for (const n of nums) (byYear[n.year] ??= []).push(n.seq);

console.log('== invoice sequence ==');
for (const [year, seqs] of Object.entries(byYear)) {
  seqs.sort((a, b) => a - b);
  const gaps = [];
  for (let i = seqs[0]; i <= seqs[seqs.length - 1]; i++) if (!seqs.includes(i)) gaps.push(i);
  const dupes = seqs.filter((v, i) => seqs.indexOf(v) !== i);
  console.log(`  ${year}: ${seqs.length} sales, range ${seqs[0]}..${seqs[seqs.length - 1]}`);
  console.log(`    missing numbers: ${gaps.length ? gaps.join(', ') : 'none'}`);
  console.log(`    duplicates     : ${dupes.length ? [...new Set(dupes)].join(', ') : 'none'}`);
}

/* ---------- 2. sale items pointing at medicines that no longer exist ---------- */
const medById = new Map(medicines.map((m) => [m.id, m]));
const orphanItems = [];
for (const s of sales) {
  for (const it of s.items) if (!medById.has(it.medicineId)) orphanItems.push({ s, it });
}
console.log(`\n== sale items with no matching medicine ==\n  ${orphanItems.length}`);
for (const { s, it } of orphanItems.slice(0, 15)) {
  console.log(`    ${s.invoiceNumber}  ${it.medicineName}  qty ${it.quantity}  (id ${it.medicineId})`);
}

const orphanPurchases = purchases.filter((p) => !medById.has(p.medicineId));
console.log(`\n== purchases with no matching medicine ==\n  ${orphanPurchases.length}`);

/* ---------- 3. the ledger vs the stock column ---------- */
// Purchases record quantity in STRIPS; sale items record it in TABLETS.
// The strip size is whatever the medicine carries now, which is the same
// assumption the purchase route makes when it increments.
const ledger = new Map();
for (const m of medicines) ledger.set(m.id, { med: m, bought: 0, sold: 0, refunded: 0 });

for (const p of purchases) {
  const row = ledger.get(p.medicineId);
  if (!row) continue;
  row.bought += p.quantity * Math.max(1, row.med.tabletsPerStrip || 1);
}
for (const s of sales) {
  for (const it of s.items) {
    const row = ledger.get(it.medicineId);
    if (!row) continue;
    if (s.status === 'completed') row.sold += it.quantity;
    else row.refunded += it.quantity;
  }
}

const rows = [...ledger.values()].map((r) => {
  const expected = r.bought - r.sold;
  return { ...r, expected, drift: r.med.stock - expected };
});

const negative = rows.filter((r) => r.med.stock < 0);
console.log(`\n== negative stock ==\n  ${negative.length}`);
for (const r of negative.slice(0, 15)) {
  console.log(`    ${r.med.name}: ${r.med.stock}`);
}

const drifted = rows.filter((r) => r.drift !== 0).sort((a, b) => b.drift - a.drift);
const above = drifted.filter((r) => r.drift > 0);
const below = drifted.filter((r) => r.drift < 0);
console.log(`\n== stock vs ledger ==`);
console.log(`  in agreement            : ${rows.length - drifted.length}`);
console.log(`  stock ABOVE the ledger  : ${above.length}   <- deductions that went missing`);
console.log(`  stock BELOW the ledger  : ${below.length}   <- stock removed without a sale`);

console.log('\n  largest positive drift (tablets):');
for (const r of above.slice(0, 20)) {
  console.log(
    `    ${r.med.name.padEnd(28).slice(0, 28)} stock ${String(r.med.stock).padStart(7)}` +
    `  ledger ${String(r.expected).padStart(7)}  drift +${money(r.drift)}` +
    `   (bought ${r.bought}, sold ${r.sold})`,
  );
}
console.log('\n  largest negative drift (tablets):');
for (const r of below.slice(-20).reverse()) {
  console.log(
    `    ${r.med.name.padEnd(28).slice(0, 28)} stock ${String(r.med.stock).padStart(7)}` +
    `  ledger ${String(r.expected).padStart(7)}  drift ${money(r.drift)}` +
    `   (bought ${r.bought}, sold ${r.sold})`,
  );
}

/* ---------- 4. medicines updated after their last sale, with no purchase since ---------- */
// The lost-update path rewrites `stock` from a stale form, and every such write
// also bumps updatedAt. A medicine whose updatedAt is later than both its last
// sale and its last purchase was last touched by an edit, not by trade.
const lastSaleFor = new Map();
for (const s of sales) {
  for (const it of s.items) {
    const prev = lastSaleFor.get(it.medicineId);
    if (!prev || s.createdAt > prev) lastSaleFor.set(it.medicineId, s.createdAt);
  }
}
const lastPurchaseFor = new Map();
for (const p of purchases) {
  const prev = lastPurchaseFor.get(p.medicineId);
  if (!prev || p.createdAt > prev) lastPurchaseFor.set(p.medicineId, p.createdAt);
}

const editedAfterTrade = rows.filter((r) => {
  const ls = lastSaleFor.get(r.med.id);
  const lp = lastPurchaseFor.get(r.med.id);
  if (!ls) return false;
  const lastTrade = lp && lp > ls ? lp : ls;
  return r.med.updatedAt > new Date(lastTrade.getTime() + 60_000);
});
console.log(`\n== last touched by an edit, after its last sale/purchase ==`);
console.log(`  ${editedAfterTrade.length} of ${rows.length} medicines`);
for (const r of editedAfterTrade.filter((r) => r.drift > 0).slice(0, 15)) {
  console.log(
    `    ${r.med.name.padEnd(28).slice(0, 28)} drift +${String(r.drift).padStart(6)}` +
    `  edited ${r.med.updatedAt.toISOString().slice(0, 16)}` +
    `  last sale ${lastSaleFor.get(r.med.id).toISOString().slice(0, 16)}`,
  );
}

await prisma.$disconnect();
