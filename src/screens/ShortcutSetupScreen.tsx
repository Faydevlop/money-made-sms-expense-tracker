import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { StackScreen } from '../components/common';
import { Card, PillButton } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { useUiStore } from '../store/uiStore';

const LINK = 'moneymade://sms?text=';

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Create a Message automation',
    body: 'Open the Shortcuts app → Automation → New Automation → Message.',
  },
  {
    title: 'Match bank messages',
    body: 'Set “Message Contains” to Rs. Choose “Run Immediately” and turn off “Notify When Run”, then tap Next → New Blank Automation.',
  },
  {
    title: 'Encode the message',
    body: 'Add the action “URL Encode”. Tap its input, choose “Shortcut Input”, then tap it again and pick “Content”.',
  },
  {
    title: 'Send it to Money Made',
    body: `Add the action “Open URLs”. Type ${LINK} and then insert the “URL Encoded Text” variable right after it. Tap Done.`,
  },
  {
    title: 'Repeat for “INR”',
    body: 'Some banks write amounts as INR. Create a second automation with “Message Contains” set to INR and the same two actions.',
  },
];

/**
 * iOS does not let apps read SMS. This guide sets up an iOS Shortcuts
 * automation that forwards each bank SMS to the app, where it is parsed on the
 * device exactly like Android SMS.
 */
export function ShortcutSetupScreen() {
  const showToast = useUiStore(s => s.showToast);
  return (
    <StackScreen title="Automatic tracking">
      <Card bg={colors.lavender} radius={26} style={styles.intro}>
        <T size={18} w={800} i>
          Track bank SMS on iPhone
        </T>
        <T size={13} color={colors.text2} style={styles.mt6}>
          iPhone doesn’t let apps read your messages. Instead, a Shortcuts automation hands each bank SMS to Money
          Made the moment it arrives. It is parsed on this phone and never sent anywhere. One-time setup, about 2
          minutes.
        </T>
      </Card>

      <Card radius={26} style={styles.steps}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={[styles.step, i < STEPS.length - 1 ? styles.divider : null]}>
            <View style={styles.num}>
              <T size={13} w={800} i color={colors.white}>
                {i + 1}
              </T>
            </View>
            <View style={styles.flex}>
              <T size={15} w={700} i>
                {s.title}
              </T>
              <T size={13} color={colors.text2} style={styles.mt2} selectable>
                {s.body}
              </T>
            </View>
          </View>
        ))}
      </Card>

      <Card bg={colors.sky} radius={26} style={styles.linkCard}>
        <T size={13} w={600} i color={colors.text2}>
          Link to type in “Open URLs”
        </T>
        <T size={16} w={800} selectable style={styles.mt6}>
          {LINK}
        </T>
        <T size={12} i color={colors.text2} style={styles.mt6}>
          Long-press to copy. The “URL Encoded Text” variable goes right after the = sign.
        </T>
      </Card>

      <Card bg={colors.lime} radius={26} style={styles.linkCard}>
        <View style={styles.row}>
          <Icon name="check" size={18} />
          <T size={15} w={700} i>
            What you’ll see
          </T>
        </View>
        <T size={13} color={colors.text2} style={styles.mt6}>
          When a bank SMS arrives, Money Made opens briefly and shows “Added · Merchant ₹amount”. OTPs, offers and
          reminders are ignored automatically, and the same SMS is never recorded twice.
        </T>
      </Card>

      <View style={styles.cta}>
        <PillButton
          icon="repeat"
          label="Open Shortcuts"
          justify="flex-start"
          onPress={() => Linking.openURL('shortcuts://').catch(() => showToast('Open the Shortcuts app from your home screen'))}
        />
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mt2: { marginTop: 2 },
  mt6: { marginTop: 6 },
  intro: { marginTop: 4, padding: 18 },
  steps: { paddingVertical: 4, paddingHorizontal: 18 },
  step: { flexDirection: 'row', gap: 12, paddingVertical: 14, alignItems: 'flex-start' },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  linkCard: { padding: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cta: { paddingTop: 12, paddingHorizontal: 16 },
});
