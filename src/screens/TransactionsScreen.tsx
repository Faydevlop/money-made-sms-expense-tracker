import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../components/common';
import { MonthStrip, PeriodChips } from '../components/DateFilter';
import { FadeIn, ScalePressable, useEntranceWindow } from '../components/motion';
import { TransactionItem } from '../components/TransactionItem';
import { CircleButton } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { fontFamily, T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { useCategoryMeta } from '../hooks/useCategoryMeta';
import { useNow } from '../hooks/useNow';
import {
  useAccounts,
  useFilteredTransactions,
  useMonthBounds,
} from '../hooks/useTransactionData';
import { QueryResult, TransactionGroup } from '../services/transactionQuery';
import { useUiStore } from '../store/uiStore';
import { Transaction } from '../types/transaction';
import { formatINR, MINUS } from '../utils/currencyUtils';

const SORT_LABEL = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  high: 'Highest amount',
  low: 'Lowest amount',
};
const TYPE_LABEL = {
  in: 'Received',
  out: 'Spent',
  unc: 'Uncategorized',
} as const;

function Header({ now, q }: { now: number; q: QueryResult }) {
  const filters = useUiStore(s => s.filters);
  const searchOn = useUiStore(s => s.searchOn);
  const setSearchOn = useUiStore(s => s.setSearchOn);
  const setFilters = useUiStore(s => s.setFilters);
  const toggleIn = useUiStore(s => s.toggleIn);
  const resetFilters = useUiStore(s => s.resetFilters);
  const openSheet = useUiStore(s => s.openSheet);
  const bounds = useMonthBounds(now);
  const accounts = useAccounts();

  const tags = useMemo(() => {
    const out: { key: string; label: string; onPress: () => void }[] = [];
    if (filters.type !== 'all')
      out.push({
        key: 'type',
        label: TYPE_LABEL[filters.type],
        onPress: () => setFilters({ type: 'all' }),
      });
    filters.categories.forEach(c =>
      out.push({
        key: 'c' + c,
        label: c,
        onPress: () => toggleIn('categories', c),
      }),
    );
    filters.methods.forEach(m =>
      out.push({
        key: 'm' + m,
        label: m,
        onPress: () => toggleIn('methods', m),
      }),
    );
    filters.accounts.forEach(a =>
      out.push({
        key: 'a' + a,
        label: accounts.find(x => x.key === a)?.label ?? 'Account',
        onPress: () => toggleIn('accounts', a),
      }),
    );
    return out;
  }, [filters, accounts, setFilters, toggleIn]);

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <T size={30} w={800} i style={styles.flex}>
          Transactions
        </T>
        <CircleButton
          icon="search"
          label="Search"
          size={48}
          onPress={() => setSearchOn(!searchOn)}
        />
        <CircleButton
          icon="filter"
          label="Filter"
          size={48}
          onPress={() => openSheet({ kind: 'filter' })}
        >
          {q.activeFilters > 0 ? (
            <View style={styles.fc}>
              <T size={11} w={800} color={colors.white}>
                {q.activeFilters}
              </T>
            </View>
          ) : null}
        </CircleButton>
      </View>
      {searchOn ? (
        <FadeIn offset={-8} style={styles.searchWrap}>
          <TextInput
            autoFocus
            value={filters.query}
            onChangeText={query => setFilters({ query })}
            placeholder="Search merchant or category"
            placeholderTextColor={colors.muted2}
            style={styles.search}
            returnKeyType="search"
            accessibilityLabel="Search merchant or category"
          />
        </FadeIn>
      ) : null}
      <PeriodChips now={now} />
      {filters.period === 'month' ? <MonthStrip bounds={bounds} /> : null}
      <View style={styles.pills}>
        <View style={[styles.pill, { backgroundColor: colors.white }]}>
          <T size={12} w={700} i>
            {q.list.length} transaction{q.list.length === 1 ? '' : 's'}
          </T>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.greenBg }]}>
          <T size={12} w={700} i color={colors.green}>
            +{formatINR(q.received)}
          </T>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.redBg }]}>
          <T size={12} w={700} i color={colors.redDeep}>
            {MINUS}
            {formatINR(q.spent)}
          </T>
        </View>
        <View style={styles.flex} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change sort"
          onPress={() => openSheet({ kind: 'filter' })}
          style={styles.sort}
        >
          <T size={12} w={700} i>
            {SORT_LABEL[filters.sort]}
          </T>
          <Icon name="cd" size={14} />
        </Pressable>
      </View>
      {tags.length ? (
        <View style={styles.tags}>
          {tags.map((t, i) => (
            <FadeIn key={t.key} index={i} offset={6}>
              <ScalePressable
                accessibilityRole="button"
                accessibilityLabel={`Remove filter ${t.label}`}
                onPress={t.onPress}
                scaleTo={0.92}
                style={styles.tag}
              >
                <T size={12} w={700} i>
                  {t.label} ×
                </T>
              </ScalePressable>
            </FadeIn>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={resetFilters}
            style={styles.clear}
          >
            <T size={12} w={700} i style={styles.underline}>
              Clear all
            </T>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

type Row =
  | { kind: 'head'; key: string; label: string; spent: number }
  | { kind: 'tx'; key: string; t: Transaction; first: boolean; last: boolean };

/**
 * Flattens date groups into one list item per header / transaction so the list
 * is truly virtualized — a busy day no longer renders as one heavy block.
 */
function toRows(groups: TransactionGroup[]): Row[] {
  const rows: Row[] = [];
  for (const g of groups) {
    rows.push({ kind: 'head', key: `h-${g.key}`, label: g.label, spent: g.spent });
    g.items.forEach((t, i) => rows.push({ kind: 'tx', key: t.id, t, first: i === 0, last: i === g.items.length - 1 }));
  }
  return rows;
}

export function TransactionsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const meta = useCategoryMeta();
  const q = useFilteredTransactions(now);
  const query = useUiStore(s => s.filters.query);
  const resetFilters = useUiStore(s => s.resetFilters);
  const filters = useUiStore(s => s.filters);
  const month = useUiStore(s => s.month);
  const openTx = useCallback((id: string) => nav.navigate('TransactionDetails', { id }), [nav]);
  const grouped = q.groups.length > 0 && q.groups[0].key !== 'high' && q.groups[0].key !== 'low';
  const rows = useMemo(() => toRows(q.groups), [q.groups]);

  // Rows animate only right after the result set changes (open / filter / month);
  // rows reached by scrolling render instantly.
  const sig = `${month}|${JSON.stringify(filters)}`;
  const shouldAnimate = useEntranceWindow(sig);

  const renderRow = useCallback(
    ({ item, index }: { item: Row; index: number }) => {
      const animate = shouldAnimate();
      if (item.kind === 'head') {
        return (
          <FadeIn animate={animate} index={index} offset={8}>
            <View style={styles.groupHead}>
              <T size={14} w={700} i color={colors.text2}>
                {item.label}
              </T>
              <T size={14} w={700} i color={colors.text2}>
                {item.spent ? MINUS + formatINR(item.spent) : ''}
              </T>
            </View>
          </FadeIn>
        );
      }
      return (
        <FadeIn animate={animate} index={index} offset={8}>
          <View style={[styles.rowCard, item.first && styles.rowFirst, item.last && styles.rowLast]}>
            <TransactionItem t={item.t} now={now} mode={grouped ? 'time' : 'when'} meta={meta} onPress={openTx} />
          </View>
        </FadeIn>
      );
    },
    [now, meta, openTx, grouped, shouldAnimate],
  );

  const filtered = q.activeFilters > 0 || !!query.trim();

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <FlatList
        data={rows}
        keyExtractor={r => r.key}
        renderItem={renderRow}
        ListHeaderComponent={<Header now={now} q={q} />}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={14}
        maxToRenderPerBatch={12}
        updateCellsBatchingPeriod={30}
        windowSize={11}
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        ListEmptyComponent={
          <FadeIn key={sig} style={styles.mt8}>
            <EmptyState
              icon="search"
              title={filtered ? 'No matching transactions' : 'No transactions'}
              body={filtered ? 'Try removing a filter or choosing a different date range.' : 'Nothing was detected in this period.'}
              cta={q.activeFilters > 0 ? 'Clear filters' : undefined}
              onCta={resetFilters}
            />
          </FadeIn>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { backgroundColor: colors.bg, paddingBottom: 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    paddingRight: 16,
    paddingBottom: 6,
    paddingLeft: 20,
  },
  fc: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 99,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: { paddingVertical: 6, paddingHorizontal: 16 },
  search: {
    minHeight: 50,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.white,
    fontSize: 15,
    fontFamily: fontFamily(400, true),
    color: colors.ink,
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  pill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 99 },
  sort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: colors.lavender,
  },
  clear: { paddingVertical: 6, paddingHorizontal: 4 },
  underline: { textDecorationLine: 'underline' },
  groupHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  rowCard: { marginHorizontal: 16, paddingHorizontal: 16, backgroundColor: colors.white },
  rowFirst: { paddingTop: 4, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  rowLast: { paddingBottom: 4, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  mt8: { marginTop: 8 },
});
