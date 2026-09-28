import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../components/common';
import { FadeIn } from '../components/motion';
import { PillButton } from '../components/ui/controls';
import { Icon, IconName } from '../components/ui/Icon';
import { T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { runInboxScan } from '../hooks/useSmsTracking';
import { RootStackParamList } from '../navigation/types';
import {
  requestSmsPermission,
  setNativeTracking,
  SmsPermission,
} from '../sms/smsReceiver';
import { useSettingsStore } from '../store/settingsStore';
import { useTransactionStore } from '../store/transactionStore';
import { inRange, monthIndexOf, monthRange } from '../utils/dateUtils';
import { shortBankName } from '../utils/transactionUtils';

const IOS = Platform.OS === 'ios';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
type Step =
  | 'intro'
  | 'requesting'
  | 'scanning'
  | 'done'
  | Exclude<SmsPermission, 'granted'>;

interface Summary {
  thisMonth: number;
  accounts: string;
  months: number;
}

function Feature({
  icon,
  bg,
  title,
  body,
}: {
  icon: IconName;
  bg: string;
  title: string;
  body: string;
}) {
  return (
    <View style={[styles.feature, { backgroundColor: bg }]}>
      <View style={styles.featureIcon}>
        <Icon name={icon} size={20} />
      </View>
      <View style={styles.flex}>
        <T size={15} w={700} i>
          {title}
        </T>
        <T size={13} color={colors.text2}>
          {body}
        </T>
      </View>
    </View>
  );
}

function untilActive(): Promise<void> {
  const frames = () =>
    new Promise<void>(resolve =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setTimeout(resolve, 150)),
      ),
    );
  if (AppState.currentState === 'active') return frames();
  return new Promise(resolve => {
    const sub = AppState.addEventListener('change', s => {
      if (s !== 'active') return;
      sub.remove();
      frames().then(resolve);
    });
  });
}

function summarize(): Summary {
  const all = useTransactionStore.getState().transactions;
  const [a, b] = monthRange(monthIndexOf(Date.now()));
  const banks = [
    ...new Set(all.map(t => shortBankName(t.bank)).filter(Boolean)),
  ];
  const months = all.length
    ? monthIndexOf(all[0].timestamp) -
      monthIndexOf(all[all.length - 1].timestamp) +
      1
    : 0;
  return {
    thisMonth: inRange(all, a, b).length,
    accounts: banks.slice(0, 3).join(' · ') || 'None yet',
    months,
  };
}

export function OnboardingScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const update = useSettingsStore(s => s.update);
  const setPermission = useSettingsStore(s => s.setPermission);
  const [step, setStep] = useState<Step>('intro');
  const [summary, setSummary] = useState<Summary | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const autoStarted = useRef(false);

  const finish = async (tracking: boolean) => {
    await update({ onboardingDone: true, trackingEnabled: tracking }).catch(
      () => {},
    );
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Tabs');
  };

  const allow = async () => {
    setStep('requesting');
    const p = await requestSmsPermission();
    // The system dialog pauses our activity. Committing a large tree change while
    // it is resuming made Fabric drop mount instructions (views never appeared),
    // so wait until we are active again and a couple of frames have passed.
    await untilActive();
    setPermission(p);
    if (p !== 'granted') {
      setStep(p);
      return;
    }
    await update({ trackingEnabled: true }).catch(() => {});
    setNativeTracking(true);
    setStep('scanning');
    progress.setValue(0);
    // Native-driven transform: animating `width` from JS raced with Fabric
    // mounting the summary below and left it unmounted.
    Animated.timing(progress, {
      toValue: 0.7,
      duration: 1400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    try {
      await runInboxScan(true);
    } catch {
      // Scan failures are non-fatal; tracking continues with new messages.
    }
    setSummary(summarize());
    setStep('done');
    Animated.timing(progress, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  /** iOS: no SMS permission exists; tracking runs through an iOS Shortcuts automation. */
  const setUpIos = async () => {
    await update({ onboardingDone: true, trackingEnabled: true }).catch(() => {});
    if (navigation.canGoBack()) navigation.replace('ShortcutSetup');
    else navigation.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'ShortcutSetup' }] });
  };

  useEffect(() => {
    if (IOS) return;
    if (route.params?.startAt === 'permission' && !autoStarted.current) {
      autoStarted.current = true;
      allow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pad = {
    paddingTop: insets.top + 24,
    paddingBottom: insets.bottom + 28,
  };

  if (step === 'scanning' || step === 'done') {
    return (
      <ScrollView
        style={styles.bg}
        contentContainerStyle={[styles.page, pad, styles.grow]}
      >
        <T size={15} w={600} i color={colors.muted}>
          Setting up
        </T>
        <T size={34} w={800} i style={styles.mt8}>
          {step === 'done' ? 'You’re all set.' : 'Reading transaction SMS…'}
        </T>
        <View style={styles.track}>
          <Animated.View
            style={[styles.fill, { transform: [{ scaleX: progress }] }]}
          />
        </View>
        <View>
          {step === 'done' && summary ? (
            <FadeIn style={styles.summary}>
              <SummaryRow
                label="Transactions this month"
                value={String(summary.thisMonth)}
                divider
              />
              <SummaryRow
                label="Accounts found"
                value={summary.accounts}
                divider
              />
              <SummaryRow
                label="History imported"
                value={`${summary.months} month${
                  summary.months === 1 ? '' : 's'
                }`}
              />
            </FadeIn>
          ) : null}
        </View>
        <View style={styles.flex} />
        <View>
          {step === 'done' ? (
            <FadeIn index={3}>
              <PillButton
                label="Go to dashboard"
                trailingIcon="cr"
                justify="space-between"
                minHeight={58}
                onPress={() => finish(true)}
              />
            </FadeIn>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  const blocked = step === 'blocked';
  const denied = step === 'denied';
  const unavailable = step === 'unavailable';

  return (
    <ScrollView
      style={styles.bg}
      contentContainerStyle={[styles.page, pad, styles.grow]}
    >
      <FadeIn index={0}>
        <Logo size={56} />
      </FadeIn>
      <FadeIn index={1} offset={20}>
        <T size={40} w={300} i lh={1.05} style={styles.mt22}>
          Your spending,
        </T>
        <T size={40} w={800} i lh={1.05}>
          tracked from SMS
        </T>
      </FadeIn>
      <FadeIn index={2}>
        <T size={15} color={colors.muted} style={styles.mt12}>
          {IOS
            ? 'Automatic transaction tracking: an iOS Shortcuts automation hands each bank SMS to Money Made, which reads the amount, merchant, date and account’s last digits to record your income and expenses. Everything is processed and stored only on this phone and is never uploaded or shared.'
            : 'Automatic transaction tracking: Money Made reads the SMS messages on this phone to find bank and UPI transaction alerts, and uses the amount, merchant, date and account’s last digits to record your income and expenses. Everything is processed and stored only on this phone — your SMS and transaction data are never uploaded or shared.'}
        </T>
      </FadeIn>

      {denied || blocked || unavailable ? (
        <FadeIn
          key={step}
          index={3}
          style={[styles.notice, { backgroundColor: colors.peach }]}
        >
          <T size={16} w={800} i>
            {unavailable
              ? 'SMS isn’t available on this device'
              : blocked
              ? 'SMS access is turned off'
              : 'SMS access was not allowed'}
          </T>
          <T size={13} i color={colors.text2} style={styles.mt4}>
            {unavailable
              ? 'This device can’t receive SMS, so automatic tracking isn’t possible. You can continue, but transactions won’t be recorded automatically.'
              : blocked
              ? 'Android won’t show the permission prompt again. Enable SMS in App info → Permissions to turn on tracking.'
              : 'Money Made can’t record transactions without reading bank SMS. You can allow it now or later from Settings.'}
          </T>
        </FadeIn>
      ) : (
        <View style={styles.features}>
          <FadeIn index={3}>
            <Feature
              icon="msg"
              bg={colors.lavender}
              title="Only transaction alerts"
              body="Personal chats and OTPs are ignored."
            />
          </FadeIn>
          <FadeIn index={4}>
            <Feature
              icon="check"
              bg={colors.lime}
              title="Processed on your phone"
              body="SMS content never leaves the device."
            />
          </FadeIn>
          <FadeIn index={5}>
            <Feature
              icon="filter"
              bg={colors.sky}
              title="Sorted automatically"
              body="Anything unclear goes to Needs review."
            />
          </FadeIn>
        </View>
      )}

      <View style={styles.flex} />
      {blocked ? (
        <PillButton
          label="Open app settings"
          trailingIcon="cr"
          justify="space-between"
          minHeight={58}
          onPress={() => Linking.openSettings()}
        />
      ) : IOS ? (
        <PillButton
          label="Set up automatic tracking"
          trailingIcon="cr"
          justify="space-between"
          minHeight={58}
          onPress={setUpIos}
        />
      ) : unavailable ? null : (
        <PillButton
          label={
            step === 'requesting'
              ? 'Waiting for permission…'
              : denied
              ? 'Try again'
              : 'Allow SMS access'
          }
          trailingIcon="cr"
          justify="space-between"
          minHeight={58}
          disabled={step === 'requesting'}
          onPress={allow}
        />
      )}
      <T size={12} color={colors.muted} center style={styles.consent}>
        {IOS
          ? 'By continuing you agree to Money Made processing the bank SMS your Shortcut sends, as described in the '
          : 'By tapping “Allow SMS access” you agree to Money Made reading transaction SMS on this phone, as described in the '}
        <T size={12} w={700} color={colors.ink} style={styles.link} onPress={() => navigation.navigate('PrivacyPolicy')} accessibilityRole="link">
          Privacy Policy
        </T>
        .
      </T>
      <PillButton
        label={unavailable ? 'Continue' : 'Not now'}
        variant="ghost"
        minHeight={52}
        onPress={() => finish(false)}
        style={styles.mt10}
      />
    </ScrollView>
  );
}

function SummaryRow({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, divider ? styles.divider : null]}>
      <T size={15} i>
        {label}
      </T>
      <T size={15} w={700} i style={styles.summaryValue} numberOfLines={1}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  grow: { flexGrow: 1 },
  flex: { flex: 1 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt10: { marginTop: 10 },
  mt12: { marginTop: 12 },
  mt22: { marginTop: 22 },
  consent: { marginTop: 14, paddingHorizontal: 8 },
  link: { textDecorationLine: 'underline' },
  features: { gap: 10, marginTop: 24 },
  feature: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.glass2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: { marginTop: 24, padding: 18, borderRadius: 24 },
  track: {
    height: 10,
    borderRadius: 99,
    backgroundColor: colors.track,
    marginTop: 24,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    width: '100%',
    borderRadius: 99,
    backgroundColor: colors.ink,
    transformOrigin: 'left',
  },
  summary: {
    marginTop: 24,
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: colors.lavender,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
  },
  summaryValue: { flexShrink: 1, textAlign: 'right' },
  divider: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' },
});
