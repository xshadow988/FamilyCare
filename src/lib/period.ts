/**
 * Shared date-period filtering for the report pages.
 *
 * Kept in one place so Purchases, Profits and anything added later agree on
 * what "Weekly" means. Note the deliberate split: the first four are ROLLING
 * windows (last N days), while `thismonth` and `custom` are true calendar
 * ranges with both ends.
 */
export const PERIOD_LABELS: Record<string, string> = {
  all: 'All Time',
  daily: 'Daily (Today)',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly (30 days)',
  thismonth: 'This Month',
  custom: 'Custom Range',
};

export type DateWindow = { from: Date; to: Date };

/** First and last instant of the calendar month containing `d`. */
export const monthBounds = (d: Date): DateWindow => ({
  from: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0),
  to: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
});

/** Start-of-day .. end-of-day around a picked range (`to` may be omitted). */
export const rangeBounds = (from: Date, to?: Date): DateWindow => {
  const f = new Date(from); f.setHours(0, 0, 0, 0);
  const t = new Date(to ?? from); t.setHours(23, 59, 59, 999);
  return { from: f, to: t };
};

/** Cutoff for the rolling periods; null when the period is not rolling. */
export function periodCutoff(period: string): number | null {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  switch (period) {
    case 'daily': { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
    case 'weekly': return now - 7 * dayMs;
    case 'biweekly': return now - 14 * dayMs;
    case 'monthly': return now - 30 * dayMs;
    default: return null;
  }
}

/** True when a record's date falls inside the selected period. */
export function inPeriod(dateStr: string, period: string, window: DateWindow | null): boolean {
  const t = new Date(dateStr).getTime();
  if (window) return t >= window.from.getTime() && t <= window.to.getTime();
  const cutoff = periodCutoff(period);
  return cutoff === null || t >= cutoff;
}
