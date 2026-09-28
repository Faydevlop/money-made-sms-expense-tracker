import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
import { FILTER_METHODS, INCOME, UNCATEGORIZED } from '../constants/categories';
import { useAccounts, useFilteredTransactions } from '../hooks/useTransactionData';
import { useNow } from '../hooks/useNow';
import { useTransactionStore } from '../store/transactionStore';
import { SortKey, TypeFilter, useUiStore } from '../store/uiStore';
import { PeriodChips } from './DateFilter';
import { BottomSheet } from './sheets/BottomSheet';
import { Chip, PillButton, Segmented } from './ui/controls';
import { T } from './ui/T';

const TYPES: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in', label: 'Received' },
  { key: 'out', label: 'Spent' },
  { key: 'unc', label: 'Uncateg.' },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'high', label: 'Highest amount' },
  { key: 'low', label: 'Lowest amount' },
];

function Label({ children, first }: { children: string; first?: boolean }) {
  return (
    <T size={15} w={600} i style={{ marginTop: first ? 12 : 18, marginBottom: 8 }}>
      {children}
    </T>
  );
}

export function FilterSheet() {
  const now = useNow();
  const filters = useUiStore(s => s.filters);
  const setFilters = useUiStore(s => s.setFilters);
  const toggleIn = useUiStore(s => s.toggleIn);
  const resetFilters = useUiStore(s => s.resetFilters);
  const closeSheet = useUiStore(s => s.closeSheet);
  const categories = useTransactionStore(s => s.categories);
  const accounts = useAccounts();
  const { list } = useFilteredTransactions(now);
  const catNames = [...categories.filter(c => c.name !== INCOME).map(c => c.name), UNCATEGORIZED];

  return (
    <BottomSheet
      title="Filter & sort"
      onClose={closeSheet}
      footer={
        <View style={styles.footer}>
          <PillButton label="Reset" variant="soft" onPress={resetFilters} style={styles.reset} />
          <PillButton label={`Show ${list.length} transaction${list.length === 1 ? '' : 's'}`} onPress={closeSheet} style={styles.show} />
        </View>
      }>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <Label first>Show</Label>
        <Segmented options={TYPES} value={filters.type} onChange={type => setFilters({ type })} />
        <Label>Date range</Label>
        <PeriodChips now={now} variant="sheet" />
        <Label>Category</Label>
        <View style={styles.wrap}>
          {catNames.map(c => (
            <Chip key={c} variant="sheet" label={c} on={filters.categories.includes(c)} onPress={() => toggleIn('categories', c)} />
          ))}
        </View>
        <Label>Payment method</Label>
        <View style={styles.wrap}>
          {FILTER_METHODS.map(m => (
            <Chip key={m} variant="sheet" label={m} on={filters.methods.includes(m)} onPress={() => toggleIn('methods', m)} />
          ))}
        </View>
        {accounts.length ? (
          <>
            <Label>Bank / account</Label>
            <View style={styles.wrap}>
              {accounts.map(a => (
                <Chip key={a.key} variant="sheet" label={a.label} on={filters.accounts.includes(a.key)} onPress={() => toggleIn('accounts', a.key)} />
              ))}
            </View>
          </>
        ) : null}
        <T size={15} w={600} i style={styles.sortLabel}>
          Sort by
        </T>
        {SORTS.map(o => {
          const on = filters.sort === o.key;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setFilters({ sort: o.key })}
              style={styles.radioRow}>
              <View style={[styles.radio, { borderColor: on ? colors.ink : colors.radioOff }]}>
                <View style={[styles.radioDot, { backgroundColor: on ? colors.ink : 'transparent' }]} />
              </View>
              <T size={15} w={600} i>
                {o.label}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  body: { paddingHorizontal: 22, paddingBottom: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortLabel: { marginTop: 18, marginBottom: 4 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, padding: 3 },
  radioDot: { flex: 1, borderRadius: 999 },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  reset: { flex: 1 },
  show: { flex: 2 },
});
