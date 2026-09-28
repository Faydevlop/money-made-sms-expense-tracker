import React from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { colors } from '../../constants/colors';
import { INCOME } from '../../constants/categories';
import { useTxActions } from '../../hooks/useTxActions';
import { useTransactionStore } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { amountLabel } from '../TransactionItem';
import { Icon } from '../ui/Icon';
import { T } from '../ui/T';
import { BottomSheet } from './BottomSheet';

export function CategorySheet({ txId }: { txId: string }) {
  const t = useTransactionStore(s => s.transactions.find(x => x.id === txId));
  const categories = useTransactionStore(s => s.categories);
  const remember = useUiStore(s => s.rememberRule);
  const setRemember = useUiStore(s => s.setRememberRule);
  const closeSheet = useUiStore(s => s.closeSheet);
  const actions = useTxActions();
  const { width } = useWindowDimensions();
  const cell = Math.floor((width - 32 - 16) / 3);

  if (!t) return null;
  const options = categories.filter(c => c.name !== INCOME || t.type === 'income');

  return (
    <BottomSheet title="Choose category" subtitle={`${t.merchant} · ${amountLabel(t)}`} onClose={closeSheet}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
        {options.map(c => {
          const on = t.category === c.name;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => actions.setCategory(t.id, c.name)}
              style={({ pressed }) => [styles.cell, { width: cell, backgroundColor: on ? colors.ink : c.color, opacity: pressed ? 0.75 : 1 }]}>
              <Icon name={c.icon} size={22} color={on ? colors.white : colors.ink} />
              <T size={13} w={700} i color={on ? colors.white : colors.ink} numberOfLines={1}>
                {c.name}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: remember }}
        onPress={() => setRemember(!remember)}
        style={styles.remember}>
        <View style={[styles.box, { borderColor: remember ? colors.ink : colors.muted3, backgroundColor: remember ? colors.ink : 'transparent' }]}>
          {remember ? <Icon name="check" size={14} strokeWidth={3} color={colors.white} /> : null}
        </View>
        <T size={14} w={600} i style={styles.flex}>
          Always use this for “{t.originalMerchant}”
        </T>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12, paddingHorizontal: 16 },
  cell: { alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 22 },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, paddingHorizontal: 22, paddingBottom: 22 },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
