import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { Image, ScrollView, StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryCard } from '../components/CategoryCard';
import { EmptyState } from '../components/common';
import { MonthSwitcher } from '../components/DateFilter';
import { EstimateCard } from '../components/EstimateCard';
import { FadeIn, ScalePressable } from '../components/motion';
import { SpendingChart } from '../components/SpendingChart';
import { SummaryCard } from '../components/SummaryCard';
import { TransactionItem } from '../components/TransactionItem';
import {
  Card,
  CircleButton,
  PillButton,
  Segmented,
} from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { useCategoryMeta } from '../hooks/useCategoryMeta';
import { useNow } from '../hooks/useNow';
import { useOpenTransactions } from '../hooks/useOpenTransactions';
import { useMonthBounds } from '../hooks/useTransactionData';
import {
  categoryBreakdown,
  monthDailyBuckets,
  monthWeeklyBuckets,
  reviewSummary,
  spendingEstimate,
  totals,
} from '../services/analyticsService';
import { useSettingsStore } from '../store/settingsStore';
import { useTransactionStore } from '../store/transactionStore';
import { useUiStore } from '../store/uiStore';
import { formatINR } from '../utils/currencyUtils';
import {
  greeting,
  inRange,
  monthIndexOf,
  monthName,
  monthRange,
  MONTHS,
} from '../utils/dateUtils';

const LOGO = require('../assets/logo.png');

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'T';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function HomeScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const meta = useCategoryMeta();
  const all = useTransactionStore(s => s.transactions);
  const month = useUiStore(s => s.month);
  const setMonth = useUiStore(s => s.setMonth);
  const trend = useUiStore(s => s.trend);
  const setTrend = useUiStore(s => s.setTrend);
  const setAnalyticsRange = useUiStore(s => s.setAnalyticsRange);
  const openSheet = useUiStore(s => s.openSheet);
  const userName = useSettingsStore(s => s.userName);
  const tracking = useSettingsStore(s => s.trackingEnabled);
  const bounds = useMonthBounds(now);

  const cur = monthIndexOf(now);
  const d = useMemo(() => {
    const [a, b] = monthRange(month);
    const mt = inRange(all, a, b);
    return {
      mt,
      totals: totals(mt),
      cats: categoryBreakdown(mt),
      review: reviewSummary(all),
      est: spendingEstimate(all, now),
      buckets:
        trend === 'daily'
          ? monthDailyBuckets(mt, month, now)
          : monthWeeklyBuckets(mt, month, now),
    };
  }, [all, month, now, trend]);

  const openTx = useCallback(
    (id: string) => nav.navigate('TransactionDetails', { id }),
    [nav],
  );
  const openReview = () => nav.navigate('Review');
  const openTransactions = useOpenTransactions();

  let empty: {
    title: string;
    body: string;
    cta?: string;
    onCta?: () => void;
  } | null = null;
  if (!all.length && !tracking) {
    empty = {
      title: 'No transactions yet',
      body:
        Platform.OS === 'ios'
          ? 'Set up the iOS Shortcuts automation and Money Made will record payments from your bank SMS automatically.'
          : 'Turn on transaction tracking and Money Made will record payments from your bank and UPI SMS automatically.',
      cta: Platform.OS === 'ios' ? 'Set up tracking' : 'Turn on tracking',
      onCta: () => {
        if (Platform.OS === 'ios') {
          useSettingsStore
            .getState()
            .update({ trackingEnabled: true })
            .catch(() => {});
          nav.navigate('ShortcutSetup');
        } else nav.navigate('Onboarding', { startAt: 'permission' });
      },
    };
  } else if (!all.length) {
    empty = {
      title: 'No transactions yet',
      body: 'New transactions will appear here as soon as your bank sends an SMS.',
    };
  } else if (month > cur) {
    empty = {
      title: `No transactions in ${MONTHS[month % 12]}`,
      body: 'This month hasn’t started yet.',
      cta: `Back to ${monthName(cur)}`,
      onCta: () => setMonth(cur),
    };
  } else if (!d.mt.length) {
    empty = {
      title: 'No transactions this month',
      body: 'Nothing was detected for this month.',
    };
  }

  const hasData = d.mt.length > 0;
  const first = userName.trim().split(/\s+/)[0];

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: 110 + insets.bottom,
      }}
    >
      <FadeIn index={0}>
        <View style={styles.top}>
          <ScalePressable
            accessibilityRole="button"
            accessibilityLabel="Set your name"
            onPress={() => openSheet({ kind: 'name' })}
            scaleTo={0.9}
            style={[styles.avatar, first ? null : styles.avatarPlain]}
          >
            {first ? (
              <T size={18} w={900} i>
                {initials(userName)}
              </T>
            ) : (
              <Image
                source={LOGO}
                style={styles.avatarLogo}
                accessibilityIgnoresInvertColors
              />
            )}
          </ScalePressable>
          <View style={styles.flex} />
          <CircleButton
            icon="bell"
            label="Needs review"
            size={52}
            onPress={openReview}
          >
            {d.review.count > 0 ? <View style={styles.dot} /> : null}
          </CircleButton>
          <CircleButton
            icon="gear"
            label="Settings"
            size={52}
            onPress={() => nav.navigate('Tabs', { screen: 'Settings' })}
          />
        </View>
      </FadeIn>

      <FadeIn index={1} style={styles.greeting}>
        <T size={30} w={300} i lh={1.05}>
          {first ? greeting(now) : greeting(now).split(' ')[0]}
        </T>
        <T size={30} w={800} i lh={1.1}>
          {first || greeting(now).split(' ')[1]}
        </T>
      </FadeIn>

      <FadeIn index={2}>
        <MonthSwitcher bounds={bounds} now={now} />
      </FadeIn>

      {/* Keyed by month: switching months cross-fades the whole dashboard. */}
      <View key={month}>
        <FadeIn index={3}>
          <SummaryCard
            totals={d.totals}
            period={
              month === cur
                ? 'This month'
                : month > cur
                ? 'Upcoming'
                : monthName(month)
            }
            onAll={() => openTransactions({ month })}
            onReceived={() =>
              openTransactions({ month, filters: { type: 'in' } })
            }
            onSpent={() =>
              openTransactions({ month, filters: { type: 'out' } })
            }
          />
        </FadeIn>

        {d.review.count > 0 ? (
          <FadeIn index={4}>
            <ScalePressable
              accessibilityRole="button"
              onPress={openReview}
              scaleTo={0.98}
              style={styles.review}
            >
              <View style={styles.flex}>
                <View style={styles.reviewTitle}>
                  <View style={styles.reviewDot} />
                  <T size={17} w={800} i>
                    Needs review
                  </T>
                </View>
                <T size={13} i color={colors.text2} style={styles.mt2}>
                  {d.review.count} transaction{d.review.count === 1 ? '' : 's'}{' '}
                  · {formatINR(d.review.total)}
                </T>
              </View>
              <View style={styles.reviewArrow}>
                <Icon name="cr" size={20} />
              </View>
            </ScalePressable>
          </FadeIn>
        ) : null}

        {empty ? (
          <FadeIn index={4} style={styles.mt12}>
            <EmptyState
              icon="inbox"
              title={empty.title}
              body={empty.body}
              cta={empty.cta}
              onCta={empty.onCta}
            />
          </FadeIn>
        ) : null}

        {month === cur && hasData ? (
          <FadeIn index={5}>
            <EstimateCard est={d.est} />
          </FadeIn>
        ) : null}

        {hasData ? (
          <>
            <FadeIn index={6}>
              <Card style={styles.pad}>
                <View style={styles.rowBetween}>
                  <T size={15} w={600} i>
                    Spending trend
                  </T>
                  <Segmented
                    style={styles.trendSeg}
                    options={[
                      { key: 'daily', label: 'Daily' },
                      { key: 'weekly', label: 'Weekly' },
                    ]}
                    value={trend}
                    onChange={setTrend}
                  />
                </View>
                <SpendingChart
                  chartKey={`home-${trend}-${month}`}
                  buckets={d.buckets}
                  onOpen={b =>
                    openTransactions({ range: { start: b.start, end: b.end } })
                  }
                />
              </Card>
            </FadeIn>

            <FadeIn index={7}>
              <CategoryCard
                slices={d.cats}
                dataKey={`home-${month}`}
                onCategory={name =>
                  openTransactions({
                    month,
                    filters: { type: 'out', categories: [name] },
                  })
                }
                onAll={() => {
                  setAnalyticsRange('month');
                  nav.navigate('Tabs', { screen: 'Analytics' });
                }}
              />
            </FadeIn>

            <FadeIn index={8}>
              <Card style={styles.recent}>
                <View style={[styles.rowBetween, styles.mb4]}>
                  <T size={15} w={600} i>
                    Recent transactions
                  </T>
                  <PillButton
                    label="See all"
                    variant="soft"
                    minHeight={36}
                    size={13}
                    style={styles.seeAll}
                    onPress={() => openTransactions({ month })}
                  />
                </View>
                {d.mt.slice(0, 5).map((t, i) => (
                  <FadeIn key={t.id} index={i} delay={380} offset={8}>
                    <TransactionItem
                      t={t}
                      now={now}
                      mode="when"
                      meta={meta}
                      onPress={openTx}
                    />
                  </FadeIn>
                ))}
              </Card>
            </FadeIn>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLogo: { width: 52, height: 52 },
  avatarPlain: { backgroundColor: colors.white },
  dot: {
    position: 'absolute',
    top: 12,
    right: 13,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.white,
  },
  greeting: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 14 },
  review: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 18,
    borderRadius: 26,
    backgroundColor: colors.peach,
  },
  reviewTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  reviewArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mt2: { marginTop: 2 },
  mt12: { marginTop: 12 },
  mb4: { marginBottom: 4 },
  pad: { paddingVertical: 20, paddingHorizontal: 18 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  trendSeg: { width: 160 },
  recent: { paddingTop: 18, paddingHorizontal: 18, paddingBottom: 8 },
  seeAll: { paddingHorizontal: 14 },
});
