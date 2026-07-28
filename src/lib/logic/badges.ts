import { translate, type AppLanguage, type TranslationKey } from '@/i18n';
import type { BadgeDef, ExercisePR, Workout } from '@/types';
import { longestStreak } from './streaks';

export interface BadgeInput {
  workouts: Workout[];
  prs: ExercisePR[];
}

interface BadgeRule extends BadgeDef {
  check: (input: BadgeInput) => boolean;
}

const totalVolume = (ws: Workout[]) => ws.reduce((s, w) => s + w.totalVolumeKg, 0);
const best = (prs: ExercisePR[], exerciseId: string) =>
  prs.find((p) => p.exerciseId === exerciseId)?.bestWeightKg ?? 0;

/** Alle merker i appen. Sjekkes etter hver fullførte økt.
 *  Navn/beskrivelser bor i i18n ('badge.<id>' / 'badge.<id>.desc') — bruk badgeName/badgeDescription. */
export const BADGE_RULES: BadgeRule[] = [
  // Antall økter
  { id: 'okter-1', icon: 'checkmark-circle', tier: 'bronse', check: ({ workouts }) => workouts.length >= 1 },
  { id: 'okter-10', icon: 'ribbon', tier: 'bronse', check: ({ workouts }) => workouts.length >= 10 },
  { id: 'okter-25', icon: 'trending-up', tier: 'bronse', check: ({ workouts }) => workouts.length >= 25 },
  { id: 'okter-50', icon: 'flash', tier: 'sølv', check: ({ workouts }) => workouts.length >= 50 },
  { id: 'okter-100', icon: 'medal', tier: 'gull', check: ({ workouts }) => workouts.length >= 100 },
  { id: 'okter-250', icon: 'trophy', tier: 'gull', check: ({ workouts }) => workouts.length >= 250 },
  // Streak
  { id: 'streak-7', icon: 'flame', tier: 'bronse', check: ({ workouts }) => longestStreak(workouts.map((w) => w.date)) >= 7 },
  { id: 'streak-14', icon: 'flame', tier: 'sølv', check: ({ workouts }) => longestStreak(workouts.map((w) => w.date)) >= 14 },
  { id: 'streak-30', icon: 'bonfire', tier: 'gull', check: ({ workouts }) => longestStreak(workouts.map((w) => w.date)) >= 30 },
  // Volum totalt
  { id: 'volum-10t', icon: 'barbell', tier: 'bronse', check: ({ workouts }) => totalVolume(workouts) >= 10_000 },
  { id: 'volum-100t', icon: 'boat', tier: 'sølv', check: ({ workouts }) => totalVolume(workouts) >= 100_000 },
  { id: 'volum-1000t', icon: 'planet', tier: 'gull', check: ({ workouts }) => totalVolume(workouts) >= 1_000_000 },
  // Løftemilepæler
  { id: 'benk-100', icon: 'barbell', tier: 'sølv', check: ({ prs }) => best(prs, 'benkpress') >= 100 },
  { id: 'benk-140', icon: 'barbell', tier: 'gull', check: ({ prs }) => best(prs, 'benkpress') >= 140 },
  { id: 'benk-200', icon: 'barbell', tier: 'gull', check: ({ prs }) => best(prs, 'benkpress') >= 200 },
  { id: 'kneboy-100', icon: 'barbell', tier: 'bronse', check: ({ prs }) => best(prs, 'kneboy') >= 100 },
  { id: 'kneboy-140', icon: 'barbell', tier: 'sølv', check: ({ prs }) => best(prs, 'kneboy') >= 140 },
  { id: 'kneboy-180', icon: 'barbell', tier: 'gull', check: ({ prs }) => best(prs, 'kneboy') >= 180 },
  { id: 'mark-140', icon: 'barbell', tier: 'bronse', check: ({ prs }) => best(prs, 'markloft') >= 140 },
  { id: 'mark-180', icon: 'barbell', tier: 'sølv', check: ({ prs }) => best(prs, 'markloft') >= 180 },
  { id: 'mark-220', icon: 'barbell', tier: 'gull', check: ({ prs }) => best(prs, 'markloft') >= 220 },
  // Rekorder
  { id: 'pr-5', icon: 'star', tier: 'bronse', check: ({ workouts }) => workouts.reduce((s, w) => s + w.prCount, 0) >= 5 },
  { id: 'pr-25', icon: 'star', tier: 'sølv', check: ({ workouts }) => workouts.reduce((s, w) => s + w.prCount, 0) >= 25 },
  { id: 'pr-100', icon: 'sparkles', tier: 'gull', check: ({ workouts }) => workouts.reduce((s, w) => s + w.prCount, 0) >= 100 },
];

export const BADGE_DEFS: BadgeDef[] = BADGE_RULES.map(({ check: _check, ...def }) => def);

/** Navn på merket på gitt språk (i18n-nøkkel 'badge.<id>') */
export function badgeName(id: string, lang: AppLanguage): string {
  return translate(lang, `badge.${id}` as TranslationKey);
}

/** Beskrivelse av merket på gitt språk (i18n-nøkkel 'badge.<id>.desc') */
export function badgeDescription(id: string, lang: AppLanguage): string {
  return translate(lang, `badge.${id}.desc` as TranslationKey);
}

/** Returnerer id-ene til merker som er oppnådd, men ikke allerede tildelt */
export function evaluateNewBadges(input: BadgeInput, earnedIds: string[]): string[] {
  const earned = new Set(earnedIds);
  return BADGE_RULES.filter((rule) => !earned.has(rule.id) && rule.check(input)).map((r) => r.id);
}
