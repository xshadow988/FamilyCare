import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Wipes every table. Disabled unless the environment explicitly allows it.
 *
 * This route used to be an unauthenticated POST with nothing in front of it.
 * The Settings screen asks you to type RESET first, but that check lives in the
 * browser: anyone who knew the URL could erase the pharmacy's entire history —
 * medicines, sales, sale items, purchases, categories — with one request and no
 * credentials. The app has no server-side session to check against (see "Auth
 * is decorative" in CLAUDE.md), and any secret shipped to the client would be
 * public, so the only honest guard is to refuse wherever the flag is not set.
 *
 * `ALLOW_DATA_RESET=true` belongs in a local .env and must never be set on the
 * production deployment. Clearing the live database is a restore from
 * `backups/`, not this route.
 */
export async function POST() {
  if (process.env.ALLOW_DATA_RESET !== 'true') {
    return NextResponse.json(
      {
        error:
          'Resetting data is disabled on this deployment. Nothing was changed. ' +
          'To clear a local copy, set ALLOW_DATA_RESET=true in .env.',
      },
      { status: 403 },
    );
  }

  // Delete in FK-safe order
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.category.deleteMany();
  return NextResponse.json({ ok: true });
}
