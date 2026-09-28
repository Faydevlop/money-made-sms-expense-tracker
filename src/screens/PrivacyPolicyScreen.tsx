import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { StackScreen } from '../components/common';
import { Card, PillButton } from '../components/ui/controls';
import { T } from '../components/ui/T';
import { colors } from '../constants/colors';
import {
  APP_NAME,
  CONTACT_EMAIL,
  EFFECTIVE_DATE,
  PRIVACY_POLICY_URL,
  PRIVACY_SECTIONS,
  PRIVACY_SUMMARY,
} from '../legal/privacyPolicy';
import { useUiStore } from '../store/uiStore';

/** Full privacy policy, from the same source as the published web page. */
export function PrivacyPolicyScreen() {
  const showToast = useUiStore(s => s.showToast);
  return (
    <StackScreen title="Privacy policy">
      <Card bg={colors.lavender} radius={26} style={styles.card}>
        <T size={18} w={800} i>
          {APP_NAME} privacy policy
        </T>
        <T size={12} i color={colors.text2} style={styles.mt4}>
          Effective {EFFECTIVE_DATE}
        </T>
        <T size={14} color={colors.ink} style={styles.mt8}>
          {PRIVACY_SUMMARY}
        </T>
      </Card>

      {PRIVACY_SECTIONS.map(s => (
        <Card key={s.title} radius={26} style={styles.card}>
          <T size={16} w={800} i>
            {s.title}
          </T>
          {s.paragraphs.map(p => (
            <T key={p} size={14} color={colors.text2} style={styles.mt6} selectable>
              {p}
            </T>
          ))}
          {s.bullets?.map(b => (
            <View key={b} style={styles.bullet}>
              <T size={14} color={colors.text2}>
                •
              </T>
              <T size={14} color={colors.text2} style={styles.flex} selectable>
                {b}
              </T>
            </View>
          ))}
        </Card>
      ))}

      <View style={styles.actions}>
        <PillButton
          icon="msg"
          label={`Email ${CONTACT_EMAIL}`}
          variant="secondary"
          justify="flex-start"
          onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`).catch(() => showToast(CONTACT_EMAIL))}
        />
        <T size={12} i color={colors.muted2} style={styles.url} selectable>
          Also published at {PRIVACY_POLICY_URL}
        </T>
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { marginTop: 10, padding: 18 },
  mt4: { marginTop: 4 },
  mt6: { marginTop: 6 },
  mt8: { marginTop: 8 },
  bullet: { flexDirection: 'row', gap: 8, marginTop: 4, paddingLeft: 4 },
  actions: { paddingTop: 14, paddingHorizontal: 16, gap: 10 },
  url: { marginHorizontal: 8 },
});
