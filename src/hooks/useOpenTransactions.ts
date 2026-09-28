import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { DEFAULT_FILTERS, Filters, useUiStore } from '../store/uiStore';
import { addDays, monthIndexOf, monthRange, toIsoDate } from '../utils/dateUtils';

export interface DrillDown {
  /** Show a specific month. */
  month?: number;
  /** Or an explicit [start, end) range. */
  range?: { start: number; end: number };
  filters?: Partial<Pick<Filters, 'type' | 'categories' | 'methods' | 'accounts' | 'query'>>;
}

/**
 * Opens the Transactions tab with a fresh filter set — used for drill-downs
 * from totals, categories, chart days, accounts, etc.
 */
export function useOpenTransactions() {
  const nav = useNavigation();
  return useCallback(
    (d: DrillDown = {}) => {
      const ui = useUiStore.getState();
      const base: Filters = { ...DEFAULT_FILTERS, customFrom: ui.filters.customFrom, customTo: ui.filters.customTo, ...d.filters };
      if (d.range) {
        const monthOfStart = monthIndexOf(d.range.start);
        const [ms, me] = monthRange(monthOfStart);
        if (d.range.start === ms && d.range.end === me) {
          ui.setMonth(monthOfStart);
          ui.setFilters({ ...base, period: 'month' });
        } else {
          ui.setFilters({
            ...base,
            period: 'custom',
            customFrom: toIsoDate(d.range.start),
            customTo: toIsoDate(addDays(d.range.end, -1)),
          });
        }
      } else {
        ui.setMonth(d.month ?? ui.month);
        ui.setFilters({ ...base, period: 'month' });
      }
      ui.setSearchOn(!!d.filters?.query);
      nav.navigate('Tabs', { screen: 'Transactions' });
    },
    [nav],
  );
}
