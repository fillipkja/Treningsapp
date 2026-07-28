// Designtokens. Mørkt tema er standard; grafflater og -farger følger
// validert palett (se komponentene i components/charts).

export interface ThemeColors {
  /** Sidebakgrunn */
  background: string;
  /** Kort/paneler */
  surface: string;
  /** Hevet flate (sheets, aktive felt) */
  surfaceElevated: string;
  /** Primær aksent (blå) */
  accent: string;
  /** Tekst/ikon oppå accent */
  onAccent: string;
  /** Halvtransparent flate oppå accent (ikonsirkler o.l.) */
  onAccentMuted: string;
  /** Dempet aksentvask til chips/valgt tilstand */
  accentMuted: string;
  /** Suksess/PR (grønn) */
  success: string;
  successMuted: string;
  warning: string;
  danger: string;
  /** Gull til rekorder og topplasseringer */
  gold: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  /** Hårlinje til gridlinjer i grafer */
  gridline: string;
  /** Tab-bar/headerflate */
  chrome: string;
  overlay: string;
  /** Farge til skygger (iOS shadowColor / web box-shadow) */
  shadow: string;
}

export const darkColors: ThemeColors = {
  background: '#0d0d0d',
  surface: '#1a1a19',
  surfaceElevated: '#242423',
  accent: '#3987e5',
  onAccent: '#ffffff',
  onAccentMuted: 'rgba(255, 255, 255, 0.2)',
  accentMuted: 'rgba(57, 135, 229, 0.16)',
  success: '#0ca30c',
  successMuted: 'rgba(12, 163, 12, 0.16)',
  warning: '#fab219',
  danger: '#e66767',
  gold: '#c98500',
  textPrimary: '#ffffff',
  textSecondary: '#c3c2b7',
  textMuted: '#898781',
  border: 'rgba(255, 255, 255, 0.10)',
  gridline: '#2c2c2a',
  chrome: '#141413',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};

export const lightColors: ThemeColors = {
  background: '#f9f9f7',
  surface: '#fcfcfb',
  surfaceElevated: '#ffffff',
  accent: '#2a78d6',
  onAccent: '#ffffff',
  onAccentMuted: 'rgba(255, 255, 255, 0.2)',
  accentMuted: 'rgba(42, 120, 214, 0.12)',
  success: '#006300',
  successMuted: 'rgba(12, 163, 12, 0.12)',
  warning: '#c98500',
  danger: '#d03b3b',
  gold: '#c98500',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  textMuted: '#898781',
  border: 'rgba(11, 11, 11, 0.10)',
  gridline: '#e1e0d9',
  chrome: '#fcfcfb',
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: '#000000',
};

/** Kategorifarger til grafer med flere serier (validert rekkefølge — aldri stokk om) */
export const chartSeries = {
  dark: ['#3987e5', '#d95926', '#199e70'],
  light: ['#2a78d6', '#eb6834', '#1baf7a'],
} as const;

/** Sekvensiell blåskala til aktivitetskalender (lav → høy intensitet) */
export const heatmapRamp = {
  dark: ['#184f95', '#1c5cab', '#2a78d6', '#3987e5', '#5598e7'],
  light: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#2a78d6'],
} as const;

/** Fallback-farger for initial-avatarer */
export const avatarColors = [
  '#3987e5',
  '#199e70',
  '#d95926',
  '#9085e9',
  '#d55181',
  '#c98500',
] as const;
