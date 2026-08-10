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

export const prisma = new PrismaClient();

export async function connectWithRetry({ attempts = 6, delayMs = 4000 } = {}) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      if (i > 1) console.log(`Database awake (attempt ${i}).`);
      return;
    } catch (err) {
      if (err?.code !== 'P1001' || i === attempts) throw err;
      console.log(`Database asleep, waking… (attempt ${i}/${attempts})`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}
