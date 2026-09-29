/**
 * READ-ONLY. Walks one medicine's movements against the clock.
 *
 * Stock can only rise on a purchase or a refund. Where it rose without either,
 * this prints every sale and edit around that window so the cause is visible
 * rather than inferred.
 */
import { readFileSync } from 'fs';
import { prisma, connectWithRetry } from './_db.mjs';

const SNAP = process.argv[2];
const NAMES = process.argv.slice(3);
if (!SNAP || !NAMES.length) {
  console.error('usage: node scripts/audit-case.mjs backups/<file>.json "Name" ["Name" ...]');
  process.exit(1);
}

const snap = JSON.parse(readFileSync(SNAP, 'utf8'));
const pick = (k) => snap[k] ?? snap.data?.[k] ?? [];
const snapMeds = pick('medicines');
const snapSales = pick('sales');
const cutoff = new Date(Math.max(...snapSales.map((s) => new Date(s.createdAt ?? s.date).getTime())));

await connectWithRetry();
const meds = await prisma.medicine.findMany();
const purchases = await prisma.purchase.findMany();
const sales = await prisma.sale.findMany({ include: { items: true }, orderBy: { createdAt: 'asc' } });

const t = (d) => new Date(d).toISOString().replace('T', ' ').slice(0, 16);

for (const name of NAMES) {
  const med = meds.find((m) => m.name === name);
  if (!med) { console.log(`\n${name}: not found\n`); continue; }
  const before = snapMeds.find((m) => m.id === med.id);

  console.log('\n' + '='.repeat(72));
  console.log(`${med.name}   (${med.tabletsPerStrip} per strip)`);
  console.log('='.repeat(72));
  console.log(`  stock in snapshot (${t(cutoff)}) : ${before ? before.stock : 'n/a'}`);
  console.log(`  stock now                          : ${med.stock}`);
  console.log(`  medicine row last written          : ${t(med.updatedAt)}`);

  const ps = purchases.filter((p) => p.medicineId === med.id && new Date(p.createdAt) > cutoff);
  console.log(`\n  purchases since the snapshot: ${ps.length}`);
  for (const p of ps) console.log(`    ${t(p.createdAt)}  ${p.quantity} strips  ${p.invoiceNumber}`);

  const rows = [];
  for (const s of sales) {
    if (new Date(s.createdAt) <= cutoff) continue;
    for (const it of s.items) {
      if (it.medicineId !== med.id) continue;
      rows.push({ when: s.createdAt, inv: s.invoiceNumber, qty: it.quantity, status: s.status });
    }
  }
  console.log(`\n  sales since the snapshot: ${rows.length}`);
  let running = before ? before.stock : 0;
  for (const r of rows) {
    running += r.status === 'completed' ? -r.qty : 0;
    const flag = new Date(r.when) < new Date(med.updatedAt) ? '' : '   <- after the last edit';
    console.log(
      `    ${t(r.when)}  ${r.inv}  ${String(r.qty).padStart(4)} tablets  ${r.status.padEnd(9)}` +
      `  running ${String(running).padStart(6)}${flag}`,
    );
  }

  const soldAfterEdit = rows
    .filter((r) => r.status === 'completed' && new Date(r.when) > new Date(med.updatedAt))
    .reduce((s, r) => s + r.qty, 0);
  console.log(`\n  ledger says stock should be        : ${running}`);
  console.log(`  it actually is                     : ${med.stock}`);
  console.log(`  difference                         : ${med.stock - running > 0 ? '+' : ''}${med.stock - running}`);
  console.log(`  sold AFTER the row was last written: ${soldAfterEdit} tablets`);
  if (med.stock - running > 0 && soldAfterEdit === 0) {
    console.log(`  => every sale here predates the last write to this row, and the write`);
    console.log(`     left MORE on the shelf than the sales allow.`);
  }
}

await prisma.$disconnect();
