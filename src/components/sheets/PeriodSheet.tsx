import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../constants/colors';
import { useUiStore } from '../../store/uiStore';
import { MONTHS_SHORT, parseIsoDate, toIsoDate } from '../../utils/dateUtils';
import { PillButton } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { T } from '../ui/T';
import { BottomSheet } from './BottomSheet';

const MIN_DATE = new Date(new Date().getFullYear() - 5, 0, 1);

function pretty(iso: string): string {
  const ts = parseIsoDate(iso);
  if (ts == null) return 'Select';
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  if (Platform.OS === 'ios') {
    // iOS has no imperative picker: use the native compact date control inline.
    return (
      <View style={styles.field}>
        <T size={13} w={600} i color={colors.muted}>
          {label}
        </T>
        <View style={[styles.input, styles.iosInput]}>
          <DateTimePicker
            value={new Date(parseIsoDate(value) ?? Date.now())}
            mode="date"
            display="compact"
            minimumDate={MIN_DATE}
            maximumDate={new Date()}
            accentColor={colors.ink}
            onChange={(_e, date) => date && onChange(toIsoDate(date.getTime()))}
          />
        </View>
      </View>
    );
  }
  const open = () => {
    DateTimePickerAndroid.open({
      value: new Date(parseIsoDate(value) ?? Date.now()),
      mode: 'date',
      minimumDate: MIN_DATE,
      maximumDate: new Date(),
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(toIsoDate(date.getTime()));
      },
    });
  };
  return (
    <View style={styles.field}>
      <T size={13} w={600} i color={colors.muted}>
        {label}
      </T>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${pretty(value)}`} onPress={open} style={styles.input}>
        <T size={15} style={styles.flex}>
          {pretty(value)}
        </T>
        <Icon name="cal" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

export function PeriodSheet() {
  const filters = useUiStore(s => s.filters);
  const setFilters = useUiStore(s => s.setFilters);
  const closeSheet = useUiStore(s => s.closeSheet);
  const [from, setFrom] = useState(filters.customFrom);
  const [to, setTo] = useState(filters.customTo);

  const apply = () => {
    const [a, b] = from <= to ? [from, to] : [to, from];
    setFilters({ period: 'custom', customFrom: a, customTo: b });
    closeSheet();
  };

  return (
    <BottomSheet title="Custom date range" onClose={closeSheet}>
      <View style={styles.row}>
        <DateField label="From" value={from} onChange={setFrom} />
        <DateField label="To" value={to} onChange={setTo} />
      </View>
      <View style={styles.cta}>
        <PillButton label="Apply range" onPress={apply} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  field: { flex: 1, gap: 6 },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.soft,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: { flex: 1 },
  iosInput: { justifyContent: 'flex-start', paddingHorizontal: 6 },
  cta: { paddingHorizontal: 16, paddingBottom: 18 },
});
