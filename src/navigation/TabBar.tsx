import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { prefersReducedMotion } from '../components/motion';
import { Icon } from '../components/ui/Icon';
import { fontFamily, T } from '../components/ui/T';
import { colors } from '../constants/colors';
import { useTransactionStore } from '../store/transactionStore';
import { needsReview } from '../utils/transactionUtils';

const TABS: Record<string, { label: string; icon: string }> = {
  Home: { label: 'Home', icon: 'home' },
  Transactions: { label: 'Transactions', icon: 'list' },
  Analytics: { label: 'Analytics', icon: 'chart' },
  Settings: { label: 'Settings', icon: 'gear' },
};

const BAR_H = 66;
const PAD = 6;
const GAP = 6;
const GROW = 2.2; // active tab is 2.2× an inactive one (design)
const ICON = 22;
const LABEL_GAP = 8;
const ITEM_H = BAR_H - PAD * 2;

/**
 * Floating pill tab bar.
 *
 * Every moving part (ink pill, soft chips, icons, labels, badge) animates only
 * transform/opacity from one position value on the native driver, so the
 * transition stays smooth even while the JS thread is busy mounting the next
 * screen. Positions for each possible active tab are precomputed and the
 * animation interpolates between those layouts.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const reviewCount = useTransactionStore(s => s.transactions.filter(needsReview).length);
  const [width, setWidth] = useState(0);
  const [labelW, setLabelW] = useState<Record<string, number>>({});
  const pos = useRef(new Animated.Value(state.index)).current;
  const press = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const n = state.routes.length;

  useEffect(() => {
    if (prefersReducedMotion()) pos.setValue(state.index);
    else Animated.spring(pos, { toValue: state.index, useNativeDriver: true, damping: 20, stiffness: 200, mass: 0.9 }).start();
  }, [state.index, pos]);

  const unit = width ? (width - PAD * 2 - GAP * (n - 1)) / (GROW + n - 1) : 0;
  const active = unit * GROW;

  // layout[k][i] = left edge of tab i when tab k is active.
  const layout = useMemo(() => {
    const rows: number[][] = [];
    for (let k = 0; k < n; k++) {
      const row: number[] = [];
      let x = PAD;
      for (let i = 0; i < n; i++) {
        row.push(x);
        x += (i === k ? active : unit) + GAP;
      }
      rows.push(row);
    }
    return rows;
  }, [n, unit, active]);

  const ks = state.routes.map((_, k) => k);
  const along = (f: (k: number) => number) => pos.interpolate({ inputRange: ks, outputRange: ks.map(f) });
  const near = (i: number, off: number, on: number, spread = 1) =>
    pos.interpolate({ inputRange: [i - spread, i, i + spread], outputRange: [off, on, off], extrapolate: 'clamp' });

  const setPressed = (i: number, v: number) =>
    Animated.spring(press[i], { toValue: v, useNativeDriver: true, speed: 40, bounciness: v === 1 ? 8 : 0 }).start();

  return (
    <View
      style={[styles.bar, { bottom: 14 + insets.bottom }]}
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {/* Invisible copies measure each label once. */}
      <View style={styles.measure} pointerEvents="none">
        {state.routes.map(r => (
          <Text
            key={r.key}
            style={styles.labelText}
            onLayout={e => {
              const w = Math.ceil(e.nativeEvent.layout.width);
              setLabelW(m => (m[r.name] === w ? m : { ...m, [r.name]: w }));
            }}>
            {TABS[r.name].label}
          </Text>
        ))}
      </View>

      {unit ? (
        <>
          {/* Soft chips behind inactive tabs (the active one hides under the ink pill). */}
          {state.routes.map((r, i) => (
            <Animated.View
              key={`chip-${r.key}`}
              pointerEvents="none"
              style={[
                styles.item,
                styles.chip,
                {
                  width: unit,
                  transform: [{ translateX: along(k => layout[k][i] + (k === i ? (active - unit) / 2 : 0)) }, { scale: press[i] }],
                },
              ]}
            />
          ))}

          {/* Ink pill under the active tab. */}
          <Animated.View
            pointerEvents="none"
            style={[styles.item, styles.ink, { width: active, transform: [{ translateX: along(k => layout[k][k]) }] }]}
          />

          {state.routes.map((r, i) => {
            const lw = labelW[r.name] ?? 0;
            const content = ICON + LABEL_GAP + lw;
            const iconX = along(k => (k === i ? layout[k][i] + (active - content) / 2 : layout[k][i] + (unit - ICON) / 2));
            const onInk = near(i, 0, 1);
            const badge = r.name === 'Transactions' && reviewCount > 0;
            return (
              <React.Fragment key={`fg-${r.key}`}>
                <Animated.View pointerEvents="none" style={[styles.icon, { transform: [{ translateX: iconX }, { scale: press[i] }] }]}>
                  <Animated.View style={{ opacity: Animated.subtract(1, onInk) }}>
                    <Icon name={TABS[r.name].icon} size={ICON} color={colors.ink} />
                  </Animated.View>
                  <Animated.View style={[styles.fill, { opacity: onInk }]}>
                    <Icon name={TABS[r.name].icon} size={ICON} color={colors.white} />
                  </Animated.View>
                </Animated.View>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.label,
                    {
                      opacity: near(i, 0, 1, 0.55),
                      transform: [{ translateX: Animated.add(iconX, ICON + LABEL_GAP) }, { translateY: near(i, 6, 0, 0.8) }],
                    },
                  ]}>
                  <T size={14} w={700} i color={colors.white} numberOfLines={1}>
                    {TABS[r.name].label}
                  </T>
                </Animated.View>
                {badge ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.badge, { transform: [{ translateX: along(k => layout[k][i] + (k === i ? active : unit) - 26) }] }]}>
                    <T size={10} w={800} color={colors.white}>
                      {reviewCount > 99 ? '99+' : reviewCount}
                    </T>
                  </Animated.View>
                ) : null}
              </React.Fragment>
            );
          })}
        </>
      ) : null}

      {/* Touch targets follow the settled layout. */}
      <View style={styles.hits}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const tab = TABS[route.name];
          const badge = route.name === 'Transactions' && reviewCount > 0;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={badge ? `${tab.label}, ${reviewCount} need review` : tab.label}
              accessibilityState={{ selected: focused }}
              onPressIn={() => setPressed(index, 0.9)}
              onPressOut={() => setPressed(index, 1)}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{ flex: focused ? GROW : 1 }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: BAR_H,
    borderRadius: 999,
    backgroundColor: colors.tabBar,
    elevation: 10,
    shadowColor: '#281432',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  measure: { position: 'absolute', opacity: 0, flexDirection: 'row' },
  labelText: { fontFamily: fontFamily(700, true), fontSize: 14 },
  item: { position: 'absolute', top: PAD, left: 0, height: ITEM_H, borderRadius: 999 },
  chip: { backgroundColor: 'rgba(255,255,255,0.55)' },
  ink: { backgroundColor: colors.ink },
  icon: { position: 'absolute', left: 0, top: (BAR_H - ICON) / 2, width: ICON, height: ICON },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  label: { position: 'absolute', left: 0, top: 0, height: BAR_H, justifyContent: 'center' },
  badge: {
    position: 'absolute',
    left: 0,
    top: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 99,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hits: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: GAP, padding: PAD },
});
