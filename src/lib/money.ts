import { defaultSettings } from './data';

const CURRENCY = defaultSettings.currencySymbol;

/**
 * Money for display: thousands separators, two decimals, currency symbol.
 * e.g. 5235877 -> "Rs 5,235,877.00"
 *
 * Use this everywhere an amount is shown. Plain `toFixed(2)` prints an
 * unreadable run of digits, which is how a figure like 5235877 ends up on a
 * card. Do NOT use it for the value inside an editable input — those need the
 * raw number, or typing breaks.
 */
export const money = (n: number): string =>
  `${CURRENCY} ${(Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Same, but without the currency symbol. */
export const amount = (n: number): string =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Whole numbers with separators, e.g. 5235877 -> "5,235,877". */
export const count = (n: number): string =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

/** Compact money for chart axes, e.g. 5235877 -> "Rs 5,236k". */
export const moneyShort = (n: number): string =>
  `${CURRENCY} ${Math.round((Number.isFinite(n) ? n : 0) / 1000).toLocaleString('en-US')}k`;
