// src/theme.ts
// Design tokens: midnight navy, moonlight blue and antique gold, taken from the oracle artwork.
import { Platform, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  night: '#04050c',
  midnight: '#070a1a',
  indigo: '#0e1433',
  indigoLift: '#161d48',
  moon: '#9db7ff',
  moonSoft: 'rgba(157, 183, 255, 0.16)',
  gold: '#e3c07f',
  goldBright: '#f6dfa8',
  goldDeep: '#a47a37',
  goldSoft: 'rgba(227, 192, 127, 0.14)',
  parchment: '#f1e9d8',
  text: '#e8e6f2',
  textMuted: '#9a9db8',
  textFaint: '#5f6382',
  glass: 'rgba(18, 22, 52, 0.55)',
  glassStrong: 'rgba(14, 18, 44, 0.82)',
  hairline: 'rgba(255, 255, 255, 0.08)',
  hairlineGold: 'rgba(227, 192, 127, 0.32)',
  danger: '#f08a8a',
};

// IM Fell English (an old-print face, in keeping with tarot's woodcut roots) for titles only;
// Newsreader, a book serif, for readings and interface text.
export const fonts = {
  display: 'IMFellEnglish_400Regular',
  body: 'Newsreader_400Regular',
  bodyMedium: 'Newsreader_500Medium',
  bodySemi: 'Newsreader_600SemiBold',
};

export const radii = { sm: 12, md: 18, lg: 26, pill: 999 };

export const type: Record<string, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 50, lineHeight: 54, color: colors.parchment },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.parchment },
  heading: { fontFamily: fonts.display, fontSize: 23, lineHeight: 28, color: colors.parchment },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 26, color: colors.text },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 24, color: colors.text },
  caption: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.textMuted },
};

// Soft coloured glow; iOS/web use shadows, Android falls back to elevation.
export function glow(color: string, radius = 18, opacity = 0.55): ViewStyle {
  return Platform.select<ViewStyle>({
    android: { elevation: Math.round(radius / 2), shadowColor: color },
    default: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: 0 },
    },
  })!;
}
