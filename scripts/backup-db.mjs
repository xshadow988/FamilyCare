// Full snapshot of the PRODUCTION Neon database → backups/<name>.json
// Usage: node scripts/backup-db.mjs [backupName]
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { prisma, connectWithRetry } from './_db.mjs';

// Dated by default, and never over an existing file. The old default was a
// fixed name, so a backup taken without an argument silently overwrote the
// previous one — which is the opposite of what a backup is for.
const stamp = new Date().toISOString().slice(0, 10);
const name = process.argv[2] || `Backup-${stamp}-auto`;

await connectWithRetry();

// Sequential on purpose. Neon allows few connections and a running dev server
// holds some of them, so issuing these in parallel exhausts the pool and fails
// with P2024. A backup has no deadline — one connection at a time is fine.
const medicines = await prisma.medicine.findMany({ orderBy: { createdAt: 'asc' } });
const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
const sales = await prisma.sale.findMany({ orderBy: { createdAt: 'asc' } });
const saleItems = await prisma.saleItem.findMany();
const purchases = await prisma.purchase.findMany({ orderBy: { createdAt: 'asc' } });

const backup = {
  name,
  createdAt: new Date().toISOString(),
  source: 'Neon production (DATABASE_URL)',
  counts: {
    medicines: medicines.length,
    categories: categories.length,
    sales: sales.length,
    saleItems: saleItems.length,
    purchases: purchases.length,
  },
  data: { medicines, categories, sales, saleItems, purchases },
};

mkdirSync('backups', { recursive: true });
let file = `backups/${name}.json`;
if (existsSync(file)) {
  // Refuse to clobber. A suffix costs nothing; a lost snapshot cannot be redone.
  let n = 2;
  while (existsSync(`backups/${name}-${n}.json`)) n++;
  console.warn(`${file} already exists — writing backups/${name}-${n}.json instead`);
  file = `backups/${name}-${n}.json`;
}
writeFileSync(file, JSON.stringify(backup, null, 2), 'utf8');

console.log('BACKUP WRITTEN:', file);
console.log('COUNTS:', JSON.stringify(backup.counts));

await prisma.$disconnect();
