import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { EmptyState, StackScreen } from '../components/common';
import { TransactionItem } from '../components/TransactionItem';
import { Card } from '../components/ui/controls';
import { T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { useCategoryMeta } from '../hooks/useCategoryMeta';
import { useNow } from '../hooks/useNow';
import { useTransactionStore } from '../store/transactionStore';

export function ExcludedScreen() {
  const nav = useNavigation();
  const now = useNow();
  const meta = useCategoryMeta();
  const all = useTransactionStore(s => s.transactions);
  const excluded = useMemo(() => all.filter(t => t.isExcluded), [all]);
  const openTx = useCallback(
    (id: string) => nav.navigate('TransactionDetails', { id }),
    [nav],
  );

  return (
    <StackScreen title="Excluded transactions">
      {excluded.length === 0 ? (
        <EmptyState
          icon="eyeoff"
          title="Nothing excluded"
          body="Transactions you exclude stay listed but are left out of spending and income."
        />
      ) : (
        <>
          <T size={13} i color={colors.text2} style={styles.hint}>
            Open a transaction and turn off “Exclude from totals” to count it
            again.
          </T>
          <Card radius={26} style={styles.card}>
            {excluded.map(t => (
              <TransactionItem
                key={t.id}
                t={t}
                now={now}
                mode="when"
                meta={meta}
                onPress={openTx}
              />
            ))}
          </Card>
        </>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  hint: { marginHorizontal: 24, marginTop: 4 },
  card: { paddingVertical: 4, paddingHorizontal: 16 },
});
