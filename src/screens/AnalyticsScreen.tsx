import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../components/common';
import {
  FadeIn,
  ScalePressable,
  useCountUp,
  useGrow,
} from '../components/motion';
import { SpendingChart } from '../components/SpendingChart';
import { Card, ProgressBar, Segmented } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { useCategoryMeta } from '../hooks/useCategoryMeta';
import { useNow } from '../hooks/useNow';
import { useOpenTransactions } from '../hooks/useOpenTransactions';
import { AnalyticsRange, analyticsReport } from '../services/analyticsService';
import { useTransactionStore } from '../store/transactionStore';
import { useUiStore } from '../store/uiStore';
import { formatINR, formatSigned } from '../utils/currencyUtils';
import { addDays, MONTHS_SHORT, WEEKDAYS } from '../utils/dateUtils';

const RANGES: { key: AnalyticsRange; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: 'year', label: 'Year' },
];

function Stat({
  bg,
  title,
  value,
  format,
  note,
  valueColor,
  onPress,
}: {
  bg: string;
  title: string;
  value: number;
  format: (n: number) => string;
  note: string;
  valueColor?: string;
  onPress?: () => void;
}) {
  const shown = useCountUp(value);
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel={`${title} ${format(value)}. ${note}`}
      disabled={!onPress}
      onPress={onPress}
      scaleTo={0.97}
      style={[styles.stat, { backgroundColor: bg }]}
    >
      <T size={14} w={600} i>
        {title}
      </T>
      <T
        size={24}
        w={900}
        i
        tabular
        color={valueColor}
        style={styles.mt6}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {format(shown)}
      </T>
      <T size={12} i color={colors.text2}>
        {note}
      </T>
    </ScalePressable>
  );
}

export function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const now = useNow();
  const meta = useCategoryMeta();
  const all = useTransactionStore(s => s.transactions);
  const range = useUiStore(s => s.analyticsRange);
  const setRange = useUiStore(s => s.setAnalyticsRange);
  const openTransactions = useOpenTransactions();
  const r = useMemo(() => analyticsReport(all, range, now), [all, range, now]);
  const cmax = Math.max(1, ...r.categories.map(c => c.amount));
  const grow = useGrow(`cats-${range}-${r.totals.spent}`, 250, 800);
  const period = { start: r.start, end: Math.min(r.end, addDays(now, 1)) };

  const delta =
    r.deltaVsPrevious == null
      ? 'No earlier data'
      : `${Math.abs(Math.round(r.deltaVsPrevious * 100))}% ${
          r.deltaVsPrevious >= 0 ? 'more' : 'less'
        } than previous`;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: 110 + insets.bottom,
      }}
    >
      <FadeIn index={0} style={styles.title}>
        <T size={30} w={800} i lh={1.1}>
          Analytics
        </T>
        <T size={14} i color={colors.muted}>
          {r.label}
        </T>
      </FadeIn>
      <FadeIn index={1}>
        <Segmented
          options={RANGES}
          value={range}
          onChange={setRange}
          bg={colors.white}
          style={styles.seg}
        />
      </FadeIn>

      {/* Keyed by range so switching ranges cross-fades the report. */}
      <View key={range}>
        <View style={styles.grid}>
          <FadeIn index={2} style={styles.cell}>
            <Stat
              bg={colors.redBg}
              title="Spending"
              value={r.totals.spent}
              format={formatINR}
              note={delta}
              onPress={() =>
                openTransactions({ range: period, filters: { type: 'out' } })
              }
            />
          </FadeIn>
          <FadeIn index={3} style={styles.cell}>
            <Stat
              bg={colors.greenBg}
              title="Income"
              value={r.totals.received}
              format={formatINR}
              valueColor={colors.green}
              note={`${r.incomeCount} credit${r.incomeCount === 1 ? '' : 's'}`}
              onPress={() =>
                openTransactions({ range: period, filters: { type: 'in' } })
              }
            />
          </FadeIn>
          <FadeIn index={4} style={styles.cell}>
            <Stat
              bg={colors.lavender}
              title="Net savings"
              value={r.totals.net}
              format={formatSigned}
              note={
                r.savingsRate == null
                  ? '—'
                  : `${Math.round(r.savingsRate * 100)}% of income saved`
              }
              onPress={() => openTransactions({ range: period })}
            />
          </FadeIn>
          <FadeIn index={5} style={styles.cell}>
            <Stat
              bg={colors.sky}
              title="Avg. per day"
              value={r.avgPerDay}
              format={formatINR}
              note={`${r.totals.count} transactions`}
              onPress={() => openTransactions({ range: period })}
            />
          </FadeIn>
        </View>

        {r.totals.count === 0 ? (
          <FadeIn index={6} style={styles.mt12}>
            <EmptyState
              icon="chart"
              title="Nothing to analyse yet"
              body="Spending insights appear once transactions are detected in this period."
            />
          </FadeIn>
        ) : (
          <>
            <FadeIn index={6}>
              <Card style={styles.pad}>
                <T size={15} w={600} i>
                  Spending trend
                </T>
                <SpendingChart
                  chartKey={`an-${range}`}
                  buckets={r.buckets}
                  height={140}
                  onOpen={b =>
                    openTransactions({
                      range: { start: b.start, end: b.end },
                      filters: { type: 'out' },
                    })
                  }
                />
              </Card>
            </FadeIn>

            {r.categories.length ? (
              <FadeIn index={7}>
                <Card style={styles.cats}>
                  <T size={15} w={600} i style={styles.mb6}>
                    Spending by category
                  </T>
                  {r.categories.map(c => (
                    <ScalePressable
                      key={c.key}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.name}, ${formatINR(
                        c.amount,
                      )}, show transactions`}
                      onPress={() =>
                        openTransactions({
                          range: period,
                          filters: { type: 'out', categories: [c.name] },
                        })
                      }
                      scaleTo={0.98}
                      style={styles.catRow}
                    >
                      <View style={styles.catLine}>
                        <View style={styles.catIcon}>
                          <Icon name={meta(c.key).icon} size={18} />
                        </View>
                        <T
                          size={14}
                          w={700}
                          i
                          numberOfLines={1}
                          style={styles.flex}
                        >
                          {c.name}
                        </T>
                        <T size={12} i color={colors.muted2}>
                          {Math.round(c.share * 100)}%
                        </T>
                        <T size={14} w={800} i tabular style={styles.catAmt}>
                          {formatINR(c.amount)}
                        </T>
                      </View>
                      <ProgressBar
                        value={c.amount / cmax}
                        grow={grow}
                        color={c.color}
                        track={colors.soft}
                        height={6}
                        style={styles.catTrack}
                      />
                    </ScalePressable>
                  ))}
                </Card>
              </FadeIn>
            ) : null}

            {r.topDays.length ? (
              <FadeIn index={8}>
                <Card bg={colors.lime} style={styles.cats}>
                  <T size={15} w={600} i style={styles.mb6}>
                    Highest spending days
                  </T>
                  {r.topDays.map((d, i) => {
                    const dd = new Date(d.day);
                    return (
                      <ScalePressable
                        key={d.day}
                        accessibilityRole="button"
                        onPress={() =>
                          openTransactions({
                            range: { start: d.day, end: addDays(d.day, 1) },
                            filters: { type: 'out' },
                          })
                        }
                        scaleTo={0.98}
                        style={styles.dayRow}
                      >
                        <View style={styles.rank}>
                          <T size={13} w={800} i>
                            {'0' + (i + 1)}
                          </T>
                        </View>
                        <View style={styles.flex}>
                          <T size={15} w={700} i>
                            {`${WEEKDAYS[dd.getDay()]}, ${dd.getDate()} ${
                              MONTHS_SHORT[dd.getMonth()]
                            } ${dd.getFullYear()}`}
                          </T>
                          <T size={12} i color={colors.text2} numberOfLines={1}>
                            {d.count > 1
                              ? `${d.biggest.merchant} and ${d.count - 1} more`
                              : d.biggest.merchant}
                          </T>
                        </View>
                        <T size={15} w={800} i tabular>
                          {formatINR(d.amount)}
                        </T>
                        <Icon name="cr" size={16} color={colors.text2} />
                      </ScalePressable>
                    );
                  })}
                </Card>
              </FadeIn>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  title: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 12 },
  seg: { marginHorizontal: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    marginHorizontal: 16,
  },
  cell: { flexGrow: 1, flexBasis: '45%' },
  stat: { flex: 1, padding: 16, borderRadius: 26 },
  mt6: { marginTop: 6 },
  mt12: { marginTop: 12 },
  mb6: { marginBottom: 6 },
  pad: { paddingVertical: 20, paddingHorizontal: 18 },
  cats: { paddingTop: 20, paddingHorizontal: 18, paddingBottom: 12 },
  catRow: { paddingVertical: 9 },
  catLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catAmt: { minWidth: 72, textAlign: 'right' },
  catTrack: { marginTop: 8, marginLeft: 44 },
  dayRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  rank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
