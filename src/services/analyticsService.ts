import { chartPalette, colors } from '../constants/colors';
import { UNCATEGORIZED } from '../constants/categories';
import { Transaction } from '../types/transaction';
import {
  addDays,
  DAY_MS,
  daysInMonth,
  inRange,
  monthIndexOf,
  monthName,
  monthRange,
  MONTHS,
  MONTHS_SHORT,
  startOfDay,
  WEEKDAY_INITIALS,
  WEEKDAYS,
} from '../utils/dateUtils';
import { isCounted, needsReview } from '../utils/transactionUtils';

export interface Totals {
  spent: number;
  received: number;
  net: number;
  /** Transactions that count towards totals. */
  count: number;
}

export function totals(list: Transaction[]): Totals {
  let spent = 0;
  let received = 0;
  let count = 0;
  for (const t of list) {
    if (!isCounted(t)) continue;
    count++;
    if (t.type === 'expense') spent += t.amount;
    else if (t.type === 'income') received += t.amount;
  }
  return { spent, received, net: received - spent, count };
}

export const sumSpent = (list: Transaction[]) => totals(list).spent;

export interface CategorySlice {
  key: string;
  name: string;
  amount: number;
  /** 0..1 */
  share: number;
  color: string;
}

export function categoryBreakdown(list: Transaction[]): CategorySlice[] {
  const m = new Map<string, number>();
  for (const t of list) {
    if (!isCounted(t) || t.type !== 'expense') continue;
    const k = t.category ?? UNCATEGORIZED;
    m.set(k, (m.get(k) ?? 0) + t.amount);
  }
  const total = [...m.values()].reduce((a, b) => a + b, 0) || 1;
  let ci = 0;
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({
      key: k,
      name: k,
      amount: v,
      share: v / total,
      color: k === UNCATEGORIZED ? colors.uncategorizedSlice : chartPalette[ci++ % chartPalette.length],
    }));
}

export interface Bucket {
  start: number;
  end: number;
  value: number;
  tick: string;
  label: string;
  future: boolean;
}

function fill(list: Transaction[], raw: Omit<Bucket, 'value' | 'future'>[], now: number): Bucket[] {
  return raw.map(b => ({ ...b, value: sumSpent(inRange(list, b.start, b.end)), future: b.start > now }));
}

const TICK_DAYS = [1, 8, 15, 22, 29];

export function monthDailyBuckets(list: Transaction[], month: number, now: number): Bucket[] {
  const y = Math.floor(month / 12);
  const m = month % 12;
  const raw = [];
  for (let d = 1; d <= daysInMonth(month); d++) {
    const s = new Date(y, m, d).getTime();
    raw.push({
      start: s,
      end: addDays(s, 1),
      tick: TICK_DAYS.includes(d) ? String(d) : '',
      label: `${WEEKDAYS[new Date(s).getDay()]}, ${d} ${MONTHS_SHORT[m]}`,
    });
  }
  return fill(list, raw, now);
}

export function monthWeeklyBuckets(list: Transaction[], month: number, now: number): Bucket[] {
  const y = Math.floor(month / 12);
  const m = month % 12;
  const dim = daysInMonth(month);
  const [, monthEnd] = monthRange(month);
  const raw = [];
  for (let d = 1; d <= dim; d += 7) {
    const s = new Date(y, m, d).getTime();
    const last = Math.min(d + 6, dim);
    raw.push({
      start: s,
      end: Math.min(new Date(y, m, d + 7).getTime(), monthEnd),
      tick: `${d}–${last}`,
      label: `${d}–${last} ${MONTHS_SHORT[m]}`,
    });
  }
  return fill(list, raw, now);
}

export interface SpendingEstimate {
  current: number;
  avgPerDay: number;
  estimated: number;
  remainingDays: number;
  dayOfMonth: number;
  daysInMonth: number;
  /** current / estimated, 0..1 */
  progress: number;
  moreExpected: number;
}

/**
 * Projects month-end spending by extrapolating the average daily spend so far
 * over the remaining days of the current month. This is an estimate only.
 */
export function spendingEstimate(list: Transaction[], now: number): SpendingEstimate {
  const month = monthIndexOf(now);
  const [start, end] = monthRange(month);
  const current = sumSpent(inRange(list, start, end));
  const dim = daysInMonth(month);
  const day = new Date(now).getDate();
  const avgPerDay = current / day;
  const estimated = current + avgPerDay * (dim - day);
  return {
    current,
    avgPerDay,
    estimated,
    remainingDays: dim - day,
    dayOfMonth: day,
    daysInMonth: dim,
    progress: estimated > 0 ? current / estimated : 0,
    moreExpected: estimated - current,
  };
}

export interface TopDay {
  day: number;
  amount: number;
  count: number;
  biggest: Transaction;
}

export function topSpendingDays(list: Transaction[], n = 3): TopDay[] {
  const byDay = new Map<number, Transaction[]>();
  for (const t of list) {
    if (!isCounted(t) || t.type !== 'expense') continue;
    const k = startOfDay(t.timestamp);
    byDay.set(k, [...(byDay.get(k) ?? []), t]);
  }
  return [...byDay.entries()]
    .map(([day, arr]) => ({
      day,
      amount: arr.reduce((s, t) => s + t.amount, 0),
      count: arr.length,
      biggest: [...arr].sort((a, b) => b.amount - a.amount)[0],
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n);
}

export type AnalyticsRange = 'week' | 'month' | '3m' | '6m' | 'year';

export interface AnalyticsReport {
  label: string;
  start: number;
  end: number;
  buckets: Bucket[];
  totals: Totals;
  avgPerDay: number;
  /** Relative change vs the previous equivalent period; null when unavailable. */
  deltaVsPrevious: number | null;
  incomeCount: number;
  savingsRate: number | null;
  categories: CategorySlice[];
  topDays: TopDay[];
}

function rangeLabel(a: number, bInclusive: number): string {
  const da = new Date(a);
  const db = new Date(bInclusive);
  if (da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === 1 && addDays(bInclusive, 1) === monthRange(monthIndexOf(a))[1]) {
    return `${MONTHS[da.getMonth()]} ${da.getFullYear()}`;
  }
  if (da.getDate() === 1 && addDays(bInclusive, 1) === monthRange(monthIndexOf(bInclusive))[1]) {
    const sameYear = da.getFullYear() === db.getFullYear();
    return `${MONTHS_SHORT[da.getMonth()]}${sameYear ? '' : ' ' + da.getFullYear()} – ${MONTHS_SHORT[db.getMonth()]} ${db.getFullYear()}`;
  }
  const sameMonth = da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear();
  return `${da.getDate()}${sameMonth ? '' : ' ' + MONTHS_SHORT[da.getMonth()]} – ${db.getDate()} ${MONTHS_SHORT[db.getMonth()]} ${db.getFullYear()}`;
}

export function analyticsReport(all: Transaction[], range: AnalyticsRange, now: number): AnalyticsReport {
  const t0 = startOfDay(now);
  const cur = monthIndexOf(now);
  let start: number;
  let end: number;
  let prevStart: number | null;
  let prevEnd: number | null;
  const raw: Omit<Bucket, 'value' | 'future'>[] = [];

  const daily = (from: number, n: number, weekTicks: boolean) => {
    for (let i = 0; i < n; i++) {
      const s = addDays(from, i);
      const d = new Date(s);
      raw.push({
        start: s,
        end: addDays(s, 1),
        tick: weekTicks ? WEEKDAY_INITIALS[d.getDay()] : TICK_DAYS.includes(d.getDate()) ? String(d.getDate()) : '',
        label: `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`,
      });
    }
  };
  const monthly = (from: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const [s, e] = monthRange(from + i);
      raw.push({ start: s, end: e, tick: MONTHS_SHORT[(from + i) % 12].slice(0, n > 6 ? 1 : 3), label: monthName(from + i) });
    }
  };

  switch (range) {
    case 'week':
      start = addDays(t0, -6);
      end = addDays(t0, 1);
      prevStart = addDays(start, -7);
      prevEnd = start;
      daily(start, 7, true);
      break;
    case 'month':
      [start, end] = monthRange(cur);
      [prevStart, prevEnd] = monthRange(cur - 1);
      daily(start, daysInMonth(cur), false);
      break;
    case '3m': {
      start = monthRange(cur - 2)[0];
      end = monthRange(cur)[1];
      prevStart = monthRange(cur - 5)[0];
      prevEnd = start;
      let i = 0;
      for (let s = start; s < end; s = addDays(s, 7), i++) {
        const d = new Date(s);
        const e = Math.min(addDays(s, 7), end);
        const de = new Date(addDays(e, -1));
        raw.push({
          start: s,
          end: e,
          tick: i % 4 === 0 ? `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` : '',
          label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} – ${de.getDate()} ${MONTHS_SHORT[de.getMonth()]}`,
        });
      }
      break;
    }
    case '6m':
      start = monthRange(cur - 5)[0];
      end = monthRange(cur)[1];
      prevStart = monthRange(cur - 11)[0];
      prevEnd = start;
      monthly(cur - 5, 6);
      break;
    case 'year':
    default:
      start = monthRange(cur - 11)[0];
      end = monthRange(cur)[1];
      prevStart = monthRange(cur - 23)[0];
      prevEnd = start;
      monthly(cur - 11, 12);
      break;
  }

  const list = inRange(all, start, end);
  const tot = totals(list);
  const elapsedDays = Math.max(1, Math.round((Math.min(end, addDays(t0, 1)) - start) / DAY_MS));
  let deltaVsPrevious: number | null = null;
  if (prevStart != null && prevEnd != null) {
    const ps = sumSpent(inRange(all, prevStart, prevEnd));
    if (ps > 0) deltaVsPrevious = (tot.spent - ps) / ps;
  }
  return {
    label: rangeLabel(start, addDays(end, -1)),
    start,
    end,
    buckets: fill(list, raw, now),
    totals: tot,
    avgPerDay: tot.spent / elapsedDays,
    deltaVsPrevious,
    incomeCount: list.filter(t => isCounted(t) && t.type === 'income').length,
    savingsRate: tot.received > 0 ? tot.net / tot.received : null,
    categories: categoryBreakdown(list),
    topDays: topSpendingDays(list),
  };
}

export interface ReviewSummary {
  count: number;
  total: number;
  items: Transaction[];
}

export function reviewSummary(all: Transaction[]): ReviewSummary {
  const items = all.filter(needsReview);
  return { count: items.length, total: items.reduce((a, t) => a + t.amount, 0), items };
}
