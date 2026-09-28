import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { Sheet, Toast, useUiStore } from '../store/uiStore';
import { EASE_OUT, prefersReducedMotion } from './motion';
import { FilterSheet } from './FilterSheet';
import { SheetProgress } from './sheets/BottomSheet';
import { CategorySheet } from './sheets/CategorySheet';
import { PeriodSheet } from './sheets/PeriodSheet';
import { MerchantDialog, NameDialog } from './sheets/TextDialog';
import { TypeSheet } from './sheets/TypeSheet';
import { T } from './ui/T';

function renderSheet(sheet: NonNullable<Sheet>): React.ReactNode {
  switch (sheet.kind) {
    case 'filter':
      return <FilterSheet />;
    case 'period':
      return <PeriodSheet />;
    case 'category':
      return <CategorySheet txId={sheet.txId} />;
    case 'merchant':
      return <MerchantDialog txId={sheet.txId} />;
    case 'name':
      return <NameDialog />;
    case 'type':
      return <TypeSheet txId={sheet.txId} />;
  }
}

/**
 * Renders the active sheet/dialog above all screens. Keeps the last sheet
 * mounted while it animates out, so closing is as smooth as opening.
 */
export function SheetHost() {
  const sheet = useUiStore(s => s.sheet);
  const [shown, setShown] = useState<Sheet>(sheet);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const instant = prefersReducedMotion();
    if (sheet) {
      setShown(sheet);
      progress.setValue(instant ? 1 : 0);
      if (!instant) Animated.timing(progress, { toValue: 1, duration: 300, easing: EASE_OUT, useNativeDriver: true }).start();
      return;
    }
    if (instant) {
      setShown(null);
      return;
    }
    const a = Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true });
    a.start(({ finished }) => finished && setShown(null));
    return () => a.stop();
  }, [sheet, progress]);

  if (!shown) return null;
  return (
    <SheetProgress.Provider value={progress}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={StyleSheet.absoluteFill}
        // While closing, let touches fall through to the screen below.
        pointerEvents={sheet ? 'box-none' : 'none'}>
        {renderSheet(shown)}
      </KeyboardAvoidingView>
    </SheetProgress.Provider>
  );
}

/** Bottom toast with optional Undo. Slides up above the tab bar and slides away. */
export function ToastHost() {
  const toast = useUiStore(s => s.toast);
  const onTabs = useUiStore(s => s.onTabs);
  const hide = useUiStore(s => s.hideToast);
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<Toast | null>(toast);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      setShown(toast);
      v.setValue(0);
      Animated.spring(v, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 220 }).start();
      return;
    }
    const a = Animated.timing(v, { toValue: 0, duration: 180, useNativeDriver: true });
    a.start(({ finished }) => finished && setShown(null));
    return () => a.stop();
  }, [toast, v]);

  if (!shown) return null;
  return (
    <Animated.View
      style={[
        styles.toast,
        {
          bottom: insets.bottom + (onTabs ? 92 : 20),
          opacity: v,
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}
      pointerEvents={toast ? 'auto' : 'none'}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert">
      <T size={14} w={600} i color={colors.white} style={styles.flex}>
        {shown.message}
      </T>
      {shown.undo ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => {
            shown.undo?.();
            hide();
          }}>
          <T size={14} w={800} i color={colors.yellow}>
            Undo
          </T>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 30,
    backgroundColor: colors.ink,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 22,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  flex: { flex: 1 },
});
