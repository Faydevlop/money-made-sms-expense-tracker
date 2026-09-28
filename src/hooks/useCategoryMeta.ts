import { useMemo } from 'react';
import { colors } from '../constants/colors';
import { UNCATEGORIZED } from '../constants/categories';
import { useTransactionStore } from '../store/transactionStore';
import { Transaction } from '../types/transaction';

export interface CategoryMeta {
  icon: string;
  color: string;
}

export type CategoryMetaMap = (name: string | null) => CategoryMeta;

export function useCategoryMeta(): CategoryMetaMap {
  const categories = useTransactionStore(s => s.categories);
  return useMemo(() => {
    const m = new Map(categories.map(c => [c.name, { icon: c.icon, color: c.color }]));
    return (name: string | null) => {
      if (!name || name === UNCATEGORIZED) return { icon: 'help', color: colors.redBg };
      return m.get(name) ?? { icon: 'dot', color: colors.soft2 };
    };
  }, [categories]);
}

/** Tile colours for a transaction row / detail hero, following the design's rules. */
export function tileColors(t: Transaction, meta: CategoryMetaMap): { bg: string; fg: string; icon: string } {
  const m = meta(t.category);
  if (t.type === 'income') return { bg: colors.greenBg, fg: colors.green, icon: m.icon };
  if (!t.isCategorized) return { bg: colors.redBg, fg: colors.redText, icon: 'help' };
  return { bg: m.color, fg: colors.ink, icon: m.icon };
}
