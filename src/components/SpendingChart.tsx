import React from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
import { Bucket } from '../services/analyticsService';
import { useUiStore } from '../store/uiStore';
import { formatINR } from '../utils/currencyUtils';
import { useCountUp, useGrow } from './motion';
import { Icon } from './ui/Icon';
import { T } from './ui/T';

interface Props {
  /** Selection is remembered per key (e.g. "home-daily-24320"). */
  chartKey: string;
  buckets: Bucket[];
  height?: number;
  /** When set, the selected bar's label becomes a link to its transactions. */
  onOpen?: (b: Bucket) => void;
}

/**
 * Rounded bar chart from the design. Tapping a bar selects it; by default the
 * highest bar is selected and its value is shown above the chart.
 */
export function SpendingChart({ chartKey, buckets, height = 120, onOpen }: Props) {
  const stored = useUiStore(s => s.selectedBar[chartKey]);
  const selectBar = useUiStore(s => s.selectBar);
  const max = Math.max(1, ...buckets.map(b => b.value));
  let sel = stored;
  if (sel == null || sel >= buckets.length) {
    sel = buckets.reduce((bi, b, i) => (b.value > buckets[bi].value ? i : bi), 0);
  }
  const gap = buckets.length > 14 ? 3 : 8;
  const cur = buckets[sel];
  // Bars rise in a left-to-right wave whenever the chart's data set changes.
  const grow = useGrow(chartKey, 60, 750);
  const n = buckets.length;
  const shown = useCountUp(cur ? cur.value : 0, 450);

  return (
    <View>
      <View style={styles.head}>
        <T size={24} w={800} i tabular>
          {formatINR(shown)}
        </T>
        {onOpen && cur && !cur.future ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Show transactions for ${cur.label}`}
            hitSlop={10}
            onPress={() => onOpen(cur)}
            style={styles.link}>
            <T size={13} i color={colors.muted}>
              {cur.label}
            </T>
            <Icon name="cr" size={14} color={colors.muted} />
          </Pressable>
        ) : (
          <T size={13} i color={colors.muted}>
            {cur ? cur.label : ''}
          </T>
        )}
      </View>
      <View style={[styles.bars, { gap, height }]}>
        {buckets.map((b, i) => {
          const h = b.future ? 2 : b.value > 0 ? Math.max(4, (b.value / max) * height) : 4;
          return (
            <Pressable
              key={i}
              onPress={() => selectBar(chartKey, i)}
              accessibilityRole="button"
              accessibilityLabel={`${b.label}: ${formatINR(b.value)}`}
              style={styles.barHit}>
              <Animated.View
                style={{
                  width: '100%',
                  height: h,
                  borderRadius: 999,
                  backgroundColor: i === sel ? colors.ink : b.future ? colors.soft2 : colors.barIdle,
                  transformOrigin: 'bottom',
                  transform: [
                    {
                      scaleY: grow.interpolate({
                        inputRange: [(i / n) * 0.45, (i / n) * 0.45 + 0.55],
                        outputRange: [0, 1],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.ticks, { gap }]}>
        {buckets.map((b, i) => (
          <View key={i} style={styles.tickCell}>
            <T size={10} color={colors.muted2} numberOfLines={1} style={styles.tick}>
              {b.tick}
            </T>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 12 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bars: { flexDirection: 'row', marginTop: 12 },
  barHit: { flex: 1, justifyContent: 'flex-end' },
  ticks: { flexDirection: 'row', marginTop: 6 },
  tickCell: { flex: 1, overflow: 'visible' },
  tick: { width: 60 },
});
