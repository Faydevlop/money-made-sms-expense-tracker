import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
import { useUiStore } from '../store/uiStore';
import { monthIndexOf, MONTHS, monthName, Period } from '../utils/dateUtils';
import { FadeIn } from './motion';
import { Chip, CircleButton } from './ui/controls';
import { Icon } from './ui/Icon';
import { T } from './ui/T';

export interface MonthBounds {
  min: number;
  max: number;
}

/** Home: "‹  This month / September 2026  ›" */
export function MonthSwitcher({ bounds, now }: { bounds: MonthBounds; now: number }) {
  const month = useUiStore(s => s.month);
  const setMonth = useUiStore(s => s.setMonth);
  const cur = monthIndexOf(now);
  const kicker = month === cur ? 'This month' : month > cur ? 'Upcoming' : 'Past month';
  return (
    <View style={styles.switcher}>
      <CircleButton icon="cl" label="Previous month" bg={colors.soft} disabled={month <= bounds.min} onPress={() => setMonth(month - 1)} />
      <FadeIn key={month} offset={6} style={styles.flexCenter}>
        <T size={11} w={600} i color={colors.muted2}>
          {kicker}
        </T>
        <T size={16} w={800} i>
          {monthName(month)}
        </T>
      </FadeIn>
      <CircleButton icon="cr" label="Next month" bg={colors.soft} disabled={month >= bounds.max} onPress={() => setMonth(month + 1)} />
    </View>
  );
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'prev', label: 'Previous month' },
  { key: 'custom', label: 'Custom' },
];

function customLabel(from: string, to: string) {
  const f = (s: string) => `${s.slice(8)}/${s.slice(5, 7)}`;
  return `${f(from)} – ${f(to)}`;
}

/** Period chips. `variant="sheet"` is the wrapped version inside the filter sheet. */
export function PeriodChips({ now, variant = 'bar' }: { now: number; variant?: 'bar' | 'sheet' }) {
  const filters = useUiStore(s => s.filters);
  const setFilters = useUiStore(s => s.setFilters);
  const setMonth = useUiStore(s => s.setMonth);
  const openSheet = useUiStore(s => s.openSheet);

  const chips = PERIODS.map(p => (
    <Chip
      key={p.key}
      variant={variant}
      label={p.key === 'custom' && filters.period === 'custom' ? customLabel(filters.customFrom, filters.customTo) : p.label}
      on={filters.period === p.key}
      onPress={() => {
        if (p.key === 'custom') openSheet({ kind: 'period' });
        else if (p.key === 'month') setMonth(monthIndexOf(now));
        else setFilters({ period: p.key });
      }}
    />
  ));

  if (variant === 'sheet') return <View style={styles.wrap}>{chips}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {chips}
    </ScrollView>
  );
}

/** Transactions: "‹ August | September 2026 | October ›" */
export function MonthStrip({ bounds }: { bounds: MonthBounds }) {
  const month = useUiStore(s => s.month);
  const setMonth = useUiStore(s => s.setMonth);
  const noPrev = month <= bounds.min;
  const noNext = month >= bounds.max;
  return (
    <View style={styles.strip}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        disabled={noPrev}
        onPress={() => setMonth(month - 1)}
        style={[styles.stripSide, { opacity: noPrev ? 0.35 : 1 }]}>
        <Icon name="cl" size={16} color={colors.muted2} />
        <T size={13} w={600} i color={colors.muted2} numberOfLines={1}>
          {MONTHS[(month - 1) % 12]}
        </T>
      </Pressable>
      <View style={styles.stripCur}>
        <FadeIn key={month} offset={5}>
          <T size={13} w={800} i color={colors.white} numberOfLines={1}>
            {monthName(month)}
          </T>
        </FadeIn>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next month"
        disabled={noNext}
        onPress={() => setMonth(month + 1)}
        style={[styles.stripSide, styles.stripRight, { opacity: noNext ? 0.35 : 1 }]}>
        <T size={13} w={600} i color={colors.muted2} numberOfLines={1}>
          {MONTHS[(month + 1) % 12]}
        </T>
        <Icon name="cr" size={16} color={colors.muted2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    padding: 5,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  flexCenter: { flex: 1, alignItems: 'center' },
  chipRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginHorizontal: 16,
    padding: 4,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  stripSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 9, paddingHorizontal: 6 },
  stripRight: { justifyContent: 'flex-end' },
  stripCur: { flex: 1.3, paddingVertical: 9, borderRadius: 99, backgroundColor: colors.ink, alignItems: 'center' },
});
