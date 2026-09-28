import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Logo, StackScreen } from '../components/common';
import { Card } from '../components/ui/controls';
import { Icon, IconName } from '../components/ui/Icon';
import { T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { APP_VERSION } from './SettingsScreen';

function Point({
  icon,
  title,
  body,
}: {
  icon: IconName;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.point}>
      <View style={styles.icon}>
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

export function AboutScreen() {
  return (
    <StackScreen title="Privacy & about">
      <Card bg={colors.lime} radius={26} style={styles.card}>
        <Point
          icon="lock"
          title="Stays on your phone"
          body="Transactions are stored in a local database on this device. There is no account, cloud sync or server."
        />
        <Point
          icon="msg"
          title="Only transaction SMS"
          body="Messages without an amount and a debit/credit are skipped before they reach the app. OTPs and offers are ignored."
        />
        <Point
          icon="shield"
          title="Nothing is sent anywhere"
          body="Release builds make no network requests. SMS content, account numbers and UPI IDs are never logged."
        />
        <Point
          icon="bank"
          title="Masked account numbers"
          body="Only the last digits your bank includes in the SMS are kept, shown as XXXX1234."
        />
      </Card>
      <Card radius={26} style={styles.card}>
        <View style={styles.brand}>
          <Logo size={48} />
          <T size={16} w={800} i>
            Money Made {APP_VERSION}
          </T>
        </View>
        <T size={13} color={colors.muted}>
          Personal expense tracker that reads bank and UPI SMS on-device.
          Categories come from built-in merchant rules and your own corrections.
        </T>
      </Card>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  card: { marginTop: 4, marginBottom: 8, padding: 18, gap: 4 },
  point: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.glass2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
