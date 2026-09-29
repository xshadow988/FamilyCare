@AGENTS.md

# Family Care — Pharmacy POS

Next.js 16 (App Router, Turbopack) + React 19 + Prisma 5 → **Neon Postgres**. Deployed on Vercel.
Repo: `github.com/xshadow988/FamilyCare` · release convention: annotated tags `v1`…`v8`.

## ⚠️ The production database is live and in daily use

`DATABASE_URL` in `.env` points at the **real pharmacy's Neon database** — staff are ringing up
sales against it right now. There is no separate dev database.

- Never run `POST /api/reset`, `restore-db.mjs --confirm`, or `prisma db push` casually.
- Take a snapshot first: `node scripts/backup-db.mjs "Backup-<date>-<reason>"`.
- For risky work, use the local SQLite setup instead (`prisma/schema.local.prisma`, `seed-local.mjs`).

**The GitHub repo is public.** Snapshots written to `backups/` contain cost prices, every
sale, and customer names, so `/backups/*.json` is git-ignored — keep them on local disk and never
commit one. (`backups/Backup-Version1.json` predates that rule and is already public in the
history.) The `master` branch on GitHub is a stale "Initial commit" and is GitHub's configured
default; all real work and deploys come from `main`.

## Demo mode (the `demo` account)

`demo` / `demo1234` is a sandbox account for product pitches. It starts empty and keeps everything
in `localStorage`; it is wiped on logout and 24h after login (the clock is `demoStartedAt` on the
session record, **not** the sandbox's own timestamp — the data can be cleared independently by
whichever provider mounts first, which would hide the expiry).

The isolation guarantee is that [src/lib/api.ts](src/lib/api.ts) never calls `fetch` for a demo
session; [src/lib/demo-store.ts](src/lib/demo-store.ts) contains no network code at all. **Every
`/api/...` call in the app must go through `apiFetch`, never raw `fetch`** — a raw `fetch` added
later would silently punch a hole straight to the production database. `demo-store.ts` mirrors the
route handlers in `src/app/api/`, so changing a route's behaviour means changing both.

Equally important: **never load data before the session is known.** `AppProvider` waits on
`useAuth()` and only fetches once a user resolves. Fetching on mount instead runs while the user is
still on `/login`, where `isDemoSession()` is false — so it hits the real API and loads live
pharmacy data into context, and because logging in is a client-side navigation the provider never
remounts and the demo user keeps seeing it. This shipped once and reached production; a cold Neon
start made the fetch fail silently in local testing and hid it. Test demo isolation with a **warm**
database, and record network traffic from before the first navigation.

## What "profit" means here

Net Profit = **revenue − cost of goods SOLD**, never revenue minus money spent on stock.
Dashboard, Sales History and Profits all compute it the same way: for each sold item,
`perTablet(medicine.purchasePrice, tabletsPerStrip) × quantity`.

Staff reasonably expect `revenue − purchases` and get a smaller number. The difference is
stock bought in the period that has not sold yet — inventory, not a loss. The Profits page
has a reconciliation panel that shows both figures and names the gap, so this question
answers itself; keep it in sync if the profit formula ever changes.

Two known inaccuracies in that cost figure, both deliberate for now:

- It uses the medicine's **current** `purchasePrice`, not the price on the day of the sale.
  `POST /api/purchases` overwrites that field, so a supplier price change silently restates
  past months. Measured on 1–24 Sept 2026: Rs 1,785 of a Rs 189,236 profit (~0.9%). Fixing it
  properly means storing cost-at-sale on `SaleItem`, which is a production migration.
- If a medicine is deleted, its sold items fall back to `item.price * 0.4` — a guess. Currently
  no live sale hits this path.

Period filtering for the report pages lives in [src/lib/period.ts](src/lib/period.ts). Note the
split: `daily`/`weekly`/`biweekly`/`monthly` are **rolling** windows (last N days), while
`thismonth` and `custom` are true calendar ranges. Use `inPeriod()` rather than re-deriving it.
## Units: the one thing that bites

`Medicine.stock` is stored **in tablets** (the smallest unit). Everything else is not:

| Field / payload | Unit |
|---|---|
| `Medicine.stock` | tablets |
| `Medicine.minStock` | **strips** (compare via `isLowStock`, which multiplies by `tabletsPerStrip`) |
| `Medicine.purchasePrice` / `sellingPrice` | **per strip** |
| `Purchase.quantity` (POST `/api/purchases`) | **strips** — route multiplies by `tabletsPerStrip` before incrementing stock |
| `SaleItem.quantity` (POST `/api/sales`) | **tablets** — POS sends `strips * tabletsPerStrip + tablets` |
| `SaleItem.price` | per tablet |

`tabletsPerStrip = 1` means a non-divisible item (bottle, injection, cream). Always go through the
helpers in [src/lib/strip.ts](src/lib/strip.ts) (`tpt`, `perTablet`, `splitStock`, `formatStock`)
rather than doing the arithmetic inline.

Note `POST /api/purchases` also **overwrites** the medicine's `purchasePrice` and `tabletsPerStrip`
from the payload — a purchase entry is how prices get updated, not just stock.

## Architecture

- **All state lives in one client context** — [app-context.tsx](src/components/providers/app-context.tsx)
  fetches medicines/sales/purchases/categories on mount and exposes `reload()`. Pages mutate via
  `fetch('/api/…')` then call `reload()`. There is no server-side data fetching or caching layer.
- **API routes** are thin Prisma wrappers under [src/app/api/](src/app/api/). Invoice numbers
  (`INV-YYYY-NNNN`, `PO-YYYY-NNNN`) are generated server-side from the **highest number already
  issued**, not a row `count()`: a refunded or deleted row still counts, and two tills reading the
  same count both try to write it. `POST /api/sales` retries on the unique-index clash.
- Stock-changing operations (sale, purchase, revert, purchase-delete) run inside `prisma.$transaction`.
- Reverting a sale sets status `refunded` and adds the stock back; it does not delete the row.

## Never write `Medicine.stock` as an absolute value from a form

The client context loads medicines once at sign-in and does not refresh. Any screen that sends a
whole medicine object back is sending a stock figure that may be hours old, and `PUT` used to write
it — so saving a price edit put every tablet sold since the page loaded back on the shelf. That is
the bug behind "I sold it but it never came off the inventory". Confirmed in production on
2026-09-29: Moxef was sold 10 tablets at 05:37, its row was rewritten the same minute, and 50 were
left on the shelf where the ledger said 45.

Rules:

- `PUT /api/medicines/[id]` writes `stock` **only when the key is present**. The inventory dialog
  remembers what it opened with and omits `stock` unless someone typed a new count.
- Everything that moves stock as a consequence of trade uses `{ increment }` / `{ decrement }`
  inside a transaction, never a computed absolute.
- A typed count still wins outright — someone who has just counted the shelf knows better than the
  ledger — but it has to be a deliberate act, not a side effect of saving an unrelated field.
- A medicine that appears in any sale or purchase **cannot be deleted** (`409`). `SaleItem.medicineId`
  has no foreign key, so deleting orphans those lines: their cost stops resolving and the sale can no
  longer be reverted. Production already carries 17 such lines from two medicines deleted earlier.
- Every write from the UI must check `res.ok`. The POS checkout did not, and printed a receipt for
  sales the server had rejected.

## Known gaps (not bugs to "fix" incidentally — confirm before changing)

- **Auth is decorative.** [src/lib/auth.ts](src/lib/auth.ts) holds hardcoded plaintext credentials,
  compared client-side, with the session in `localStorage` under `fc_auth`. API routes are
  completely unauthenticated — anyone who can reach the deployment can read and write everything.
- **Settings don't persist.** [settings/page.tsx](src/app/settings/page.tsx) `handleSave` only
  flashes a confirmation; `AppSettings` always comes back from `defaultSettings` in `src/lib/data.ts`.
- `invoiceNumber` from `count()+1` will collide if two sales are created concurrently.
- `src/lib/data.ts` still exports empty/zeroed `medicines`, `sales`, `dailySalesData` arrays left
  over from the mock-data era; only `defaultSettings` and `medicineCategories` are still used.
- `npm run lint` reports ~44 pre-existing problems (unused vars, `react-hooks/set-state-in-effect`).
  That is the baseline — the build does not gate on it. Don't treat them as newly introduced.

## Neon cold starts

Neon auto-suspends when idle; waking takes a few seconds and connections opened during that window
fail with `P1001 "Can't reach database server"`. It is almost never a real outage — retry.
Scripts share [scripts/_db.mjs](scripts/_db.mjs), which opens one connection and retries until the
compute wakes before running anything in parallel. Reuse it for any new script.

## Windows: stop the dev server before building

`npm run build` runs `prisma generate` first, which replaces
`node_modules/.prisma/client/query_engine-windows.dll.node`. A running dev server holds that DLL
open, so the rename fails with `EPERM: operation not permitted` and leaves ~19 MB
`query_engine-windows.dll.node.tmp<pid>` files behind. Stop the dev server first; delete any stray
`.tmp*` files in that folder if a build already failed this way.

## Commands

```bash
npm run dev            # localhost:3000
npm run build          # prisma generate && next build
npm run lint
npm run db:studio      # Prisma Studio against PRODUCTION — read carefully before editing
node scripts/backup-db.mjs [name]            # snapshot Neon → backups/<name>.json
node scripts/restore-db.mjs [name]           # DRY RUN by default
node scripts/restore-db.mjs [name] --confirm # DESTRUCTIVE: replaces all data
```
