import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../constants/colors';
import { TYPE_NAMES, useTxActions } from '../../hooks/useTxActions';
import { useTransactionStore } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { TransactionType } from '../../types/transaction';
import { T } from '../ui/T';
import { BottomSheet } from './BottomSheet';

const OPTIONS: { type: TransactionType; sub: string }[] = [
  { type: 'expense', sub: 'Money you spent — counts towards spending' },
  { type: 'income', sub: 'Money you received — counts towards income' },
  { type: 'transfer', sub: 'Between your own accounts — not counted' },
];

export function TypeSheet({ txId }: { txId: string }) {
  const t = useTransactionStore(s => s.transactions.find(x => x.id === txId));
  const closeSheet = useUiStore(s => s.closeSheet);
  const actions = useTxActions();
  if (!t) return null;
  return (
    <BottomSheet title="Transaction type" subtitle={t.merchant} onClose={closeSheet}>
      <View style={styles.body}>
        {OPTIONS.map(o => {
          const on = t.type === o.type;
          return (
            <Pressable
              key={o.type}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => (on ? closeSheet() : actions.setType(t.id, o.type))}
              style={styles.row}>
              <View style={[styles.radio, { borderColor: on ? colors.ink : colors.radioOff }]}>
                <View style={[styles.dot, { backgroundColor: on ? colors.ink : 'transparent' }]} />
              </View>
              <View style={styles.flex}>
                <T size={16} w={700} i>
                  {TYPE_NAMES[o.type]}
                </T>
                <T size={12} color={colors.muted2}>
                  {o.sub}
                </T>
              </View>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 22, paddingBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, padding: 3 },
  dot: { flex: 1, borderRadius: 999 },
  flex: { flex: 1 },
});
