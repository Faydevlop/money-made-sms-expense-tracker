import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
import { SpendingEstimate } from '../services/analyticsService';
import { formatINR } from '../utils/currencyUtils';
import { useCountUp, useGrow } from './motion';
import { Badge, Card, ProgressBar } from './ui/controls';
import { T } from './ui/T';

/** Estimated monthly spending — clearly labelled as an estimate. */
export function EstimateCard({ est }: { est: SpendingEstimate }) {
  const estimated = useCountUp(est.estimated);
  const grow = useGrow(`${est.dayOfMonth}-${Math.round(est.current)}`, 200, 900);
  return (
    <Card bg={colors.lime} style={styles.card}>
      <View style={styles.head}>
        <T size={15} w={600} i style={styles.flex}>
          Estimated monthly spending
        </T>
        <Badge text={`Day ${est.dayOfMonth} of ${est.daysInMonth}`} bg="rgba(255,255,255,0.6)" />
      </View>
      <T size={34} w={900} i tabular style={styles.value}>
        {formatINR(estimated)}
      </T>
      <T size={13} i color={colors.text2}>
        Estimate based on your spending so far
      </T>
      <ProgressBar value={est.progress} grow={grow} color={colors.olive} track="rgba(255,255,255,0.65)" height={10} style={styles.track} />
      <View style={styles.legend}>
        <T size={12} i color={colors.text2}>
          {formatINR(est.current)} spent
        </T>
        <T size={12} i color={colors.text2}>
          {formatINR(est.moreExpected)} more expected
        </T>
      </View>
      <View style={styles.grid}>
        <Stat label="Current" value={formatINR(est.current)} />
        <Stat label="Avg. per day" value={formatINR(est.avgPerDay)} />
        <Stat label="Remaining" value={`${est.remainingDays} days`} />
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <T size={12} i color={colors.text2}>
        {label}
      </T>
      <T size={16} w={800} i tabular numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: 20, paddingHorizontal: 18, paddingBottom: 18 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  flex: { flex: 1 },
  value: { letterSpacing: -0.7, marginTop: 4 },
  track: { marginTop: 14 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  grid: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stat: { flex: 1, padding: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.6)' },
});
