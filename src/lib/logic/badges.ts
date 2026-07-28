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

/** Alle merker i appen. Sjekkes etter hver fullførte økt. */
export const BADGE_RULES: BadgeRule[] = [
  // Antall økter
  { id: 'okter-1', name: 'Første økt', description: 'Fullfør din første treningsøkt', icon: '🎉', tier: 'bronse', check: ({ workouts }) => workouts.length >= 1 },
  { id: 'okter-10', name: '10 økter', description: 'Fullfør 10 treningsøkter', icon: '🔟', tier: 'bronse', check: ({ workouts }) => workouts.length >= 10 },
  { id: 'okter-25', name: '25 økter', description: 'Fullfør 25 treningsøkter', icon: '📈', tier: 'bronse', check: ({ workouts }) => workouts.length >= 25 },
  { id: 'okter-50', name: '50 økter', description: 'Fullfør 50 treningsøkter', icon: '⚡', tier: 'sølv', check: ({ workouts }) => workouts.length >= 50 },
  { id: 'okter-100', name: '100 økter', description: 'Fullfør 100 treningsøkter', icon: '💯', tier: 'gull', check: ({ workouts }) => workouts.length >= 100 },
  { id: 'okter-250', name: '250 økter', description: 'Fullfør 250 treningsøkter', icon: '🏛️', tier: 'gull', check: ({ workouts }) => workouts.length >= 250 },
  // Streak
  { id: 'streak-7', name: '7 dager på rad', description: 'Tren 7 dager på rad', icon: '🔥', tier: 'bronse', check: ({ workouts }) => longestStreak(workouts.map((w) => w.date)) >= 7 },
  { id: 'streak-14', name: '14 dager på rad', description: 'Tren 14 dager på rad', icon: '🔥', tier: 'sølv', check: ({ workouts }) => longestStreak(workouts.map((w) => w.date)) >= 14 },
  { id: 'streak-30', name: '30 dager på rad', description: 'Tren 30 dager på rad', icon: '🌋', tier: 'gull', check: ({ workouts }) => longestStreak(workouts.map((w) => w.date)) >= 30 },
  // Volum totalt
  { id: 'volum-10t', name: '10 tonn', description: 'Løft 10 tonn totalt', icon: '🚚', tier: 'bronse', check: ({ workouts }) => totalVolume(workouts) >= 10_000 },
  { id: 'volum-100t', name: '100 tonn', description: 'Løft 100 tonn totalt', icon: '🚢', tier: 'sølv', check: ({ workouts }) => totalVolume(workouts) >= 100_000 },
  { id: 'volum-1000t', name: '1 000 tonn', description: 'Løft 1 000 tonn totalt', icon: '🐋', tier: 'gull', check: ({ workouts }) => totalVolume(workouts) >= 1_000_000 },
  // Løftemilepæler
  { id: 'benk-100', name: '100 kg benkpress', description: 'Løft 100 kg i benkpress', icon: '🏋️', tier: 'sølv', check: ({ prs }) => best(prs, 'benkpress') >= 100 },
  { id: 'benk-140', name: '140 kg benkpress', description: 'Løft 140 kg i benkpress', icon: '🏋️', tier: 'gull', check: ({ prs }) => best(prs, 'benkpress') >= 140 },
  { id: 'benk-200', name: '200 kg benkpress', description: 'Løft 200 kg i benkpress', icon: '👑', tier: 'gull', check: ({ prs }) => best(prs, 'benkpress') >= 200 },
  { id: 'kneboy-100', name: '100 kg knebøy', description: 'Løft 100 kg i knebøy', icon: '🦵', tier: 'bronse', check: ({ prs }) => best(prs, 'kneboy') >= 100 },
  { id: 'kneboy-140', name: '140 kg knebøy', description: 'Løft 140 kg i knebøy', icon: '🦵', tier: 'sølv', check: ({ prs }) => best(prs, 'kneboy') >= 140 },
  { id: 'kneboy-180', name: '180 kg knebøy', description: 'Løft 180 kg i knebøy', icon: '🦍', tier: 'gull', check: ({ prs }) => best(prs, 'kneboy') >= 180 },
  { id: 'mark-140', name: '140 kg markløft', description: 'Løft 140 kg i markløft', icon: '⛓️', tier: 'bronse', check: ({ prs }) => best(prs, 'markloft') >= 140 },
  { id: 'mark-180', name: '180 kg markløft', description: 'Løft 180 kg i markløft', icon: '⛓️', tier: 'sølv', check: ({ prs }) => best(prs, 'markloft') >= 180 },
  { id: 'mark-220', name: '220 kg markløft', description: 'Løft 220 kg i markløft', icon: '🦖', tier: 'gull', check: ({ prs }) => best(prs, 'markloft') >= 220 },
  // Rekorder
  { id: 'pr-5', name: '5 rekorder', description: 'Sett 5 personlige rekorder', icon: '⭐', tier: 'bronse', check: ({ workouts }) => workouts.reduce((s, w) => s + w.prCount, 0) >= 5 },
  { id: 'pr-25', name: '25 rekorder', description: 'Sett 25 personlige rekorder', icon: '🌟', tier: 'sølv', check: ({ workouts }) => workouts.reduce((s, w) => s + w.prCount, 0) >= 25 },
  { id: 'pr-100', name: '100 rekorder', description: 'Sett 100 personlige rekorder', icon: '💫', tier: 'gull', check: ({ workouts }) => workouts.reduce((s, w) => s + w.prCount, 0) >= 100 },
];

export const BADGE_DEFS: BadgeDef[] = BADGE_RULES.map(({ check: _check, ...def }) => def);

/** Returnerer id-ene til merker som er oppnådd, men ikke allerede tildelt */
export function evaluateNewBadges(input: BadgeInput, earnedIds: string[]): string[] {
  const earned = new Set(earnedIds);
  return BADGE_RULES.filter((rule) => !earned.has(rule.id) && rule.check(input)).map((r) => r.id);
}
