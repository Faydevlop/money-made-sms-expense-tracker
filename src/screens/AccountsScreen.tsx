import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EmptyState, StackScreen } from '../components/common';
import { Card } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { useOpenTransactions } from '../hooks/useOpenTransactions';
import { useAccounts } from '../hooks/useTransactionData';
import { ScalePressable } from '../components/motion';
import { maskAccount } from '../utils/transactionUtils';

/** Accounts and cards detected from SMS. Only the last 4 digits are ever stored. */
export function AccountsScreen() {
  const accounts = useAccounts();
  const openTransactions = useOpenTransactions();
  return (
    <StackScreen title="Accounts">
      {accounts.length === 0 ? (
        <EmptyState
          icon="bank"
          title="No accounts yet"
          body="Accounts are detected automatically from your bank SMS."
        />
      ) : (
        <Card radius={26} style={styles.card}>
          {accounts.map((a, i) => (
            <ScalePressable
              key={a.key}
              accessibilityRole="button"
              accessibilityLabel={`${a.bank ?? 'Account'} ${
                a.account ?? ''
              }, show transactions`}
              onPress={() =>
                openTransactions({ filters: { accounts: [a.key] } })
              }
              scaleTo={0.98}
              style={[
                styles.row,
                i < accounts.length - 1 ? styles.divider : null,
              ]}
            >
              <View style={styles.icon}>
                <Icon name="bank" size={20} />
              </View>
              <View style={styles.flex}>
                <T size={16} w={700} i>
                  {a.bank ?? 'Unknown bank'}
                </T>
                <T size={12} color={colors.muted2}>
                  {a.account
                    ? maskAccount(a.account)
                    : 'Account number not in SMS'}{' '}
                  · {a.count} transactions
                </T>
              </View>
              <Icon name="cr" size={18} color={colors.muted3} />
            </ScalePressable>
          ))}
        </Card>
      )}
      <T size={12} i color={colors.muted2} style={styles.note}>
        Tap an account to see its transactions for the selected month. Only the
        last digits of account and card numbers are kept, exactly as your bank
        shows them in SMS.
      </T>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { marginTop: 4, paddingVertical: 4, paddingHorizontal: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { marginTop: 16, marginHorizontal: 24 },
});
