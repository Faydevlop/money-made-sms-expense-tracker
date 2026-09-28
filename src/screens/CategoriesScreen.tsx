import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SectionTitle, StackScreen } from '../components/common';
import { Card, PillButton } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { fontFamily, T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { ScalePressable } from '../components/motion';
import { useOpenTransactions } from '../hooks/useOpenTransactions';
import { useTransactionStore } from '../store/transactionStore';
import { useUiStore } from '../store/uiStore';

export function CategoriesScreen() {
  const categories = useTransactionStore(s => s.categories);
  const rules = useTransactionStore(s => s.rules);
  const all = useTransactionStore(s => s.transactions);
  const addCategory = useTransactionStore(s => s.addCategory);
  const removeCategory = useTransactionStore(s => s.removeCategory);
  const removeRule = useTransactionStore(s => s.removeRule);
  const showToast = useUiStore(s => s.showToast);
  const [draft, setDraft] = useState('');
  const openTransactions = useOpenTransactions();

  const counts = new Map<string, number>();
  for (const t of all)
    if (t.category) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);

  const add = async () => {
    try {
      const c = await addCategory(draft);
      setDraft('');
      showToast(`Added ${c.name}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not add category');
    }
  };

  const confirmRemove = (id: string) => {
    const c = categories.find(x => x.id === id);
    if (!c) return;
    Alert.alert(
      `Delete “${c.name}”?`,
      'Its transactions will move to Needs review, and its merchant rules are removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            removeCategory(c).then(
              () => showToast(`Deleted ${c.name}`),
              () => showToast('Could not delete category'),
            ),
        },
      ],
    );
  };

  return (
    <StackScreen title="Categories & rules">
      <Card radius={26} style={styles.card}>
        {categories.map((c, i) => (
          <ScalePressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, ${
              counts.get(c.name) ?? 0
            } transactions, show them`}
            onPress={() =>
              openTransactions({ filters: { categories: [c.name] } })
            }
            scaleTo={0.98}
            style={[
              styles.row,
              i < categories.length - 1 ? styles.divider : null,
            ]}
          >
            <View style={[styles.tile, { backgroundColor: c.color }]}>
              <Icon name={c.icon} size={18} />
            </View>
            <View style={styles.flex}>
              <T size={16} w={700} i>
                {c.name}
              </T>
              <T size={12} color={colors.muted2}>
                {counts.get(c.name) ?? 0} transactions
                {c.isSystem ? '' : ' · custom'}
              </T>
            </View>
            {!c.isSystem ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${c.name}`}
                hitSlop={8}
                onPress={() => confirmRemove(c.id)}
                style={styles.del}
              >
                <Icon name="trash" size={18} color={colors.redText} />
              </Pressable>
            ) : (
              <Icon name="cr" size={18} color={colors.muted3} />
            )}
          </ScalePressable>
        ))}
      </Card>

      <Card radius={26} style={styles.addCard}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="New category name"
          placeholderTextColor={colors.muted2}
          maxLength={24}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={add}
          accessibilityLabel="New category name"
        />
        <PillButton
          icon="plus"
          label="Add"
          minHeight={50}
          onPress={add}
          disabled={!draft.trim()}
        />
      </Card>

      <SectionTitle>Merchant rules</SectionTitle>
      <Card radius={26} style={[styles.card, styles.mt0]}>
        {rules.length === 0 ? (
          <T size={14} i color={colors.muted} style={styles.row}>
            When you categorize a transaction with “Always use this”, a rule
            appears here and future SMS from that merchant are sorted
            automatically.
          </T>
        ) : (
          rules.map((r, i) => (
            <View
              key={r.id}
              style={[styles.row, i < rules.length - 1 ? styles.divider : null]}
            >
              <View style={styles.flex}>
                <T size={15} w={700} i numberOfLines={1}>
                  {r.pattern}
                </T>
                <T size={12} color={colors.muted2}>
                  → {r.category}
                </T>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete rule for ${r.pattern}`}
                hitSlop={8}
                onPress={() =>
                  removeRule(r.id).catch(() =>
                    showToast('Could not delete rule'),
                  )
                }
                style={styles.del}
              >
                <Icon name="x" size={18} color={colors.muted} />
              </Pressable>
            </View>
          ))
        )}
      </Card>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: { marginTop: 4, paddingVertical: 4, paddingHorizontal: 18 },
  mt0: { marginTop: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  tile: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  del: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  input: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: colors.soft,
    fontSize: 15,
    fontFamily: fontFamily(600, true),
    color: colors.ink,
  },
});
