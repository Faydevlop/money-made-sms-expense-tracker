import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { EmptyState, StackScreen } from '../components/common';
import { amountColor, amountLabel } from '../components/TransactionItem';
import { Card, PillButton, Switch } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { fontFamily, T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { UNCATEGORIZED } from '../constants/categories';
import { tileColors, useCategoryMeta } from '../hooks/useCategoryMeta';
import { useNow } from '../hooks/useNow';
import { TYPE_NAMES, useTxActions } from '../hooks/useTxActions';
import { RootStackParamList } from '../navigation/types';
import { useTransactionStore } from '../store/transactionStore';
import { useUiStore } from '../store/uiStore';
import { formatFull, formatWhen } from '../utils/dateUtils';
import { accountLong } from '../utils/transactionUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'TransactionDetails'>;

function Field({
  label,
  value,
  action,
  color = colors.ink,
  onPress,
}: {
  label: string;
  value: string;
  action?: string;
  color?: string;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.field}>
      <T size={13} i color={colors.muted2} style={styles.fieldLabel}>
        {label}
      </T>
      <T
        size={15}
        w={700}
        i
        color={color}
        style={styles.flex}
        selectable={!onPress}
      >
        {value}
      </T>
      {action ? (
        <View style={styles.act}>
          <T size={12} w={800} i>
            {action}
          </T>
        </View>
      ) : null}
    </View>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. ${action ?? ''}`}
      onPress={onPress}
    >
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function TransactionDetailsScreen({ route }: Props) {
  const { id } = route.params;
  const t = useTransactionStore(s => s.transactions.find(x => x.id === id));
  const setNotes = useTransactionStore(s => s.setNotes);
  const openSheet = useUiStore(s => s.openSheet);
  const actions = useTxActions();
  const meta = useCategoryMeta();
  const now = useNow();
  const [note, setNote] = useState(t?.notes ?? '');
  const saved = useRef(t?.notes ?? '');

  // Persist notes shortly after typing stops, and on leave.
  useEffect(() => {
    if (!t || note === saved.current) return;
    const h = setTimeout(() => {
      saved.current = note;
      setNotes(t.id, note).catch(() => {});
    }, 600);
    return () => clearTimeout(h);
  }, [note, t, setNotes]);

  if (!t) {
    return (
      <StackScreen title="Transaction">
        <EmptyState
          icon="inbox"
          title="Transaction not found"
          body="It may have been deleted."
        />
      </StackScreen>
    );
  }

  const tile = tileColors(t, meta);
  const heroBg =
    t.type === 'income'
      ? colors.greenBg
      : !t.isCategorized
      ? colors.redBg
      : meta(t.category).color;
  const dirLabel =
    t.type === 'income'
      ? 'Money received'
      : t.type === 'transfer'
      ? 'Transfer between your accounts'
      : t.type === 'unknown'
      ? 'Direction unclear'
      : 'Money spent';

  return (
    <StackScreen title="Transaction">
      <Card bg={heroBg} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Icon name={tile.icon} size={24} color={tile.fg} />
          </View>
          <View style={styles.flex}>
            <T size={20} w={800} i numberOfLines={1}>
              {t.merchant}
            </T>
            <T size={13} i color={colors.text2}>
              {dirLabel}
            </T>
          </View>
        </View>
        <T
          size={44}
          w={900}
          i
          tabular
          color={amountColor(t)}
          style={[styles.amount, t.isExcluded ? styles.strike : null]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {amountLabel(t)}
        </T>
        <T size={14} i color={colors.text2}>
          {formatFull(t.timestamp)}
        </T>
        {t.isExcluded ? (
          <View style={styles.excludedBadge}>
            <T size={12} w={800} i>
              Excluded from totals
            </T>
          </View>
        ) : null}
      </Card>

      <Card radius={26} style={styles.fields}>
        <Field
          label="Category"
          value={t.category ?? UNCATEGORIZED}
          action="Change"
          color={t.isCategorized ? colors.ink : colors.redText}
          onPress={() => openSheet({ kind: 'category', txId: t.id })}
        />
        <Field
          label="Merchant"
          value={t.merchant}
          action="Edit"
          onPress={() => openSheet({ kind: 'merchant', txId: t.id })}
        />
        <Field
          label="Type"
          value={TYPE_NAMES[t.type]}
          action="Change"
          color={t.type === 'unknown' ? colors.redText : colors.ink}
          onPress={() => openSheet({ kind: 'type', txId: t.id })}
        />
        <Field label="Date & time" value={formatWhen(t.timestamp, now)} />
        <Field label="Payment method" value={t.paymentMethod} />
        <Field label="Account" value={accountLong(t)} />
        <Field label="Reference no." value={t.referenceNumber ?? '—'} />
      </Card>

      {t.originalSms ? (
        <Card bg={colors.sky} radius={26} style={styles.smsCard}>
          <View style={styles.smsHead}>
            <Icon name="msg" size={14} />
            <T size={14} w={600} i>
              Original SMS{t.smsSender ? ` · ${t.smsSender}` : ''}
            </T>
          </View>
          <View style={styles.bubble}>
            <T size={13} lh={1.5} color={colors.smsText} selectable>
              {t.originalSms}
            </T>
          </View>
          <T size={12} i color={colors.text2} style={styles.mt8}>
            Received {formatWhen(t.timestamp, now)} ·{' '}
            {t.source === 'sample' ? 'sample data' : 'parsed automatically'}
          </T>
        </Card>
      ) : null}

      <Card radius={26} style={styles.notes}>
        <T size={14} w={600} i style={styles.mb8}>
          Notes
        </T>
        <TextInput
          value={note}
          onChangeText={setNote}
          onBlur={() => {
            if (note !== saved.current) {
              saved.current = note;
              setNotes(t.id, note).catch(() => {});
            }
          }}
          placeholder="Add a note"
          placeholderTextColor={colors.muted2}
          multiline
          maxLength={1000}
          style={styles.textarea}
          accessibilityLabel="Notes"
        />
      </Card>

      <Card radius={26} style={styles.exclude}>
        <View style={styles.flex}>
          <T size={16} w={700} i>
            Exclude from totals
          </T>
          <T size={12} color={colors.muted2}>
            Keep it listed, but leave it out of spending and income.
          </T>
        </View>
        <Switch
          label="Exclude from totals"
          value={t.isExcluded}
          onChange={v => actions.toggleExcluded(t.id, v)}
        />
      </Card>

      {t.type !== 'transfer' && t.type !== 'income' ? (
        <View style={styles.transfer}>
          <PillButton
            icon="swap"
            label="Mark as transfer between my accounts"
            justify="flex-start"
            onPress={() => actions.markTransfer(t.id)}
          />
        </View>
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  hero: { marginTop: 4, paddingVertical: 22, paddingHorizontal: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: { letterSpacing: -0.9, marginTop: 18 },
  strike: { textDecorationLine: 'line-through' },
  excludedBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: colors.white,
  },
  fields: { paddingVertical: 4, paddingHorizontal: 18 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  fieldLabel: { width: 112 },
  act: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: colors.soft,
  },
  smsCard: { padding: 18 },
  smsHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bubble: {
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 4,
  },
  mt8: { marginTop: 8 },
  mb8: { marginBottom: 8 },
  notes: { paddingVertical: 16, paddingHorizontal: 18 },
  textarea: {
    minHeight: 70,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.bg,
    fontSize: 14,
    fontFamily: fontFamily(400),
    color: colors.ink,
    textAlignVertical: 'top',
  },
  exclude: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  transfer: { paddingTop: 12, paddingHorizontal: 16 },
});
