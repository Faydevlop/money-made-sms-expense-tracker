import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { EASE_OUT, prefersReducedMotion, ScalePressable } from '../motion';
import { Icon, IconName } from './Icon';
import { T } from './T';

interface CircleButtonProps {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  bg?: string;
  disabled?: boolean;
  label: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Round icon button (design: 44px circle, white). */
export function CircleButton({ icon, onPress, size = 44, iconSize = 20, bg = colors.white, disabled, label, children, style }: CircleButtonProps) {
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      scaleTo={0.9}
      style={[styles.circle, { width: size, height: size, backgroundColor: bg, opacity: disabled ? 0.35 : 1 }, style]}>
      <Icon name={icon} size={iconSize} />
      {children}
    </ScalePressable>
  );
}

interface PillProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost';
  icon?: IconName;
  trailingIcon?: IconName;
  minHeight?: number;
  size?: number;
  justify?: 'center' | 'space-between' | 'flex-start';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Pill buttons: primary (ink), secondary (white), soft (#f1eef3), ghost (transparent). */
export function PillButton({ label, onPress, variant = 'primary', icon, trailingIcon, minHeight = 54, size, justify = 'center', disabled, style }: PillProps) {
  const primary = variant === 'primary';
  const bg = primary ? colors.ink : variant === 'soft' ? colors.soft : variant === 'ghost' ? 'transparent' : colors.white;
  const fg = primary ? colors.white : colors.ink;
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.pill, { backgroundColor: bg, minHeight, justifyContent: justify, opacity: disabled ? 0.5 : 1 }, style]}>
      {icon ? <Icon name={icon} size={size && size < 15 ? 16 : 20} color={fg} /> : null}
      <T size={size ?? (primary ? 16 : 15)} w={700} i color={fg} numberOfLines={1} style={styles.shrink}>
        {label}
      </T>
      {trailingIcon ? <Icon name={trailingIcon} size={20} color={fg} /> : null}
    </ScalePressable>
  );
}

interface SegProps<K extends string> {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  bg?: string;
  style?: StyleProp<ViewStyle>;
}

const SEG_PAD = 4;
const SEG_GAP = 4;

/** Segmented control with a selection pill that slides between options. */
export function Segmented<K extends string>({ options, value, onChange, bg = colors.soft2, style }: SegProps<K>) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex(o => o.key === value));
  const x = useRef(new Animated.Value(idx)).current;
  useEffect(() => {
    if (prefersReducedMotion()) x.setValue(idx);
    else Animated.spring(x, { toValue: idx, useNativeDriver: true, damping: 22, stiffness: 240, mass: 0.8 }).start();
  }, [idx, x]);
  const itemW = w ? (w - SEG_PAD * 2 - SEG_GAP * (options.length - 1)) / options.length : 0;

  return (
    <View
      style={[styles.seg, { backgroundColor: bg }, style]}
      accessibilityRole="tablist"
      onLayout={e => setW(e.nativeEvent.layout.width)}>
      {itemW ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segPill,
            { width: itemW, transform: [{ translateX: Animated.multiply(x, itemW + SEG_GAP) }] },
          ]}
        />
      ) : null}
      {options.map(o => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[styles.segItem, !itemW && on ? { backgroundColor: colors.ink } : null]}>
            <T size={13} w={700} i color={on ? colors.white : colors.muted} numberOfLines={1}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

interface ChipProps {
  label: string;
  on: boolean;
  onPress: () => void;
  /** 'bar' chips sit on the page background (white); 'sheet' chips sit on white sheets (soft). */
  variant?: 'bar' | 'sheet';
}

export function Chip({ label, on, onPress, variant = 'bar' }: ChipProps) {
  const off = variant === 'bar' ? colors.white : colors.soft;
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      scaleTo={0.93}
      style={[styles.chip, { backgroundColor: on ? colors.ink : off, borderColor: on ? colors.ink : off }]}>
      <T size={14} w={600} i color={on ? colors.white : colors.ink} numberOfLines={1}>
        {label}
      </T>
    </ScalePressable>
  );
}

const KNOB_TRAVEL = 20;

/** Toggle with a sliding knob and cross-fading track. */
export function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const v = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    if (prefersReducedMotion()) v.setValue(value ? 1 : 0);
    else Animated.timing(v, { toValue: value ? 1 : 0, duration: 220, easing: EASE_OUT, useNativeDriver: true }).start();
  }, [value, v]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={styles.switch}>
      <Animated.View style={[styles.switchOn, { opacity: v }]} />
      <Animated.View style={[styles.knob, { transform: [{ translateX: Animated.multiply(v, KNOB_TRAVEL) }] }]} />
    </Pressable>
  );
}

export function Card({ bg = colors.white, style, children, radius = 30 }: { bg?: string; style?: StyleProp<ViewStyle>; children: React.ReactNode; radius?: number }) {
  return <View style={[{ backgroundColor: bg, borderRadius: radius, marginHorizontal: 16, marginTop: 12 }, style]}>{children}</View>;
}

export function Badge({ text, bg = colors.glass2, color = colors.ink }: { text: string; bg?: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <T size={12} w={700} i color={color}>
        {text}
      </T>
    </View>
  );
}

/** Horizontal progress bar whose fill grows in from the left. */
export function ProgressBar({
  value,
  grow,
  color,
  track,
  height,
  style,
}: {
  /** 0..1 */
  value: number;
  /** 0→1 animated value from useGrow() */
  grow: Animated.Value;
  color: string;
  track: string;
  height: number;
  style?: StyleProp<ViewStyle>;
}) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[{ height, borderRadius: 99, backgroundColor: track, overflow: 'hidden' }, style]}>
      <Animated.View
        style={{
          height: '100%',
          width: `${pct * 100}%`,
          borderRadius: 99,
          backgroundColor: color,
          transformOrigin: 'left',
          transform: [{ scaleX: grow }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22 },
  shrink: { flexShrink: 1 },
  seg: { flexDirection: 'row', gap: SEG_GAP, padding: SEG_PAD, borderRadius: 999 },
  segPill: { position: 'absolute', top: SEG_PAD, bottom: SEG_PAD, left: SEG_PAD, borderRadius: 999, backgroundColor: colors.ink },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1.5 },
  switch: { width: 50, height: 30, padding: 3, borderRadius: 999, backgroundColor: colors.switchOff, overflow: 'hidden' },
  switchOn: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, backgroundColor: colors.ink },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  badge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
});
