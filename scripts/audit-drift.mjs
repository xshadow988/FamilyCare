/**
 * READ-ONLY. Compares a backup snapshot against what is live now.
 *
 * The question a single snapshot cannot answer: did any medicine's stock go UP
 * without a purchase to explain it? Stock only rises on a purchase or a refund.
 * A rise with neither is stock being written back from somewhere — which is the
 * fingerprint of an absolute `stock` value posted from a stale form, wiping
 * every sale recorded in between.
 *
 * Runs no writes. Safe against production.
 */
import { readFileSync } from 'fs';
import { prisma, connectWithRetry } from './_db.mjs';

const SNAP = process.argv[2];
if (!SNAP) {
  console.error('usage: node scripts/audit-drift.mjs backups/<file>.json');
  process.exit(1);
}

const snap = JSON.parse(readFileSync(SNAP, 'utf8'));
const pick = (k) => snap[k] ?? snap.data?.[k] ?? [];
const snapMeds = pick('medicines');
const snapSales = pick('sales');
console.log(`snapshot ${SNAP}`);
console.log(`  medicines ${snapMeds.length} · sales ${snapSales.length} · purchases ${pick('purchases').length}`);

await connectWithRetry();
const meds = await prisma.medicine.findMany();
const purchases = await prisma.purchase.findMany();
const sales = await prisma.sale.findMany({ include: { items: true } });

// The moment the snapshot was taken: the newest sale it contains.
const snapCutoff = snapSales.length
  ? new Date(Math.max(...snapSales.map((s) => new Date(s.createdAt ?? s.date).getTime())))
  : null;
console.log(`  newest sale in snapshot: ${snapCutoff ? snapCutoff.toISOString() : 'n/a'}\n`);

const snapById = new Map(snapMeds.map((m) => [m.id, m]));

// Everything that legitimately moved stock since the snapshot.
const boughtSince = new Map();
for (const p of purchases) {
  if (snapCutoff && new Date(p.createdAt) <= snapCutoff) continue;
  boughtSince.set(p.medicineId, (boughtSince.get(p.medicineId) ?? 0) + p.quantity);
}
const soldSince = new Map();
const refundedSince = new Map();
for (const s of sales) {
  if (snapCutoff && new Date(s.createdAt) <= snapCutoff) continue;
  for (const it of s.items) {
    const bucket = s.status === 'completed' ? soldSince : refundedSince;
    bucket.set(it.medicineId, (bucket.get(it.medicineId) ?? 0) + it.quantity);
  }
}

const rows = [];
for (const m of meds) {
  const before = snapById.get(m.id);
  if (!before) continue; // added after the snapshot
  const tps = Math.max(1, m.tabletsPerStrip || 1);
  const bought = (boughtSince.get(m.id) ?? 0) * tps;
  const sold = soldSince.get(m.id) ?? 0;
  const refunded = refundedSince.get(m.id) ?? 0;
  const expected = before.stock + bought - sold + refunded;
  rows.push({
    name: m.name,
    before: before.stock,
    now: m.stock,
    bought,
    sold,
    refunded,
    expected,
    unexplained: m.stock - expected,
    updatedAt: m.updatedAt,
  });
}

const off = rows.filter((r) => r.unexplained !== 0);
const up = off.filter((r) => r.unexplained > 0).sort((a, b) => b.unexplained - a.unexplained);
const down = off.filter((r) => r.unexplained < 0).sort((a, b) => a.unexplained - b.unexplained);

console.log(`tracked ${rows.length} medicines present in both`);
console.log(`  moved exactly as purchases and sales say : ${rows.length - off.length}`);
console.log(`  ended up HIGHER than the movements allow : ${up.length}`);
console.log(`  ended up LOWER  than the movements allow : ${down.length}\n`);

const show = (list, title) => {
  console.log(title);
  console.log(
    '    ' + 'medicine'.padEnd(24) + 'was'.padStart(7) + 'bought'.padStart(8) +
    'sold'.padStart(7) + 'should be'.padStart(11) + 'is'.padStart(8) + 'unexplained'.padStart(13),
  );
  for (const r of list.slice(0, 25)) {
    console.log(
      '    ' + r.name.slice(0, 23).padEnd(24) +
      String(r.before).padStart(7) + String(r.bought).padStart(8) +
      String(r.sold).padStart(7) + String(r.expected).padStart(11) +
      String(r.now).padStart(8) +
      (r.unexplained > 0 ? '+' : '') + String(r.unexplained).padStart(12),
    );
  }
};

if (up.length) show(up, 'STOCK ROSE WITH NOTHING TO EXPLAIN IT  (sales that were undone)');
if (down.length) show(down, '\nSTOCK FELL WITH NOTHING TO EXPLAIN IT');

// How much selling was erased, in money at today's prices.
const priceOf = new Map(meds.map((m) => [m.name, m.sellingPrice / Math.max(1, m.tabletsPerStrip || 1)]));
const erased = up.reduce((sum, r) => sum + r.unexplained * (priceOf.get(r.name) ?? 0), 0);
console.log(
  `\n  tablets that came back onto the shelf: ${up.reduce((s, r) => s + r.unexplained, 0)}` +
  `  (~Rs ${erased.toLocaleString('en-US', { maximumFractionDigits: 0 })} at current prices)`,
);

await prisma.$disconnect();
