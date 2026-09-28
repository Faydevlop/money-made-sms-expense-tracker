import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { ListRow, StackScreen } from '../components/common';
import { Card } from '../components/ui/controls';
import { T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { setNativeTracking } from '../sms/smsReceiver';
import { useSettingsStore } from '../store/settingsStore';
import { useTransactionStore } from '../store/transactionStore';
import { useUiStore } from '../store/uiStore';
import { Transaction } from '../types/transaction';
import { formatFull } from '../utils/dateUtils';
import { maskAccount } from '../utils/transactionUtils';

/** CSV without SMS bodies; accounts masked. */
export function toCsv(list: Transaction[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = [
    'date',
    'time',
    'type',
    'amount',
    'merchant',
    'category',
    'payment_method',
    'bank',
    'account',
    'excluded',
    'notes',
  ];
  const rows = list.map(t =>
    [
      t.date,
      t.time,
      t.type,
      t.amount.toFixed(2),
      t.merchant,
      t.category ?? 'Uncategorized',
      t.paymentMethod,
      t.bank,
      maskAccount(t.account),
      t.isExcluded ? 'yes' : 'no',
      t.notes,
    ]
      .map(esc)
      .join(','),
  );
  return [head.join(','), ...rows].join('\n');
}

export function DataScreen() {
  const all = useTransactionStore(s => s.transactions);
  const loadSample = useTransactionStore(s => s.loadSampleData);
  const removeSample = useTransactionStore(s => s.removeSampleData);
  const deleteAll = useTransactionStore(s => s.deleteAllData);
  const eraseEverything = useTransactionStore(s => s.eraseEverything);
  const nav = useNavigation();
  const updateSettings = useSettingsStore(s => s.update);
  const showToast = useUiStore(s => s.showToast);
  const [busy, setBusy] = useState(false);
  const sampleCount = all.filter(t => t.source === 'sample').length;
  const oldest = all[all.length - 1];

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      showToast('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () =>
    guard(async () => {
      if (!all.length) {
        showToast('Nothing to export yet');
        return;
      }
      await Share.share({
        title: 'Money Made transactions',
        message: toCsv(all),
      });
    });

  const confirmDelete = () =>
    Alert.alert(
      'Delete all transactions?',
      'This removes every transaction stored on this device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            guard(async () => {
              await deleteAll();
              // Next scan re-imports the inbox from scratch if tracking is on.
              await updateSettings({ lastScanAt: 0 });
              showToast('All transactions deleted');
            }),
        },
      ],
    );

  const confirmErase = () =>
    Alert.alert(
      'Erase all app data?',
      'This permanently deletes every transaction, rule, custom category and setting from this device, and stops SMS tracking. The app returns to its first-launch state. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase everything',
          style: 'destructive',
          onPress: () =>
            guard(async () => {
              setNativeTracking(false); // also clears the native pending-SMS queue
              await eraseEverything();
              useSettingsStore.getState().resetToDefaults();
              nav.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
              showToast('All app data erased');
            }),
        },
      ],
    );

  return (
    <StackScreen title="Data management">
      <Card bg={colors.sky} radius={26} style={styles.stats}>
        <T size={15} w={600} i>
          Stored on this device
        </T>
        <T size={30} w={900} i style={styles.mt2}>
          {all.length} transactions
        </T>
        <T size={13} i color={colors.text2}>
          {oldest
            ? `Since ${formatFull(oldest.timestamp).split(' · ')[0]}`
            : 'Nothing stored yet'}
        </T>
      </Card>

      <Card radius={26} style={styles.card}>
        <ListRow
          icon="download"
          label="Export CSV"
          sub="Share a spreadsheet of your transactions (no SMS text)"
          onPress={exportCsv}
          divider
        />
        {sampleCount ? (
          <ListRow
            icon="trash"
            label="Remove sample data"
            sub={`${sampleCount} sample transactions`}
            onPress={() =>
              guard(async () => {
                await removeSample();
                showToast('Sample data removed');
              })
            }
            divider
          />
        ) : __DEV__ ? (
          // Development builds only — production shows real data exclusively.
          <ListRow
            icon="inbox"
            label="Load sample data"
            sub="12 months of realistic demo transactions"
            onPress={() =>
              guard(async () => {
                const r = await loadSample();
                showToast(`Added ${r.inserted.length} sample transactions`);
              })
            }
            divider
          />
        ) : null}
        <ListRow
          icon="trash"
          label="Delete all transactions"
          sub="Keeps your settings, categories and rules"
          onPress={confirmDelete}
          divider
        />
        <ListRow
          icon="trash"
          label="Erase all app data"
          sub="Transactions, rules, categories and settings"
          onPress={confirmErase}
        />
      </Card>

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  stats: { marginTop: 4, padding: 20 },
  mt2: { marginTop: 2 },
  card: { paddingVertical: 4, paddingHorizontal: 18 },
  busy: { paddingTop: 20, alignItems: 'center' },
});
