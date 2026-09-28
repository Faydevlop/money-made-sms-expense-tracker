import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
import { UNCATEGORIZED } from '../constants/categories';
import { CategoryMetaMap, tileColors } from '../hooks/useCategoryMeta';
import { Transaction } from '../types/transaction';
import { formatINR, MINUS } from '../utils/currencyUtils';
import { formatTime, formatWhen } from '../utils/dateUtils';
import { accountShort } from '../utils/transactionUtils';
import { ScalePressable } from './motion';
import { Icon } from './ui/Icon';
import { T } from './ui/T';

export function amountLabel(t: Transaction): string {
  if (t.type === 'income') return '+' + formatINR(t.amount);
  if (t.type === 'expense') return MINUS + formatINR(t.amount);
  return formatINR(t.amount);
}

export function amountColor(t: Transaction, redExpenses = false): string {
  if (t.type === 'income') return colors.green;
  if (t.type === 'expense' && redExpenses) return colors.redText;
  return colors.ink;
}

interface Props {
  t: Transaction;
  now: number;
  /** 'time' inside date groups, 'when' elsewhere. */
  mode: 'time' | 'when';
  meta: CategoryMetaMap;
  onPress: (id: string) => void;
}

export const TransactionItem = memo(function TransactionRow({ t, now, mode, meta, onPress }: Props) {
  const tile = tileColors(t, meta);
  const unc = !t.isCategorized;
  const sub = `${t.category ?? UNCATEGORIZED} · ${t.paymentMethod}${t.isExcluded ? ' · Excluded' : ''}`;
  const when = mode === 'time' ? formatTime(t.timestamp) : formatWhen(t.timestamp, now);
  return (
    <ScalePressable
      onPress={() => onPress(t.id)}
      accessibilityRole="button"
      accessibilityLabel={`${t.merchant}, ${amountLabel(t)}, ${sub}, ${when}`}
      scaleTo={0.97}
      style={[styles.row, t.isExcluded ? styles.excluded : null]}>
      <View style={[styles.tile, { backgroundColor: tile.bg }]}>
        <Icon name={tile.icon} size={18} color={tile.fg} />
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <T size={16} w={700} i numberOfLines={1} style={styles.name}>
            {t.merchant}
          </T>
          <T
            size={16}
            w={800}
            i
            tabular
            color={amountColor(t)}
            style={t.isExcluded ? styles.strike : undefined}>
            {amountLabel(t)}
          </T>
        </View>
        <T size={13} w={500} color={unc ? colors.redText : colors.muted}>
          {sub}
        </T>
        <T size={12} color={colors.muted2}>
          {when} · {accountShort(t)}
        </T>
      </View>
    </ScalePressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10 },
  excluded: { opacity: 0.55 },
  tile: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 2 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  name: { flexShrink: 1 },
  strike: { textDecorationLine: 'line-through' },
});
