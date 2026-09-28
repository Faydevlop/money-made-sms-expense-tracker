import { UNCATEGORIZED } from '../constants/categories';
import { Transaction } from '../types/transaction';
import { groupLabel, periodRange, startOfDay } from '../utils/dateUtils';
import { accountKey } from '../utils/transactionUtils';
import type { Filters, SortKey } from '../store/uiStore';
import { totals } from './analyticsService';

export interface TransactionGroup {
  key: string;
  label: string;
  /** Spent within the group ("" when nothing spent). */
  spent: number;
  items: Transaction[];
}

export interface QueryResult {
  list: Transaction[];
  groups: TransactionGroup[];
  rangeLabel: string;
  received: number;
  spent: number;
  /** Number of active non-date filters (for the badge and "Clear all"). */
  activeFilters: number;
}

const SORTS: Record<SortKey, (a: Transaction, b: Transaction) => number> = {
  newest: (a, b) => b.timestamp - a.timestamp,
  oldest: (a, b) => a.timestamp - b.timestamp,
  high: (a, b) => b.amount - a.amount,
  low: (a, b) => a.amount - b.amount,
};

/** Applies period + type + category + method + account + search filters, then sorts and groups. */
export function queryTransactions(all: Transaction[], f: Filters, month: number, now: number): QueryResult {
  const range = periodRange(f.period, now, month, { from: f.customFrom, to: f.customTo });
  const q = f.query.trim().toLowerCase();
  const list = all
    .filter(t => t.timestamp >= range.start && t.timestamp < range.end)
    .filter(t => {
      if (f.type === 'in' && t.type !== 'income') return false;
      if (f.type === 'out' && t.type !== 'expense') return false;
      if (f.type === 'unc' && t.isCategorized) return false;
      if (f.categories.length && !f.categories.includes(t.category ?? UNCATEGORIZED)) return false;
      if (f.methods.length && !f.methods.includes(t.paymentMethod)) return false;
      if (f.accounts.length && !f.accounts.includes(accountKey(t))) return false;
      if (q && !`${t.merchant} ${t.category ?? UNCATEGORIZED} ${t.notes}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort(SORTS[f.sort]);

  let groups: TransactionGroup[] = [];
  if (f.sort === 'newest' || f.sort === 'oldest') {
    const byDay = new Map<number, Transaction[]>();
    for (const t of list) {
      const k = startOfDay(t.timestamp);
      const arr = byDay.get(k);
      if (arr) arr.push(t);
      else byDay.set(k, [t]);
    }
    groups = [...byDay.entries()].map(([k, items]) => ({
      key: String(k),
      label: groupLabel(k, now),
      spent: totals(items).spent,
      items,
    }));
  } else if (list.length) {
    groups = [{ key: f.sort, label: f.sort === 'high' ? 'Highest amount first' : 'Lowest amount first', spent: 0, items: list }];
  }

  const tot = totals(list);
  const activeFilters =
    (f.type !== 'all' ? 1 : 0) + f.categories.length + f.methods.length + f.accounts.length;
  return { list, groups, rangeLabel: range.label, received: tot.received, spent: tot.spent, activeFilters };
}
