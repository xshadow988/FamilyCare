// Shared Prisma client for the maintenance scripts.
//
// Neon serverless auto-suspends the compute when idle. Waking it takes a few
// seconds, and any connection opened during that window fails outright with
// P1001 ("Can't reach database server"). Scripts that fire several queries in
// parallel open several connections at once, so a cold database fails ALL of
// them on the first try.
//
// connectWithRetry() opens exactly ONE connection first and retries it until
// the compute is awake. Once that succeeds, parallel queries are safe.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Scripts want one connection held patiently, not a pool. Prisma otherwise
// opens ~13 and gives up after pool_timeout=10s — which a cold Neon compute
// (connect_timeout=30) can never satisfy, surfacing as a confusing P2024.
function scriptUrl() {
  const base = process.env.DATABASE_URL || '';
  const [head, query = ''] = base.split('?');
  const params = new URLSearchParams(query);
  params.set('connection_limit', '1');
  params.set('pool_timeout', '60');
  params.set('connect_timeout', '30');
  return `${head}?${params.toString()}`;
}

export const prisma = new PrismaClient({ datasources: { db: { url: scriptUrl() } } });

export async function connectWithRetry({ attempts = 6, delayMs = 4000 } = {}) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      if (i > 1) console.log(`Database awake (attempt ${i}).`);
      return;
    } catch (err) {
      // P1001 = cannot reach server; P2024 = pool gave up waiting on a cold one.
      const retryable = err?.code === 'P1001' || err?.code === 'P2024'
        || /Timed out fetching a new connection/.test(err?.message ?? '');
      if (!retryable || i === attempts) throw err;
      console.log(`Database asleep, waking… (attempt ${i}/${attempts})`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}
