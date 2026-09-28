import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import { colors } from '../../constants/colors';

export type Weight = 300 | 400 | 500 | 600 | 700 | 800 | 900;

const FACE: Record<Weight, string> = {
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
};

/**
 * Urbanist ships as static files (android/app/src/main/assets/fonts), one per
 * weight/style, so we select the face by family name instead of fontWeight.
 */
export function fontFamily(weight: Weight = 400, italic = false): string {
  if (weight === 400) return italic ? 'Urbanist-Italic' : 'Urbanist-Regular';
  return `Urbanist-${FACE[weight]}${italic ? 'Italic' : ''}`;
}

export function font(weight: Weight = 400, italic = false): TextStyle {
  return { fontFamily: fontFamily(weight, italic) };
}

interface Props extends TextProps {
  size?: number;
  w?: Weight;
  /** Italic — most of the design's type is italic. */
  i?: boolean;
  color?: string;
  lh?: number;
  tabular?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
}

export function T({ size = 15, w = 400, i = false, color = colors.ink, lh, tabular, center, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      allowFontScaling={rest.allowFontScaling ?? true}
      maxFontSizeMultiplier={1.4}
      style={[
        {
          fontFamily: fontFamily(w, i),
          fontSize: size,
          color,
          includeFontPadding: false,
        },
        lh ? { lineHeight: Math.round(size * lh) } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    />
  );
}
