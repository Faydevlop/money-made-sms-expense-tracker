export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3));
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const DAY_MS = 86_400_000;

/** Start of the local day containing ts. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Calendar-aware day offset (DST safe). */
export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes()).getTime();
}

/**
 * Months are addressed by a single integer index: year * 12 + monthIndex.
 * This makes prev/next navigation simple arithmetic.
 */
export function monthIndexOf(ts: number): number {
  const d = new Date(ts);
  return d.getFullYear() * 12 + d.getMonth();
}

export function monthRange(index: number): [number, number] {
  const y = Math.floor(index / 12);
  const m = index % 12;
  return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()];
}

export function monthName(index: number): string {
  return `${MONTHS[index % 12]} ${Math.floor(index / 12)}`;
}

export function daysInMonth(index: number): number {
  const y = Math.floor(index / 12);
  const m = index % 12;
  return new Date(y, m + 1, 0).getDate();
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD in local time. */
export function toIsoDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** HH:mm in local time. */
export function toIsoTime(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Parses YYYY-MM-DD as a local date; returns null when invalid. */
export function parseIsoDate(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2] - 1;
  const d = +m[3];
  const date = new Date(y, mo, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo || date.getDate() !== d) return null;
  return date.getTime();
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  return `${h % 12 || 12}:${pad2(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "Today", "Yesterday", "Sep 12" or "Sep 12, 2025" (year shown when not the current year). */
export function dayName(ts: number, now: number): string {
  const s = startOfDay(ts);
  const t0 = startOfDay(now);
  if (s === t0) return 'Today';
  if (s === addDays(t0, -1)) return 'Yesterday';
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}${sameYear ? '' : ', ' + d.getFullYear()}`;
}

export function formatWhen(ts: number, now: number): string {
  return `${dayName(ts, now)}, ${formatTime(ts)}`;
}

/** Group header, e.g. "Today · Mon, 28 Sep". */
export function groupLabel(ts: number, now: number): string {
  const s = startOfDay(ts);
  const t0 = startOfDay(now);
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  const base = `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${sameYear ? '' : ' ' + d.getFullYear()}`;
  if (s === t0) return 'Today · ' + base;
  if (s === addDays(t0, -1)) return 'Yesterday · ' + base;
  return base;
}

/** "Mon, 28 September 2026 · 9:05 PM" */
export function formatFull(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${formatTime(ts)}`;
}

export function greeting(now: number): string {
  const h = new Date(now).getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export type Period = 'today' | 'week' | 'month' | 'prev' | 'custom';

export interface DateRange {
  start: number;
  /** Exclusive. */
  end: number;
  label: string;
}

/**
 * Resolves a list period to a concrete [start, end) range.
 * `month` uses the selected month index so users can browse history.
 */
export function periodRange(
  period: Period,
  now: number,
  selectedMonth: number,
  custom?: { from: string; to: string },
): DateRange {
  const t0 = startOfDay(now);
  switch (period) {
    case 'today':
      return { start: t0, end: addDays(t0, 1), label: 'Today' };
    case 'week':
      return { start: addDays(t0, -6), end: addDays(t0, 1), label: 'This week' };
    case 'prev': {
      const idx = monthIndexOf(now) - 1;
      const [start, end] = monthRange(idx);
      return { start, end, label: monthName(idx) };
    }
    case 'custom': {
      const from = custom ? parseIsoDate(custom.from) : null;
      const to = custom ? parseIsoDate(custom.to) : null;
      if (from == null || to == null) {
        const [start, end] = monthRange(selectedMonth);
        return { start, end, label: monthName(selectedMonth) };
      }
      const [a, b] = from <= to ? [from, to] : [to, from];
      return { start: a, end: addDays(b, 1), label: 'Custom range' };
    }
    case 'month':
    default: {
      const [start, end] = monthRange(selectedMonth);
      return { start, end, label: monthName(selectedMonth) };
    }
  }
}

export function inRange<T extends { timestamp: number }>(list: T[], start: number, end: number): T[] {
  return list.filter(t => t.timestamp >= start && t.timestamp < end);
}
