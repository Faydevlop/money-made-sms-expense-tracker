import React, { createContext, useContext, useEffect } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { CircleButton } from '../ui/controls';
import { T } from '../ui/T';

/**
 * 0 = hidden, 1 = shown. Driven by SheetHost so sheets animate out as well as in,
 * whichever way they are closed (backdrop, back button, action, close button).
 */
export const SheetProgress = createContext<Animated.Value>(new Animated.Value(1));

/** Dimmed backdrop; tapping it or pressing Android back closes the sheet. */
export function Scrim({ onClose }: { onClose: () => void }) {
  const p = useContext(SheetProgress);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: p }]}>
      <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
    </Animated.View>
  );
}

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeight?: ViewStyle['maxHeight'];
}

/** Bottom sheet from the design: rounded top, grab handle, title + close button. */
export function BottomSheet({ title, subtitle, onClose, children, footer, maxHeight = '90%' }: Props) {
  const insets = useSafeAreaInsets();
  const p = useContext(SheetProgress);
  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [520, 0] });

  return (
    <>
      <Scrim onClose={onClose} />
      <Animated.View style={[styles.sheet, { maxHeight, paddingBottom: insets.bottom, transform: [{ translateY }] }]}>
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <T size={22} w={800} i>
              {title}
            </T>
            {subtitle ? (
              <T size={13} i color={colors.muted2} numberOfLines={1}>
                {subtitle}
              </T>
            ) : null}
          </View>
          <CircleButton icon="x" label="Close" bg={colors.soft} onPress={onClose} />
        </View>
        {children}
        {footer}
      </Animated.View>
    </>
  );
}

/** Centered dialog card (design: merchant rename) — pops in with a slight scale. */
export function Dialog({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const p = useContext(SheetProgress);
  return (
    <>
      <Scrim onClose={onClose} />
      <Animated.View
        style={[
          styles.dialog,
          {
            opacity: p,
            transform: [
              { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
              { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            ],
          },
        ]}>
        {children}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: colors.scrim, zIndex: 20 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 21,
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    elevation: 24,
    shadowColor: '#281432',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -10 },
  },
  handleRow: { alignItems: 'center', paddingTop: 10 },
  handle: { width: 40, height: 5, borderRadius: 9, backgroundColor: colors.handle },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 6, paddingLeft: 22, paddingRight: 16 },
  flex: { flex: 1, minWidth: 0 },
  dialog: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: '24%',
    zIndex: 21,
    backgroundColor: colors.white,
    borderRadius: 30,
    padding: 22,
    gap: 12,
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
  },
});
