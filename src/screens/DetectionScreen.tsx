import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { ListRow, SectionTitle, StackScreen } from '../components/common';
import { Card, PillButton, Switch } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { useNow } from '../hooks/useNow';
import { runInboxScan } from '../hooks/useSmsTracking';
import { normalizeSender } from '../services/transactionService';
import { requestSmsPermission, setNativeTracking } from '../sms/smsReceiver';
import { useSettingsStore } from '../store/settingsStore';
import { useTransactionStore } from '../store/transactionStore';
import { useUiStore } from '../store/uiStore';
import { groupIndian } from '../utils/currencyUtils';
import {
  formatWhen,
  inRange,
  monthIndexOf,
  monthRange,
} from '../utils/dateUtils';
import { accountShort, shortBankName } from '../utils/transactionUtils';

const PERMISSION_LABEL: Record<string, string> = {
  granted: 'Granted',
  denied: 'Not granted',
  blocked: 'Blocked — open settings',
  unavailable: 'Not available on this device',
  unknown: 'Checking…',
};

const IOS = Platform.OS === 'ios';

export function DetectionScreen() {
  const nav = useNavigation();
  const now = useNow();
  const all = useTransactionStore(s => s.transactions);
  const tracking = useSettingsStore(s => s.trackingEnabled);
  const permission = useSettingsStore(s => s.permission);
  const disabled = useSettingsStore(s => s.disabledSenders);
  const scanning = useSettingsStore(s => s.scanning);
  const lastScanAt = useSettingsStore(s => s.lastScanAt);
  const update = useSettingsStore(s => s.update);
  const setPermission = useSettingsStore(s => s.setPermission);
  const showToast = useUiStore(s => s.showToast);

  const senders = useMemo(() => {
    const [a, b] = monthRange(monthIndexOf(now));
    const month = new Set(inRange(all, a, b).map(t => t.id));
    const m = new Map<
      string,
      { id: string; bank: string; count: number; accounts: Set<string> }
    >();
    for (const t of all) {
      if (!t.smsSender) continue;
      const id = normalizeSender(t.smsSender);
      const e = m.get(id) ?? {
        id,
        bank: shortBankName(t.bank) || 'Unknown bank',
        count: 0,
        accounts: new Set<string>(),
      };
      if (month.has(t.id)) e.count++;
      if (t.account) e.accounts.add(accountShort(t));
      m.set(id, e);
    }
    return [...m.values()];
  }, [all, now]);

  const ensurePermission = async (): Promise<boolean> => {
    if (permission === 'granted') return true;
    if (permission === 'blocked') {
      Linking.openSettings();
      return false;
    }
    const p = await requestSmsPermission();
    setPermission(p);
    if (p === 'blocked')
      showToast('SMS permission is blocked. Enable it in App info.');
    if (p === 'unavailable') showToast('SMS is not available on this device');
    return p === 'granted';
  };

  const toggleTracking = async (on: boolean) => {
    if (on && !IOS && !(await ensurePermission())) return;
    await update({ trackingEnabled: on });
    setNativeTracking(on);
    showToast(on ? 'Automatic detection on' : 'Automatic detection paused');
  };

  const rescan = async () => {
    if (!(await ensurePermission())) return;
    try {
      const r = await runInboxScan(true);
      const n = r.inserted.length;
      showToast(
        `Scanned ${groupIndian(r.scanned)} messages · ${
          n
            ? `${n} new transaction${n === 1 ? '' : 's'}`
            : 'no new transactions'
        }`,
      );
    } catch {
      showToast('Could not read the SMS inbox');
    }
  };

  const toggleSender = (id: string) => {
    const next = disabled.includes(id)
      ? disabled.filter(x => x !== id)
      : [...disabled, id];
    update({ disabledSenders: next }).catch(() => {});
  };

  return (
    <StackScreen title="Transaction detection">
      <Card bg={colors.lavender} radius={26} style={styles.main}>
        <View style={[styles.row, styles.divider]}>
          <View style={styles.flex}>
            <T size={16} w={700} i>
              Automatic detection
            </T>
            <T size={12} color={colors.text2}>
              {IOS
                ? 'Record bank SMS sent by your Shortcuts automation'
                : 'Read bank and UPI transaction SMS'}
            </T>
          </View>
          <Switch
            label="Automatic detection"
            value={IOS ? tracking : tracking && permission === 'granted'}
            onChange={toggleTracking}
          />
        </View>
        {IOS ? (
          <ListRow
            label="Setup guide"
            sub="Create the Shortcuts automation"
            onPress={() => nav.navigate('ShortcutSetup')}
          />
        ) : (
          <View style={styles.row}>
            <View style={styles.flex}>
              <T size={16} w={700} i>
                Last inbox scan
              </T>
              <T size={12} color={colors.text2}>
                {lastScanAt ? formatWhen(lastScanAt, now) : 'Not scanned yet'}
              </T>
            </View>
          </View>
        )}
      </Card>

      <SectionTitle>Detected senders</SectionTitle>
      <Card radius={26} style={[styles.main, styles.mt0]}>
        {senders.length === 0 ? (
          <T size={14} i color={colors.muted} style={styles.row}>
            Senders appear here once a transaction SMS is detected.
          </T>
        ) : (
          senders.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.row,
                i < senders.length - 1 ? styles.divider : null,
              ]}
            >
              <View style={styles.icon}>
                <Icon name="bank" size={20} />
              </View>
              <View style={styles.flex}>
                <T size={15} w={700} i numberOfLines={1}>
                  {s.id} · {s.bank}
                </T>
                <T size={12} color={colors.muted2} numberOfLines={1}>
                  {s.count} this month
                  {s.accounts.size ? ' · ' + [...s.accounts].join(', ') : ''}
                </T>
              </View>
              <Switch
                label={`Detect from ${s.id}`}
                value={!disabled.includes(s.id) && tracking}
                onChange={() => toggleSender(s.id)}
              />
            </View>
          ))
        )}
      </Card>

      <Card radius={26} style={styles.main}>
        {IOS ? (
          <View style={[styles.rowBetween, styles.divider]}>
            <T size={14} i>
              Source
            </T>
            <T size={14} w={700} i>
              iOS Shortcuts
            </T>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={permission === 'granted'}
            onPress={ensurePermission}
            style={[styles.rowBetween, styles.divider]}
          >
            <T size={14} i>
              SMS permission
            </T>
            <T
              size={14}
              w={700}
              i
              color={permission === 'granted' ? colors.ink : colors.redText}
            >
              {PERMISSION_LABEL[permission]}
            </T>
          </Pressable>
        )}
        <View style={styles.rowBetween}>
          <T size={14} i>
            OTP & promotional SMS
          </T>
          <T size={14} w={700} i>
            Always ignored
          </T>
        </View>
      </Card>

      <View style={styles.cta}>
        {IOS ? (
          <PillButton
            icon="repeat"
            label="How to set up the Shortcut"
            justify="flex-start"
            onPress={() => nav.navigate('ShortcutSetup')}
          />
        ) : scanning ? (
          <View style={styles.scanning}>
            <ActivityIndicator color={colors.white} />
            <T size={16} w={700} i color={colors.white}>
              Scanning inbox…
            </T>
          </View>
        ) : (
          <PillButton
            icon="refresh"
            label="Rescan inbox"
            justify="flex-start"
            onPress={rescan}
            disabled={permission === 'unavailable'}
          />
        )}
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  main: { marginTop: 4, paddingVertical: 4, paddingHorizontal: 18 },
  mt0: { marginTop: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
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
  cta: { paddingTop: 12, paddingHorizontal: 16 },
  scanning: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
  },
});
