import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
import { Totals } from '../services/analyticsService';
import { formatINR } from '../utils/currencyUtils';
import { ScalePressable, useCountUp } from './motion';
import { Badge, Card } from './ui/controls';
import { Icon } from './ui/Icon';
import { T } from './ui/T';

/**
 * Month overview: transaction count with Received / Spent tiles.
 * Tap the count or a tile to see those transactions.
 */
export function SummaryCard({
  totals,
  period,
  onAll,
  onReceived,
  onSpent,
}: {
  totals: Totals;
  /** e.g. "This month" / "Past month" */
  period: string;
  onAll: () => void;
  onReceived: () => void;
  onSpent: () => void;
}) {
  const count = useCountUp(totals.count, 600);
  const received = useCountUp(totals.received);
  const spent = useCountUp(totals.spent);
  return (
    <Card bg={colors.lavender} style={styles.card}>
      <ScalePressable
        accessibilityRole="button"
        accessibilityLabel={`${totals.count} transactions ${period.toLowerCase()}, show all`}
        onPress={onAll}
        scaleTo={0.98}>
        <View style={styles.head}>
          <T size={15} w={600} i>
            Transactions
          </T>
          <Badge text={period} />
        </View>
        <View style={styles.countRow}>
          <T size={46} w={900} i tabular style={styles.net}>
            {Math.round(count)}
          </T>
          <T size={16} w={600} i color={colors.text2}>
            {totals.count === 1 ? 'transaction' : 'transactions'}
          </T>
          <View style={styles.flex} />
          <Icon name="cr" size={20} color={colors.text2} />
        </View>
      </ScalePressable>
      <View style={styles.grid}>
        <ScalePressable
          accessibilityRole="button"
          accessibilityLabel={`Received ${formatINR(totals.received)}, show income`}
          onPress={onReceived}
          style={styles.tile}>
          <View style={styles.tileHead}>
            <View style={[styles.arrow, { backgroundColor: colors.greenBg }]}>
              <Icon name="in" size={13} strokeWidth={2.4} color={colors.green} />
            </View>
            <T size={14} w={600} i>
              Received
            </T>
          </View>
          <T size={22} w={800} i tabular color={colors.green} style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
            +{formatINR(received)}
          </T>
        </ScalePressable>
        <ScalePressable
          accessibilityRole="button"
          accessibilityLabel={`Spent ${formatINR(totals.spent)}, show expenses`}
          onPress={onSpent}
          style={styles.tile}>
          <View style={styles.tileHead}>
            <View style={[styles.arrow, { backgroundColor: colors.redBg }]}>
              <Icon name="out" size={13} strokeWidth={2.4} color={colors.redText} />
            </View>
            <T size={14} w={600} i>
              Spent
            </T>
          </View>
          <T size={22} w={800} i tabular style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatINR(spent)}
          </T>
        </ScalePressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: 20, paddingHorizontal: 18, paddingBottom: 18 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  net: { letterSpacing: -0.9 },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 },
  flex: { flex: 1 },
  grid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  tile: { flex: 1, padding: 14, borderRadius: 22, backgroundColor: colors.glass },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  arrow: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tileValue: { marginTop: 8 },
});
