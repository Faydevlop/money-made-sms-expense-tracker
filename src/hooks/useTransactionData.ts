import { useMemo } from 'react';
import { MonthBounds } from '../components/DateFilter';
import { queryTransactions } from '../services/transactionQuery';
import { useTransactionStore } from '../store/transactionStore';
import { useUiStore } from '../store/uiStore';
import { accountKey, accountShort } from '../utils/transactionUtils';
import { monthIndexOf } from '../utils/dateUtils';

export function useFilteredTransactions(now: number) {
  const all = useTransactionStore(s => s.transactions);
  const filters = useUiStore(s => s.filters);
  const month = useUiStore(s => s.month);
  return useMemo(() => queryTransactions(all, filters, month, now), [all, filters, month, now]);
}

/** Months a user can browse: from the oldest transaction to next month. */
export function useMonthBounds(now: number): MonthBounds {
  const all = useTransactionStore(s => s.transactions);
  return useMemo(() => {
    const cur = monthIndexOf(now);
    const oldest = all.length ? monthIndexOf(all[all.length - 1].timestamp) : cur;
    return { min: Math.min(oldest, cur), max: cur + 1 };
  }, [all, now]);
}

/** Distinct bank/accounts seen in transactions, for filters and settings. */
export function useAccounts() {
  const all = useTransactionStore(s => s.transactions);
  return useMemo(() => {
    const m = new Map<string, { key: string; label: string; bank: string | null; account: string | null; count: number; sender: string | null }>();
    for (const t of all) {
      if (!t.bank && !t.account) continue;
      const k = accountKey(t);
      const e = m.get(k);
      if (e) {
        e.count++;
        // Prefer the longest (most informative) masked number for display.
        if (t.account && (e.account?.length ?? 0) < t.account.length) {
          e.account = t.account;
          e.label = accountShort(t);
        }
      }
      else m.set(k, { key: k, label: accountShort(t), bank: t.bank, account: t.account, count: 1, sender: t.smsSender });
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [all]);
}
