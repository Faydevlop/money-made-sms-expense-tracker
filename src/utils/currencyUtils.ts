export const MINUS = '−';

/**
 * Indian digit grouping (12,34,567) implemented by hand so it does not depend
 * on the JS engine's Intl data.
 */
export function groupIndian(n: number): string {
  const rounded = Math.round(Math.abs(n));
  const s = String(rounded);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

/** ₹1,23,456 — sign is not included. */
export function formatINR(n: number): string {
  return '₹' + groupIndian(n);
}

/** ₹1,234 or −₹1,234 */
export function formatSigned(n: number): string {
  return (n < 0 ? MINUS : '') + formatINR(n);
}

/** Parses "1,23,456.78" → 123456.78; returns null when not a finite positive number. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const v = parseFloat(cleaned);
  return Number.isFinite(v) && v > 0 ? v : null;
}
