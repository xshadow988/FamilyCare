/**
 * In-browser sandbox for the `demo` account.
 *
 * Everything a demo user does is kept in localStorage and never sent anywhere.
 * There is deliberately no network call in this file — that is the guarantee
 * that a demo session cannot read or modify the live pharmacy database, no
 * matter what the UI does.
 *
 * The shapes returned here mirror the real /api routes exactly, so the pages
 * cannot tell the difference.
 */
import type { Medicine, Sale, Purchase, SaleItem } from './types';

const KEY = 'fc_demo_data';
export const DEMO_TTL_MS = 24 * 60 * 60 * 1000; // wipe an abandoned session after 24h

interface DemoData {
  createdAt: number;
  medicines: Medicine[];
  categories: string[];
  sales: Sale[];
  purchases: Purchase[];
}

const blank = (): DemoData => ({
  createdAt: Date.now(),
  medicines: [],
  categories: [],
  sales: [],
  purchases: [],
});

/** The stored record exactly as written, or null. Never substitutes a fresh one. */
function readRaw(): DemoData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DemoData) : null;
  } catch {
    return null;
  }
}

function isExpired(d: DemoData | null): boolean {
  return !!d && (!d.createdAt || Date.now() - d.createdAt > DEMO_TTL_MS);
}

function read(): DemoData {
  const stored = readRaw();
  if (!stored) return blank();
  // Expired sandboxes start over rather than showing yesterday's pitch.
  if (isExpired(stored)) {
    resetDemoData();
    return blank();
  }
  return { ...blank(), ...stored };
}

function write(data: DemoData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked — the sandbox just won't persist across reloads.
  }
}

/** Wipe the sandbox. Called on logout and when a demo session starts. */
export function resetDemoData() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/**
 * Milliseconds until this sandbox auto-expires; 0 once expired.
 * Reads the stored timestamp directly — going through read() would hand back a
 * freshly-stamped blank record and this could never report an expiry.
 */
export function demoTimeRemaining(): number {
  const stored = readRaw();
  if (!stored) return DEMO_TTL_MS; // nothing stored yet — a new sandbox is fine
  if (isExpired(stored)) return 0;
  return Math.max(0, stored.createdAt + DEMO_TTL_MS - Date.now());
}

const id = () => `demo_${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
const seq = (prefix: string, n: number) =>
  `${prefix}-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;

/**
 * Handle one API call against the sandbox. Mirrors the corresponding route in
 * src/app/api/. Returns the same JSON the real endpoint would.
 */
export function handleDemoRequest(path: string, method: string, body: unknown): unknown {
  const data = read();
  const url = path.split('?')[0];
  const m = method.toUpperCase();

  // ---- medicines ---------------------------------------------------------
  if (url === '/api/medicines') {
    if (m === 'GET') return data.medicines;
    if (m === 'POST') {
      const b = body as Partial<Medicine>;
      const created: Medicine = {
        id: id(),
        name: b.name ?? '',
        category: b.category ?? '',
        stock: b.stock ?? 0,
        unit: b.unit ?? '',
        purchasePrice: b.purchasePrice ?? 0,
        sellingPrice: b.sellingPrice ?? 0,
        minStock: b.minStock ?? 50,
        tabletsPerStrip: b.tabletsPerStrip ?? 1,
      };
      data.medicines.push(created);
      write(data);
      return created;
    }
  }
  if (url.startsWith('/api/medicines/')) {
    const medId = decodeURIComponent(url.slice('/api/medicines/'.length));
    const idx = data.medicines.findIndex(x => x.id === medId);
    if (m === 'PUT') {
      if (idx === -1) return { error: 'Not found' };
      const b = body as Partial<Medicine>;
      data.medicines[idx] = {
        ...data.medicines[idx],
        ...b,
        tabletsPerStrip: b.tabletsPerStrip ?? 1,
      };
      write(data);
      return data.medicines[idx];
    }
    if (m === 'DELETE') {
      data.medicines = data.medicines.filter(x => x.id !== medId);
      write(data);
      return { ok: true };
    }
  }

  // ---- categories --------------------------------------------------------
  if (url === '/api/categories') {
    if (m === 'GET') return [...data.categories].sort((a, b) => a.localeCompare(b));
    if (m === 'POST') {
      const name = (body as { name?: string })?.name ?? '';
      if (name && !data.categories.includes(name)) data.categories.push(name);
      write(data);
      return { name };
    }
  }
  if (url.startsWith('/api/categories/') && m === 'DELETE') {
    const name = decodeURIComponent(url.slice('/api/categories/'.length));
    data.categories = data.categories.filter(c => c !== name);
    write(data);
    return { ok: true };
  }

  // ---- sales -------------------------------------------------------------
  if (url === '/api/sales') {
    if (m === 'GET') return data.sales;
    if (m === 'POST') {
      const b = body as Omit<Sale, 'id' | 'invoiceNumber'> & { items: SaleItem[] };
      const sale: Sale = {
        id: id(),
        invoiceNumber: seq('INV', data.sales.length + 1),
        date: new Date(b.date).toISOString(),
        items: b.items.map(i => ({ ...i })),
        subtotal: b.subtotal,
        tax: b.tax ?? 0,
        discount: b.discount ?? 0,
        total: b.total,
        paymentMethod: b.paymentMethod,
        cashierName: b.cashierName,
        customerName: b.customerName,
        status: b.status ?? 'completed',
      };
      data.sales.unshift(sale);
      // Same stock effect as the real route: quantity is in tablets.
      for (const item of sale.items) {
        const med = data.medicines.find(x => x.id === item.medicineId);
        if (med) med.stock -= item.quantity;
      }
      write(data);
      return sale;
    }
  }
  if (url.startsWith('/api/sales/') && url.endsWith('/revert') && m === 'POST') {
    const saleId = decodeURIComponent(url.slice('/api/sales/'.length, -'/revert'.length));
    const sale = data.sales.find(s => s.id === saleId);
    if (!sale) return { error: 'Sale not found' };
    if (sale.status !== 'completed') return { error: 'Only completed sales can be reverted' };
    sale.status = 'refunded';
    for (const item of sale.items) {
      const med = data.medicines.find(x => x.id === item.medicineId);
      if (med) med.stock += item.quantity;
    }
    write(data);
    return { ok: true };
  }

  // ---- purchases ---------------------------------------------------------
  if (url === '/api/purchases') {
    if (m === 'GET') return data.purchases;
    if (m === 'POST') {
      const b = body as Partial<Purchase> & { tabletsPerStrip?: number };
      const tps = Math.max(1, Math.floor(b.tabletsPerStrip ?? 1));
      const purchase: Purchase = {
        id: id(),
        date: new Date(b.date ?? Date.now()).toISOString(),
        medicineId: b.medicineId ?? '',
        medicineName: b.medicineName ?? '',
        quantity: b.quantity ?? 0,
        purchasePrice: b.purchasePrice ?? 0,
        sellingPrice: typeof b.sellingPrice === 'number' ? b.sellingPrice : 0,
        total: b.total ?? 0,
        invoiceNumber: b.invoiceNumber || seq('PO', data.purchases.length + 1),
        status: 'received',
      };
      data.purchases.unshift(purchase);
      // quantity is in STRIPS; stock is tracked in tablets — as the real route does.
      const med = data.medicines.find(x => x.id === purchase.medicineId);
      if (med) {
        med.stock += purchase.quantity * tps;
        med.purchasePrice = purchase.purchasePrice;
        med.tabletsPerStrip = tps;
        if (purchase.sellingPrice > 0) med.sellingPrice = purchase.sellingPrice;
      }
      write(data);
      return purchase;
    }
  }
  if (url.startsWith('/api/purchases/') && m === 'DELETE') {
    const pId = decodeURIComponent(url.slice('/api/purchases/'.length));
    const purchase = data.purchases.find(p => p.id === pId);
    if (!purchase) return { error: 'Purchase not found' };
    const med = data.medicines.find(x => x.id === purchase.medicineId);
    if (med) {
      med.stock = Math.max(0, med.stock - purchase.quantity * Math.max(1, med.tabletsPerStrip));
    }
    data.purchases = data.purchases.filter(p => p.id !== pId);
    write(data);
    return { ok: true };
  }

  // ---- reset -------------------------------------------------------------
  if (url === '/api/reset' && m === 'POST') {
    resetDemoData();
    return { ok: true };
  }

  return { error: `Unhandled demo route: ${m} ${url}` };
}
