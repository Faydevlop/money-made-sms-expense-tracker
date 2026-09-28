import { create } from 'zustand';
import { AnalyticsRange } from '../services/analyticsService';
import { monthIndexOf, Period, toIsoDate } from '../utils/dateUtils';

export type TypeFilter = 'all' | 'in' | 'out' | 'unc';
export type SortKey = 'newest' | 'oldest' | 'high' | 'low';

export type Sheet =
  | { kind: 'filter' }
  | { kind: 'period' }
  | { kind: 'category'; txId: string }
  | { kind: 'merchant'; txId: string }
  | { kind: 'type'; txId: string }
  | { kind: 'name' }
  | null;

export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

export interface Filters {
  period: Period;
  type: TypeFilter;
  categories: string[];
  methods: string[];
  /** accountKey() values */
  accounts: string[];
  sort: SortKey;
  query: string;
  customFrom: string;
  customTo: string;
}

const now = Date.now();

export const DEFAULT_FILTERS: Filters = {
  period: 'month',
  type: 'all',
  categories: [],
  methods: [],
  accounts: [],
  sort: 'newest',
  query: '',
  customFrom: toIsoDate(new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime()),
  customTo: toIsoDate(now),
};

interface UiState {
  /** Selected month (year*12+month), shared by Home and Transactions. */
  month: number;
  filters: Filters;
  searchOn: boolean;
  trend: 'daily' | 'weekly';
  analyticsRange: AnalyticsRange;
  /** Selected bar per chart key. */
  selectedBar: Record<string, number>;
  sheet: Sheet;
  rememberRule: boolean;
  toast: Toast | null;
  /** True while a tab screen (with the floating tab bar) is focused. */
  onTabs: boolean;

  setMonth(m: number): void;
  setFilters(patch: Partial<Filters>): void;
  toggleIn(key: 'categories' | 'methods' | 'accounts', value: string): void;
  resetFilters(): void;
  setSearchOn(v: boolean): void;
  setTrend(t: 'daily' | 'weekly'): void;
  setAnalyticsRange(r: AnalyticsRange): void;
  selectBar(key: string, i: number): void;
  openSheet(s: Sheet): void;
  closeSheet(): void;
  setRememberRule(v: boolean): void;
  showToast(message: string, undo?: () => void): void;
  hideToast(): void;
  setOnTabs(v: boolean): void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastSeq = 0;

export const useUiStore = create<UiState>(set => ({
  month: monthIndexOf(now),
  filters: DEFAULT_FILTERS,
  searchOn: false,
  trend: 'daily',
  analyticsRange: 'month',
  selectedBar: {},
  sheet: null,
  rememberRule: true,
  toast: null,
  onTabs: true,

  setMonth: month => set(s => ({ month, filters: { ...s.filters, period: 'month' } })),
  setFilters: patch => set(s => ({ filters: { ...s.filters, ...patch } })),
  toggleIn: (key, value) =>
    set(s => {
      const cur = s.filters[key];
      return { filters: { ...s.filters, [key]: cur.includes(value) ? cur.filter(x => x !== value) : [...cur, value] } };
    }),
  resetFilters: () =>
    set(s => ({
      filters: { ...s.filters, type: 'all', categories: [], methods: [], accounts: [], sort: 'newest', query: '' },
    })),
  setSearchOn: searchOn => set(s => ({ searchOn, filters: searchOn ? s.filters : { ...s.filters, query: '' } })),
  setTrend: trend => set({ trend }),
  setAnalyticsRange: analyticsRange => set({ analyticsRange }),
  selectBar: (key, i) => set(s => ({ selectedBar: { ...s.selectedBar, [key]: i } })),
  openSheet: sheet => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  setRememberRule: rememberRule => set({ rememberRule }),
  showToast: (message, undo) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { id: ++toastSeq, message, undo } });
    toastTimer = setTimeout(() => set({ toast: null }), 3800);
  },
  hideToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: null });
  },
  setOnTabs: onTabs => set({ onTabs }),
}));
