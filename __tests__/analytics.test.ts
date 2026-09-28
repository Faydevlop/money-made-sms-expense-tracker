import {
  analyticsReport,
  categoryBreakdown,
  monthDailyBuckets,
  reviewSummary,
  spendingEstimate,
  topSpendingDays,
  totals,
} from '../src/services/analyticsService';
import {
  inRange,
  monthIndexOf,
  monthName,
  monthRange,
  periodRange,
} from '../src/utils/dateUtils';
import { formatINR, formatSigned, groupIndian } from '../src/utils/currencyUtils';
import { maskAccount } from '../src/utils/transactionUtils';
import { NOW } from './fixtures/smsFixtures';
import { tx } from './helpers';

const sep = (d: number, h = 12) => new Date(2026, 8, d, h, 0).getTime();
const aug = (d: number) => new Date(2026, 7, d, 12, 0).getTime();

const DATA = [
  tx({ timestamp: sep(28), amount: 450, category: 'Food' }),
  tx({ timestamp: sep(28, 9), amount: 37900, type: 'income', category: 'Income' }),
  tx({ timestamp: sep(27), amount: 1299, category: 'Shopping' }),
  tx({ timestamp: sep(26), amount: 1200, category: null, isCategorized: false }),
  tx({ timestamp: sep(22), amount: 5000, type: 'transfer', category: 'Transfers' }),
  tx({ timestamp: sep(20), amount: 800, category: 'Food', isExcluded: true }),
  tx({ timestamp: sep(10), amount: 2301, category: 'Bills' }),
  tx({ timestamp: sep(1), amount: 250, type: 'unknown', category: null, isCategorized: false }),
  tx({ timestamp: aug(15), amount: 3000, category: 'Food' }),
];

describe('date filtering', () => {
  it('month ranges and names', () => {
    const idx = monthIndexOf(NOW);
    expect(monthName(idx)).toBe('September 2026');
    const [a, b] = monthRange(idx);
    expect(new Date(a).getDate()).toBe(1);
    expect(new Date(b).getMonth()).toBe(9);
    expect(monthName(idx + 1)).toBe('October 2026');
    expect(monthName(idx - 1)).toBe('August 2026');
  });

  it('periods resolve to the right ranges', () => {
    const idx = monthIndexOf(NOW);
    const today = periodRange('today', NOW, idx);
    expect(inRange(DATA, today.start, today.end)).toHaveLength(2);
    const week = periodRange('week', NOW, idx);
    expect(inRange(DATA, week.start, week.end)).toHaveLength(5);
    const month = periodRange('month', NOW, idx);
    expect(inRange(DATA, month.start, month.end)).toHaveLength(8);
    const prev = periodRange('prev', NOW, idx);
    expect(prev.label).toBe('August 2026');
    expect(inRange(DATA, prev.start, prev.end)).toHaveLength(1);
  });

  it('custom range is inclusive of the end date and tolerates reversed input', () => {
    const r = periodRange('custom', NOW, monthIndexOf(NOW), { from: '2026-09-27', to: '2026-09-26' });
    expect(inRange(DATA, r.start, r.end)).toHaveLength(2);
  });

  it('invalid custom dates fall back to the selected month', () => {
    const r = periodRange('custom', NOW, monthIndexOf(NOW), { from: 'nope', to: '2026-13-45' });
    expect(r.label).toBe('September 2026');
  });
});

describe('monthly calculations', () => {
  const [a, b] = monthRange(monthIndexOf(NOW));
  const sepTx = inRange(DATA, a, b);

  it('totals exclude transfers, excluded and unknown transactions', () => {
    const t = totals(sepTx);
    expect(t.spent).toBe(450 + 1299 + 1200 + 2301);
    expect(t.received).toBe(37900);
    expect(t.net).toBe(37900 - 5250);
    expect(t.count).toBe(5);
  });

  it('category breakdown is sorted, sums to 100% and labels uncategorized', () => {
    const c = categoryBreakdown(sepTx);
    expect(c[0].name).toBe('Bills');
    expect(c.map(x => x.name)).toContain('Uncategorized');
    expect(c.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1);
  });

  it('daily buckets cover every day and mark future days', () => {
    const buckets = monthDailyBuckets(DATA, monthIndexOf(NOW), NOW);
    expect(buckets).toHaveLength(30);
    expect(buckets[27].value).toBe(450);
    expect(buckets[29].future).toBe(true);
  });

  it('top spending days', () => {
    const days = topSpendingDays(sepTx);
    expect(days[0].amount).toBe(2301);
    expect(days).toHaveLength(3);
  });

  it('review summary counts uncategorized non-income transactions', () => {
    const r = reviewSummary(DATA);
    expect(r.count).toBe(2);
    expect(r.total).toBe(1450);
  });

  it('analytics report compares against the previous period', () => {
    const rep = analyticsReport(DATA, 'month', NOW);
    expect(rep.label).toBe('September 2026');
    expect(rep.totals.spent).toBe(5250);
    expect(rep.deltaVsPrevious).toBeCloseTo((5250 - 3000) / 3000);
    expect(rep.avgPerDay).toBeCloseTo(5250 / 28);
    expect(rep.savingsRate).toBeCloseTo((37900 - 5250) / 37900);
    expect(analyticsReport(DATA, 'week', NOW).buckets).toHaveLength(7);
    expect(analyticsReport(DATA, '6m', NOW).buckets).toHaveLength(6);
    expect(analyticsReport(DATA, 'year', NOW).buckets).toHaveLength(12);
  });
});

describe('spending estimate', () => {
  it('extrapolates the average daily spend over the rest of the month', () => {
    const e = spendingEstimate(DATA, NOW);
    expect(e.current).toBe(5250);
    expect(e.dayOfMonth).toBe(28);
    expect(e.daysInMonth).toBe(30);
    expect(e.avgPerDay).toBeCloseTo(5250 / 28);
    expect(e.estimated).toBeCloseTo(5250 + (5250 / 28) * 2);
    expect(e.remainingDays).toBe(2);
    expect(e.progress).toBeCloseTo(5250 / e.estimated);
  });

  it('matches the example in the brief', () => {
    // ₹24,500 spent by day 24 of a 31-day month → ~₹1,021/day → ~₹31,646
    const now = new Date(2026, 9, 24, 18, 0).getTime();
    const list = [tx({ timestamp: new Date(2026, 9, 3).getTime(), amount: 24500 })];
    const e = spendingEstimate(list, now);
    expect(Math.round(e.avgPerDay)).toBe(1021);
    expect(Math.round(e.estimated)).toBe(31646);
  });

  it('is zero with no spending', () => {
    const e = spendingEstimate([], NOW);
    expect(e.estimated).toBe(0);
    expect(e.progress).toBe(0);
  });
});

describe('formatting', () => {
  it('uses Indian digit grouping', () => {
    expect(groupIndian(0)).toBe('0');
    expect(groupIndian(999)).toBe('999');
    expect(groupIndian(1000)).toBe('1,000');
    expect(groupIndian(123456)).toBe('1,23,456');
    expect(groupIndian(12345678)).toBe('1,23,45,678');
    expect(formatINR(37900)).toBe('₹37,900');
    expect(formatSigned(-450)).toBe('−₹450');
  });

  it('masks account numbers', () => {
    expect(maskAccount('1234')).toBe('XXXX1234');
    expect(maskAccount('00112233441234')).toBe('XXXX1234');
    expect(maskAccount(null)).toBe('');
  });
});
