// Full snapshot of the PRODUCTION Neon database → backups/<name>.json
// Usage: node scripts/backup-db.mjs [backupName]
import { writeFileSync, mkdirSync } from 'fs';
import { prisma, connectWithRetry } from './_db.mjs';

const name = process.argv[2] || 'Backup-Version1';

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
const file = `backups/${name}.json`;
writeFileSync(file, JSON.stringify(backup, null, 2), 'utf8');

console.log('BACKUP WRITTEN:', file);
console.log('COUNTS:', JSON.stringify(backup.counts));

await prisma.$disconnect();
