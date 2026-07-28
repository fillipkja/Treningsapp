import { createContext, useContext } from 'react';
import type { ThemeColors } from './colors';
import { darkColors, lightColors } from './colors';

export { chartSeries, heatmapRamp, avatarColors } from './colors';
export type { ThemeColors } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  /** Standard sidemarg for skjermer */
  screen: 16,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  /** Hero-tall på statistikk-fliser */
  hero: { fontSize: 40, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 20, fontWeight: '600' as const },
  subheading: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
} as const;

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

export const darkTheme: Theme = { colors: darkColors, isDark: true, spacing, radius, typography };
export const lightTheme: Theme = { colors: lightColors, isDark: false, spacing, radius, typography };

export const ThemeContext = createContext<Theme>(darkTheme);

/** Hent aktivt tema. Alle komponenter skal lese farger herfra — aldri hardkode. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
