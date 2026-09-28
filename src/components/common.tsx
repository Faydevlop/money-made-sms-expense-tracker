import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, Animated, Easing, Image, ScrollView, ScrollViewProps, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { FadeIn, ScalePressable } from './motion';
import { CircleButton, PillButton } from './ui/controls';
import { Icon, IconName } from './ui/Icon';
import { T } from './ui/T';

/** Header for stacked screens: back button + title (design: detail / review / detection). */
export function ScreenHeader({ title }: { title: string }) {
  const nav = useNavigation();
  return (
    <View style={styles.header}>
      <CircleButton icon="back" label="Back" onPress={() => nav.goBack()} />
      <T size={19} w={800} i numberOfLines={1} style={styles.flex}>
        {title}
      </T>
    </View>
  );
}

/** Full-screen page for stacked routes: safe-area aware, scrollable body. */
export function StackScreen({ title, children, ...scroll }: { title: string; children: React.ReactNode } & ScrollViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <ScreenHeader title={title} />
      <ScrollView
        {...scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[{ paddingBottom: 24 + insets.bottom }, scroll.contentContainerStyle]}>
        {/* Each top-level block rises in shortly after the push transition. */}
        {React.Children.toArray(children).map((child, i) => (
          <FadeIn key={(child as React.ReactElement).key ?? i} index={i} delay={120}>
            {child}
          </FadeIn>
        ))}
      </ScrollView>
    </View>
  );
}

interface EmptyProps {
  icon: IconName;
  title: string;
  body: string;
  cta?: string;
  onCta?: () => void;
  bg?: string;
  iconBg?: string;
  iconColor?: string;
}

export function EmptyState({ icon, title, body, cta, onCta, bg = colors.white, iconBg = colors.lavender2, iconColor = colors.ink }: EmptyProps) {
  return (
    <View style={[styles.empty, { backgroundColor: bg }]}>
      <View style={[styles.emptyIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <T size={22} w={800} i style={styles.emptyTitle}>
        {title}
      </T>
      <T size={14} color={colors.muted}>
        {body}
      </T>
      {cta && onCta ? <PillButton label={cta} onPress={onCta} minHeight={50} style={styles.emptyCta} /> : null}
    </View>
  );
}

const LOGO = require('../assets/logo.png');

/** Launch screen: the logo breathes gently while the database opens. */
export function Loading() {
  const v = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={[styles.page, styles.center]}>
      <Animated.Image
        source={LOGO}
        accessibilityLabel="Money Made"
        style={[
          styles.loadingLogo,
          {
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
          },
        ]}
      />
      <ActivityIndicator color={colors.muted3} style={styles.loadingSpinner} />
    </View>
  );
}

/** App mark used on onboarding and about screens. */
export function Logo({ size = 56 }: { size?: number }) {
  return <Image source={LOGO} accessibilityLabel="Money Made" style={{ width: size, height: size, borderRadius: size * 0.22 }} />;
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <T size={15} w={600} i style={styles.section}>
      {children}
    </T>
  );
}

/** Settings-style row: round icon, title/subtitle, trailing chevron or custom element. */
export function ListRow({
  icon,
  label,
  sub,
  onPress,
  trailing,
  divider,
}: {
  icon?: IconName;
  label: string;
  sub?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  divider?: boolean;
}) {
  const content = (
    <View style={[styles.row, divider ? styles.divider : null]}>
      {icon ? (
        <View style={styles.rowIcon}>
          <Icon name={icon} size={20} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <T size={16} w={700} i>
          {label}
        </T>
        {sub ? (
          <T size={12} color={colors.muted2}>
            {sub}
          </T>
        ) : null}
      </View>
      {trailing ?? (onPress ? <Icon name="cr" size={18} color={colors.muted3} /> : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <ScalePressable accessibilityRole="button" onPress={onPress} scaleTo={0.98}>
      {content}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingLogo: { width: 96, height: 96, borderRadius: 22 },
  loadingSpinner: { marginTop: 28 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16 },
  flex: { flex: 1 },
  empty: { marginHorizontal: 16, paddingVertical: 28, paddingHorizontal: 22, borderRadius: 28, gap: 8, alignItems: 'flex-start' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 8 },
  emptyCta: { marginTop: 10 },
  section: { marginTop: 18, marginBottom: 8, marginHorizontal: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  rowIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
});
