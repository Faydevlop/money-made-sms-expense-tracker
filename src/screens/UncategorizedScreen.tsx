import { useNavigation } from '@react-navigation/native';
import React, { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ScreenHeader } from '../components/common';
import { FadeIn, useEntranceWindow } from '../components/motion';
import { TransactionItem } from '../components/TransactionItem';
import { Card, PillButton } from '../components/ui/controls';
import { T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { CategoryMetaMap, useCategoryMeta } from '../hooks/useCategoryMeta';
import { useAfterTransition } from '../hooks/useAfterTransition';
import { useNow } from '../hooks/useNow';
import { useTxActions } from '../hooks/useTxActions';
import { reviewSummary } from '../services/analyticsService';
import { useTransactionStore } from '../store/transactionStore';
import { useUiStore } from '../store/uiStore';
import { Transaction } from '../types/transaction';
import { formatINR } from '../utils/currencyUtils';

interface CardProps {
  t: Transaction;
  now: number;
  meta: CategoryMetaMap;
  animate: boolean;
  index: number;
  onOpen: (id: string) => void;
}

/** One review card: the transaction plus its four quick actions. Memoized for scroll performance. */
const ReviewCard = memo(function ReviewCard({ t, now, meta, animate, index, onOpen }: CardProps) {
  const openSheet = useUiStore(s => s.openSheet);
  const actions = useTxActions();
  return (
    <FadeIn animate={animate} index={index} offset={10}>
      <Card radius={28} style={styles.item}>
        <TransactionItem t={t} now={now} mode="when" meta={meta} onPress={onOpen} />
        <View style={styles.grid}>
          <PillButton icon="tag" label="Assign category" size={14} minHeight={46} justify="flex-start" style={styles.cell} onPress={() => openSheet({ kind: 'category', txId: t.id })} />
          <PillButton icon="pencil" label="Edit merchant" variant="soft" size={14} minHeight={46} justify="flex-start" style={styles.cell} onPress={() => openSheet({ kind: 'merchant', txId: t.id })} />
          <PillButton icon="swap" label="Mark transfer" variant="soft" size={14} minHeight={46} justify="flex-start" style={styles.cell} onPress={() => actions.markTransfer(t.id)} />
          <PillButton icon="eyeoff" label="Ignore" variant="soft" size={14} minHeight={46} justify="flex-start" style={styles.cell} onPress={() => actions.ignore(t.id)} />
        </View>
      </Card>
    </FadeIn>
  );
});

/** "Needs review": transactions the categorizer couldn't place. */
export function UncategorizedScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const meta = useCategoryMeta();
  const all = useTransactionStore(s => s.transactions);
  const ready = useAfterTransition();
  const review = useMemo(() => reviewSummary(all), [all]);
  const openTx = useCallback((id: string) => nav.navigate('TransactionDetails', { id }), [nav]);
  // Only the first cards animate when the list appears; cards reached by scrolling show instantly.
  const shouldAnimate = useEntranceWindow(ready);

  const renderItem = useCallback(
    ({ item, index }: { item: Transaction; index: number }) => (
      <ReviewCard t={item} now={now} meta={meta} index={index} animate={shouldAnimate()} onOpen={openTx} />
    ),
    [now, meta, openTx, shouldAnimate],
  );

  const header =
    review.count > 0 ? (
      <FadeIn>
        <Card bg={colors.peach} style={styles.hero}>
          <T size={15} w={600} i>
            Uncategorized
          </T>
          <T size={30} w={900} i style={styles.mt2}>
            {review.count} transaction{review.count === 1 ? '' : 's'} · {formatINR(review.total)}
          </T>
          <T size={13} i color={colors.text2} style={styles.mt4}>
            We couldn’t match these to a merchant. Sort them so your totals stay accurate.
          </T>
        </Card>
      </FadeIn>
    ) : undefined;

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <ScreenHeader title="Needs review" />
      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.ink} />
          <T size={14} i color={colors.muted} style={styles.mt12}>
            Loading transactions…
          </T>
        </View>
      ) : (
        <FlatList
          data={review.items}
          keyExtractor={t => t.id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <FadeIn style={styles.mt4}>
              <EmptyState
                icon="check"
                title="All caught up"
                body="Every transaction has a category."
                cta="Done"
                onCta={() => nav.goBack()}
                bg={colors.greenBg}
                iconBg={colors.white}
                iconColor={colors.green}
              />
            </FadeIn>
          }
          contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={40}
          windowSize={7}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  hero: { marginTop: 4, padding: 20 },
  mt2: { marginTop: 2 },
  mt4: { marginTop: 4 },
  mt12: { marginTop: 12 },
  item: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  cell: { flexBasis: '47%', flexGrow: 1, paddingHorizontal: 14 },
});
