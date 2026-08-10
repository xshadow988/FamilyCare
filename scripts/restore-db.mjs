// Restore the PRODUCTION Neon database from a backup JSON.
// REPLACES all current data. Dry-run by default; pass --confirm to apply.
// Usage: node scripts/restore-db.mjs [backupName] --confirm
import { readFileSync } from 'fs';
import { prisma, connectWithRetry } from './_db.mjs';

const name = process.argv.find(a => !a.startsWith('--') && !a.endsWith('.mjs') && a !== process.argv[0] && a !== process.argv[1]) || 'Backup-Version1';
const confirm = process.argv.includes('--confirm');
const backup = JSON.parse(readFileSync(`backups/${name}.json`, 'utf8'));

console.log(`Backup "${backup.name}" from ${backup.createdAt}`);
console.log('Counts:', JSON.stringify(backup.counts));

if (!confirm) {
  console.log('\nDRY RUN — no changes made. Re-run with --confirm to REPLACE all current data with this backup.');
  process.exit(0);
}

await connectWithRetry();

const { medicines, categories, sales, saleItems, purchases } = backup.data;
const d = (v) => (v ? new Date(v) : v);

await prisma.$transaction(async (tx) => {
  // Clear (FK-safe order)
  await tx.saleItem.deleteMany();
  await tx.sale.deleteMany();
  await tx.purchase.deleteMany();
  await tx.medicine.deleteMany();
  await tx.category.deleteMany();

  // Recreate (preserving ids so relations line up)
  if (categories.length) await tx.category.createMany({ data: categories });
  if (medicines.length) await tx.medicine.createMany({ data: medicines.map(m => ({ ...m, createdAt: d(m.createdAt), updatedAt: d(m.updatedAt) })) });
  if (purchases.length) await tx.purchase.createMany({ data: purchases.map(p => ({ ...p, date: d(p.date), createdAt: d(p.createdAt) })) });
  if (sales.length) await tx.sale.createMany({ data: sales.map(s => ({ ...s, date: d(s.date), createdAt: d(s.createdAt) })) });
  if (saleItems.length) await tx.saleItem.createMany({ data: saleItems });
}, { timeout: 60000 });

console.log('RESTORE COMPLETE.');
await prisma.$disconnect();
