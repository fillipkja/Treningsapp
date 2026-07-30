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
  /** Varm aksent (oransje) til streak/energi */
  accentWarm: string;
  accentWarmMuted: string;
  warning: string;
  danger: string;
  /** Gull til rekorder og topplasseringer */
  gold: string;
  /** Lilla til statusmarkering (f.eks. muskelgrupper som aldri er trent) */
  purple: string;
  /** Gradienter til hero-kort (aktiv økt, feiring, pall) */
  gradientAccent: readonly [string, string];
  gradientSuccess: readonly [string, string];
  gradientGold: readonly [string, string];
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
  accentWarm: '#e0762e',
  accentWarmMuted: 'rgba(224, 118, 46, 0.16)',
  warning: '#fab219',
  danger: '#e66767',
  gold: '#e3b341',
  purple: '#a678e8',
  gradientAccent: ['#3987e5', '#6b5ce8'],
  gradientSuccess: ['#12b76a', '#0a7f4f'],
  gradientGold: ['#e3b341', '#c47f1d'],
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
  accentWarm: '#c65d15',
  accentWarmMuted: 'rgba(198, 93, 21, 0.12)',
  warning: '#c98500',
  danger: '#d03b3b',
  gold: '#a87616',
  purple: '#7635cf',
  gradientAccent: ['#2a78d6', '#5747d1'],
  gradientSuccess: ['#0e9c58', '#086b3f'],
  gradientGold: ['#c9952c', '#a3690f'],
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

/** Fallback-farger for initial-/ikonavatarer */
export const avatarColors = [
  '#3987e5',
  '#199e70',
  '#d95926',
  '#9085e9',
  '#d55181',
  '#c98500',
  '#2a9d9f',
  '#c94f4f',
  '#5b8c2a',
  '#7a6ff0',
  '#b0653a',
  '#6d7885',
] as const;

/** Identitetsfarger per muskelgruppe — brukes på øvelsesfliser, chips og filtre.
 *  Fast tilordning (farge følger muskelen, aldri posisjon i en liste). */
export const muscleColors = {
  dark: {
    bryst: '#e66767',
    rygg: '#3987e5',
    skuldre: '#d95926',
    biceps: '#9085e9',
    triceps: '#d55181',
    underarmer: '#c98500',
    mage: '#199e70',
    quads: '#5598e7',
    hamstrings: '#b8762e',
    setemuskler: '#c76fa0',
    legger: '#5fae85',
    korsrygg: '#8a93a6',
    helkropp: '#c9a227',
  },
  light: {
    bryst: '#cf4444',
    rygg: '#2a78d6',
    skuldre: '#c94d20',
    biceps: '#6b5cc9',
    triceps: '#b84a76',
    underarmer: '#a87616',
    mage: '#0f8a5f',
    quads: '#3d7fc4',
    hamstrings: '#9c6224',
    setemuskler: '#a85a86',
    legger: '#3f8f68',
    korsrygg: '#5f6b80',
    helkropp: '#9c7f1a',
  },
} as const;

/** Identitetsfarger per utfordringstype — fast tilordning, delt på tvers av
 *  konkurranse-skjermene. 'program' bruker success slik at lilla forblir
 *  entydig biceps (muskel-identitet). */
export const challengeTypeColors = {
  dark: {
    økter: darkColors.accent,
    volum: darkColors.accentWarm,
    prs: darkColors.gold,
    program: darkColors.success,
  },
  light: {
    økter: lightColors.accent,
    volum: lightColors.accentWarm,
    prs: lightColors.gold,
    program: lightColors.success,
  },
} as const;

/** Nivåfarger for merker */
export const tierColors = {
  dark: { bronse: '#c08a5a', sølv: '#a7b1bd', gull: '#e3b341' },
  light: { bronse: '#8f5f33', sølv: '#6d7885', gull: '#a87616' },
} as const;
