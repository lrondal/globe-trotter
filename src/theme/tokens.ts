// Design tokens, mirrored from design-system/tokens/*.css (kept in sync by tokens.test.ts).

const palette = {
  paper0: '#FBF9F4',
  paper1: '#F4F1EA',
  paper2: '#ECE7DC',
  paper3: '#DCD5C6',
  paper4: '#D3CCBD',
  paperLine: '#DDD7CA',
  ink1: '#1B1A17',
  ink2: '#45413A',
  ink3: '#6E6A60',
  ink4: '#9A9488',
  inkInverse: '#FBF9F4',
  terracotta100: '#F3DDD2',
  terracotta300: '#DB8A69',
  terracotta500: '#C4572E',
  terracotta600: '#A8461F',
  terracotta700: '#8A3816',
  ochre100: '#F6E8D2',
  ochre400: '#E9C48F',
  ochre600: '#B98A3E',
  ochre800: '#6B4E1E',
  sage100: '#E3E8DD',
  sage600: '#5E7A5A',
  brick100: '#F2D9D5',
  brick600: '#B23A2E',
} as const;

export const colors = {
  ...palette,
  surfacePage: palette.paper1,
  surfaceRaised: palette.paper0,
  surfaceSunken: palette.paper2,
  surfaceInverse: palette.ink1,
  surfaceScrim: 'rgba(27,26,23,.32)',
  textPrimary: palette.ink1,
  textSecondary: palette.ink2,
  textMuted: palette.ink3,
  textDisabled: palette.ink4,
  textOnAccent: '#FFFFFF',
  textInverse: palette.inkInverse,
  borderDefault: palette.paperLine,
  borderStrong: palette.paper4,
  borderFocus: palette.ink1,
  accent: palette.terracotta500,
  accentHover: palette.terracotta600,
  accentPress: palette.terracotta700,
  accentTint: palette.terracotta100,
  stateVisited: palette.terracotta500,
  stateVisitedTint: palette.terracotta100,
  stateWish: palette.ochre400,
  stateWishInk: palette.ochre800,
  stateWishTint: palette.ochre100,
  stateUnexplored: palette.paper3,
  globeOcean: palette.paper2,
  globeLand: palette.paper3,
  globeStroke: palette.paper1,
  globeGraticule: '#E0DACD',
  globeRim: palette.paper4,
  globePin: palette.ink1,
  globeLocation: palette.sage600,
  feedbackSuccess: palette.sage600,
  feedbackSuccessTint: palette.sage100,
  feedbackDanger: palette.brick600,
  feedbackDangerTint: palette.brick100,
} as const;

export const space = {
  0: 0,
  1: 2,
  2: 4,
  3: 8,
  4: 12,
  5: 16,
  6: 20,
  7: 24,
  8: 32,
  9: 40,
  10: 56,
} as const;

export const layout = {
  screenGutter: 20,
  hitMin: 44,
  borderWidth: 1,
} as const;

export const radius = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 10,
  xl: 16,
  pill: 999,
} as const;

/** Font family names, as registered by useFonts in the root layout. */
export const fonts = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
  sansRegular: 'HankenGrotesk_400Regular',
  sansMedium: 'HankenGrotesk_500Medium',
  sansSemibold: 'HankenGrotesk_600SemiBold',
} as const;

const textStyle = (fontFamily: string, fontSize: number, leading: number) => ({
  fontFamily,
  fontSize,
  lineHeight: fontSize * leading,
});

export const text = {
  displayXl: textStyle(fonts.display, 44, 1),
  displayL: textStyle(fonts.display, 34, 1.05),
  displayM: textStyle(fonts.display, 26, 1.1),
  displayS: textStyle(fonts.display, 22, 1.15),
  title: textStyle(fonts.sansSemibold, 17, 1.3),
  body: textStyle(fonts.sansRegular, 15, 1.5),
  bodyStrong: textStyle(fonts.sansMedium, 15, 1.5),
  bodyS: textStyle(fonts.sansRegular, 13, 1.45),
  label: textStyle(fonts.sansMedium, 13, 1.2),
  caption: textStyle(fonts.sansRegular, 12, 1.35),
  overline: textStyle(fonts.sansMedium, 11, 1.2),
} as const;

/** Milliseconds. */
export const duration = {
  fast: 120,
  base: 220,
  slow: 420,
  /** The globe flying to a Place. */
  flight: 900,
} as const;

/** Cubic-bezier control points (x1, y1, x2, y2). */
export const easing = {
  out: [0.2, 0.7, 0.2, 1],
  inOut: [0.6, 0, 0.3, 1],
} as const;

/** Touch feedback: scale down while pressed. */
export const pressFeedback = {
  button: { scale: 0.98, duration: duration.fast, easing: easing.out },
  iconButton: { scale: 0.94, duration: duration.fast, easing: easing.out },
} as const;

/** Elevation, as `boxShadow` style values. */
export const shadow = {
  1: '0 1px 0 rgba(27,26,23,.04),0 1px 2px rgba(27,26,23,.06)',
  2: '0 6px 20px -6px rgba(27,26,23,.16),0 1px 2px rgba(27,26,23,.06)',
  sheet: '0 -10px 32px -10px rgba(27,26,23,.20)',
  pin: '0 2px 6px rgba(27,26,23,.28)',
} as const;
