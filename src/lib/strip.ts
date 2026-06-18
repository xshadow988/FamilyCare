import { Medicine } from './types';

/** Tablets per strip, never less than 1 (1 = a non-divisible unit like a bottle). */
export const tpt = (m: { tabletsPerStrip?: number }) => Math.max(1, Math.floor(m.tabletsPerStrip ?? 1));

/** Per-tablet price derived from a per-strip price. */
export const perTablet = (pricePerStrip: number, tabletsPerStrip: number) =>
  pricePerStrip / Math.max(1, tabletsPerStrip);

/** Split a total-tablet count into whole strips + loose tablets. */
export const splitStock = (totalTablets: number, tabletsPerStrip: number) => {
  const t = Math.max(1, tabletsPerStrip);
  return { strips: Math.floor(totalTablets / t), tablets: totalTablets % t };
};

/** Human-readable stock, e.g. "20 strips + 5 tab" (or just "20" when not strip-based). */
export const formatStock = (totalTablets: number, tabletsPerStrip: number) => {
  const t = Math.max(1, tabletsPerStrip);
  if (t <= 1) return `${totalTablets}`;
  const { strips, tablets } = splitStock(totalTablets, t);
  const stripPart = `${strips} strip${strips === 1 ? '' : 's'}`;
  return tablets > 0 ? `${stripPart} + ${tablets} tab` : stripPart;
};

/** Low-stock when remaining tablets are at/under minStock strips' worth (but > 0). */
export const isLowStock = (m: Medicine) => m.stock > 0 && m.stock <= m.minStock * tpt(m);
export const isOutStock = (m: Medicine) => m.stock <= 0;
