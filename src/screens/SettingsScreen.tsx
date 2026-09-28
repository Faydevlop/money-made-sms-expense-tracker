import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListRow } from '../components/common';
import { FadeIn } from '../components/motion';
import { Card, PillButton } from '../components/ui/controls';
import { T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { useNow } from '../hooks/useNow';
import { useAccounts } from '../hooks/useTransactionData';
import { useSettingsStore } from '../store/settingsStore';
import { useTransactionStore } from '../store/transactionStore';
import {
  formatWhen,
  inRange,
  monthIndexOf,
  monthRange,
} from '../utils/dateUtils';

export const APP_VERSION = '1.0.0';

export function trackingStatus(tracking: boolean, permission: string) {
  // iOS has no SMS permission: tracking runs through the Shortcuts automation.
  if (Platform.OS === 'ios') {
    return tracking
      ? { label: 'Active', bg: colors.white, fg: colors.green }
      : { label: 'Not set up', bg: colors.redBg, fg: colors.redDeep };
  }
  if (tracking && permission === 'granted')
    return { label: 'Active', bg: colors.white, fg: colors.green };
  if (tracking)
    return { label: 'Needs permission', bg: colors.redBg, fg: colors.redDeep };
  return { label: 'Paused', bg: colors.redBg, fg: colors.redDeep };
}

export function SettingsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const all = useTransactionStore(s => s.transactions);
  const categories = useTransactionStore(s => s.categories);
  const rules = useTransactionStore(s => s.rules);
  const tracking = useSettingsStore(s => s.trackingEnabled);
  const permission = useSettingsStore(s => s.permission);
  const accounts = useAccounts();

  const s = useMemo(() => {
    const [a, b] = monthRange(monthIndexOf(now));
    const newestSms = all.find(t => t.source === 'sms');
    return {
      thisMonth: inRange(all, a, b).filter(t => t.source === 'sms').length,
      last: newestSms ? formatWhen(newestSms.createdAt, now) : '—',
      excluded: all.filter(t => t.isExcluded).length,
    };
  }, [all, now]);
  const status = trackingStatus(tracking, permission);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: 110 + insets.bottom,
      }}
    >
      <FadeIn index={0} style={styles.title}>
        <T size={30} w={800} i>
          Settings
        </T>
      </FadeIn>

      <FadeIn index={1}>
        <Card bg={colors.lavender} style={styles.tracking}>
          <View style={styles.rowBetween}>
            <T size={18} w={800} i>
              Transaction tracking
            </T>
            <View style={[styles.status, { backgroundColor: status.bg }]}>
              <View
                style={[styles.statusDot, { backgroundColor: status.fg }]}
              />
              <T size={12} w={800} i color={status.fg}>
                {status.label}
              </T>
            </View>
          </View>
          <View style={styles.trackBox}>
            <View style={[styles.rowBetween, styles.trackRow, styles.divider]}>
              <T size={14} i color={colors.text2}>
                Last transaction detected
              </T>
              <T size={14} w={700} i>
                {s.last}
              </T>
            </View>
            <T size={14} i style={styles.trackRow}>
              {s.thisMonth
                ? `${s.thisMonth} transactions automatically detected this month`
                : 'No transactions detected yet'}
            </T>
          </View>
          <PillButton
            label="Manage transaction detection"
            variant="secondary"
            trailingIcon="cr"
            justify="space-between"
            minHeight={52}
            style={styles.mt12}
            onPress={() => nav.navigate('Detection')}
          />
        </Card>
      </FadeIn>

      <FadeIn index={2}>
        <Card style={styles.list}>
          <ListRow
            icon="tag"
            label="Categories & rules"
            sub={`${categories.length} categories · ${
              rules.length
            } merchant rule${rules.length === 1 ? '' : 's'}`}
            onPress={() => nav.navigate('Categories')}
          />
          <ListRow
            icon="bank"
            label="Accounts"
            sub={
              accounts.length
                ? accounts
                    .slice(0, 3)
                    .map(a => a.label)
                    .join(' · ')
                : 'Detected from your bank SMS'
            }
            onPress={() => nav.navigate('Accounts')}
          />
          <ListRow
            icon="eyeoff"
            label="Excluded transactions"
            sub={`${s.excluded} excluded from totals`}
            onPress={() => nav.navigate('Excluded')}
          />
          <ListRow
            icon="database"
            label="Data management"
            sub={`${all.length} transactions stored on this device`}
            onPress={() => nav.navigate('Data')}
          />
          <ListRow
            icon="shield"
            label="Privacy & about"
            sub="SMS are processed on this device"
            onPress={() => nav.navigate('About')}
          />
        </Card>
      </FadeIn>

      <FadeIn index={3}>
        <T size={12} i color={colors.muted2} style={styles.footer}>
          Money Made {APP_VERSION} · SMS are processed on this device
        </T>
      </FadeIn>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  title: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 12 },
  tracking: {
    marginTop: 0,
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  trackBox: {
    marginTop: 14,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.glass,
  },
  trackRow: { paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  mt12: { marginTop: 12 },
  list: { paddingVertical: 4, paddingHorizontal: 18 },
  footer: { marginTop: 16, marginHorizontal: 24 },
});
