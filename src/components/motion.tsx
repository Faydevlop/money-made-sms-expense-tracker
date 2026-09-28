import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

/**
 * Shared motion language. Everything here animates transform/opacity on the
 * native driver, so animations stay smooth even while JS is busy (e.g. an SMS
 * import). Respects the system "Remove animations" setting.
 *
 * Entrances run once when content first mounts. They never replay on tab
 * focus and are skipped for rows mounted while scrolling, so content is never
 * hidden when the user is looking for it.
 */

export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
export const DURATION = { fast: 160, base: 260, slow: 320 };
const STAGGER = 30;
const MAX_STAGGER_STEPS = 8;

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then(v => (reduceMotion = v))
  .catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', v => (reduceMotion = v));
export const prefersReducedMotion = () => reduceMotion;

interface FadeInProps {
  children: React.ReactNode;
  /** Stagger position; each step adds 30ms of delay (capped). */
  index?: number;
  delay?: number;
  /** Vertical travel in px. */
  offset?: number;
  /** false renders the content immediately (e.g. list rows mounted while scrolling). */
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Fade + rise entrance used for cards and the first rows of a list. */
export function FadeIn({ children, index = 0, delay = 0, offset = 12, animate = true, style }: FadeInProps) {
  const skip = reduceMotion || !animate;
  const v = useRef(new Animated.Value(skip ? 1 : 0)).current;
  // Captured at mount: a later index change (e.g. a row above was removed) must not replay.
  const wait = useRef(delay + Math.min(index, MAX_STAGGER_STEPS) * STAGGER).current;
  useEffect(() => {
    if (skip) return;
    const anim = Animated.timing(v, { toValue: 1, duration: DURATION.slow, delay: wait, easing: EASE_OUT, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
    // Mount-only by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (skip) return <Animated.View style={style}>{children}</Animated.View>;
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

/**
 * For virtualized lists: returns whether a row mounting *now* should animate.
 * True only briefly after `key` (the data set) changes, so rows rendered while
 * scrolling appear instantly instead of fading in late.
 */
export function useEntranceWindow(key: unknown, ms = 700): () => boolean {
  const until = useRef(0);
  const last = useRef<unknown>(Symbol('init'));
  if (last.current !== key) {
    last.current = key;
    until.current = Date.now() + ms;
  }
  return () => Date.now() < until.current;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable that gently scales down while pressed. Takes the same style as a plain Pressable. */
export function ScalePressable({
  children,
  style,
  scaleTo = 0.96,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & { children: React.ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(s, { toValue: value, useNativeDriver: true, speed: 40, bounciness: value === 1 ? 6 : 0 }).start();
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={e => {
        if (!rest.disabled) to(scaleTo);
        rest.onPressIn?.(e);
      }}
      onPressOut={e => {
        to(1);
        rest.onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale: s }] }]}>
      {children}
    </AnimatedPressable>
  );
}

/** A 0→1 value that animates whenever `key` changes (for charts and progress bars). */
export function useGrow(key: unknown, delay = 0, duration = 600): Animated.Value {
  const v = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) {
      v.setValue(1);
      return;
    }
    v.setValue(0);
    const a = Animated.timing(v, { toValue: 1, duration, delay, easing: EASE_OUT, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [v, key, delay, duration]);
  return v;
}

/**
 * Counts a number to `value` (e.g. totals). Starts from 0 on first mount and
 * from the currently shown number when the value changes. Returns the display value.
 */
export function useCountUp(value: number, duration = 600): number {
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  const shown = useRef(display);
  useEffect(() => {
    if (reduceMotion || shown.current === value) {
      shown.current = value;
      setDisplay(value);
      return;
    }
    const start = shown.current;
    const t0 = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const next = start + (value - start) * (1 - Math.pow(1 - p, 3));
      shown.current = next;
      setDisplay(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}
