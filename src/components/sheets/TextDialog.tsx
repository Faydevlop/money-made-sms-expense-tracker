import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors } from '../../constants/colors';
import { useTxActions } from '../../hooks/useTxActions';
import { useSettingsStore } from '../../store/settingsStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { fontFamily } from '../ui/T';
import { PillButton } from '../ui/controls';
import { T } from '../ui/T';
import { Dialog } from './BottomSheet';

function TextDialog({
  title,
  initial,
  hint,
  placeholder,
  onSave,
}: {
  title: string;
  initial: string;
  hint?: string;
  placeholder?: string;
  onSave: (v: string) => void;
}) {
  const closeSheet = useUiStore(s => s.closeSheet);
  const [draft, setDraft] = useState(initial);
  const save = () => {
    const v = draft.trim();
    if (v) onSave(v);
  };
  return (
    <Dialog onClose={closeSheet}>
      <T size={22} w={800} i>
        {title}
      </T>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        autoFocus
        placeholder={placeholder}
        placeholderTextColor={colors.muted2}
        maxLength={60}
        returnKeyType="done"
        onSubmitEditing={save}
        style={styles.input}
        accessibilityLabel={title}
      />
      {hint ? (
        <T size={12} i color={colors.muted2}>
          {hint}
        </T>
      ) : null}
      <View style={styles.row}>
        <PillButton label="Cancel" variant="soft" minHeight={50} onPress={closeSheet} style={styles.flex} />
        <PillButton label="Save" minHeight={50} onPress={save} disabled={!draft.trim()} style={styles.flex} />
      </View>
    </Dialog>
  );
}

export function MerchantDialog({ txId }: { txId: string }) {
  const t = useTransactionStore(s => s.transactions.find(x => x.id === txId));
  const actions = useTxActions();
  if (!t) return null;
  return <TextDialog title="Edit merchant name" initial={t.merchant} hint={`Original: ${t.originalMerchant}`} onSave={v => actions.rename(t.id, v)} />;
}

export function NameDialog() {
  const userName = useSettingsStore(s => s.userName);
  const update = useSettingsStore(s => s.update);
  const closeSheet = useUiStore(s => s.closeSheet);
  return (
    <TextDialog
      title="Your name"
      initial={userName}
      placeholder="What should we call you?"
      hint="Only used for the greeting on this device."
      onSave={v => {
        update({ userName: v }).catch(() => {});
        closeSheet();
      }}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: colors.soft,
    fontSize: 16,
    fontFamily: fontFamily(600, true),
    color: colors.ink,
  },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
