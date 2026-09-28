import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../constants/colors';
import { CategorySlice } from '../services/analyticsService';
import { formatINR } from '../utils/currencyUtils';
import { FadeIn, ScalePressable, useGrow } from './motion';
import { Card, PillButton } from './ui/controls';
import { T } from './ui/T';

export function Donut({ slices, size = 132, stroke = 20 }: { slices: CategorySlice[]; size?: number; stroke?: number }) {
  const total = slices.reduce((a, s) => a + s.amount, 0) || 1;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      {slices.length === 0 ? (
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.glass2} strokeWidth={stroke} />
      ) : null}
      {slices.map(s => {
        const len = (s.amount / total) * C;
        const el = (
          <Circle
            key={s.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${Math.max(len - 3, 0.5)} ${C}`}
            strokeDashoffset={-offset}
          />
        );
        offset += len;
        return el;
      })}
    </Svg>
  );
}

/** Donut that sweeps into place (rotate + scale + fade) whenever its data changes. */
export function AnimatedDonut({ slices, dataKey }: { slices: CategorySlice[]; dataKey: string }) {
  const g = useGrow(dataKey, 80, 800);
  return (
    <Animated.View
      style={{
        opacity: g,
        transform: [
          { rotate: g.interpolate({ inputRange: [0, 1], outputRange: ['-70deg', '0deg'] }) },
          { scale: g.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
        ],
      }}>
      <Donut slices={slices} />
    </Animated.View>
  );
}

/** "Where it went" — donut + top categories. */
export function CategoryCard({
  slices,
  onAll,
  onCategory,
  dataKey,
}: {
  slices: CategorySlice[];
  onAll: () => void;
  onCategory: (name: string) => void;
  dataKey: string;
}) {
  const top = slices[0];
  return (
    <Card bg={colors.sky} style={styles.card}>
      <View style={styles.head}>
        <T size={15} w={600} i>
          Where it went
        </T>
        <PillButton label="All categories" variant="secondary" minHeight={36} size={13} onPress={onAll} style={styles.all} />
      </View>
      <View style={styles.row}>
        <View style={styles.donut}>
          <AnimatedDonut slices={slices} dataKey={dataKey} />
          <View style={styles.center} pointerEvents="none">
            <T size={11} i color={colors.text2}>
              Top
            </T>
            <T size={16} w={800} i numberOfLines={1}>
              {top ? top.name : '—'}
            </T>
            <T size={12} i color={colors.text2}>
              {top ? Math.round(top.share * 100) + '%' : ''}
            </T>
          </View>
        </View>
        <View style={styles.legend}>
          {slices.slice(0, 6).map((c, i) => (
            <FadeIn key={`${dataKey}-${c.key}`} index={i} delay={120} offset={8}>
              <ScalePressable
                accessibilityRole="button"
                accessibilityLabel={`${c.name} ${formatINR(c.amount)}, show transactions`}
                onPress={() => onCategory(c.name)}
                scaleTo={0.97}
                style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: c.color }]} />
                <T size={14} w={500} i numberOfLines={1} style={styles.flex}>
                  {c.name}
                </T>
                <T size={14} w={800} i tabular>
                  {formatINR(c.amount)}
                </T>
              </ScalePressable>
            </FadeIn>
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 20, paddingHorizontal: 18 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  all: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', gap: 18, alignItems: 'center', marginTop: 14 },
  donut: { width: 132, height: 132 },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  legend: { flex: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1 },
});
