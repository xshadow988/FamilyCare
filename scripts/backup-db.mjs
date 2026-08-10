// Full snapshot of the PRODUCTION Neon database → backups/<name>.json
// Usage: node scripts/backup-db.mjs [backupName]
import { writeFileSync, mkdirSync } from 'fs';
import { prisma, connectWithRetry } from './_db.mjs';

const name = process.argv[2] || 'Backup-Version1';

await connectWithRetry();

const [medicines, categories, sales, saleItems, purchases] = await Promise.all([
  prisma.medicine.findMany({ orderBy: { createdAt: 'asc' } }),
  prisma.category.findMany({ orderBy: { name: 'asc' } }),
  prisma.sale.findMany({ orderBy: { createdAt: 'asc' } }),
  prisma.saleItem.findMany(),
  prisma.purchase.findMany({ orderBy: { createdAt: 'asc' } }),
]);

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
