import {
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Period, Workout } from '@/types';

export function periodInterval(period: Period, now: Date): { start: Date; end: Date } {
  if (period === 'uke') {
    return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  }
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export function workoutsInInterval(
  workouts: Workout[],
  interval: { start: Date; end: Date },
): Workout[] {
  return workouts.filter((w) => isWithinInterval(parseISO(w.date), interval));
}

/**
 * Sorter og gi plassering med delt rang ved poenglikhet: neste distinkte
 * verdi får indeks + 1. Muterer og returnerer samme array.
 */
export function assignSharedRanks<T extends { rank: number }>(
  entries: T[],
  value: (entry: T) => number,
  lowerIsBetter = false,
): T[] {
  entries.sort((a, b) => (lowerIsBetter ? value(a) - value(b) : value(b) - value(a)));
  let prevValue = Number.NaN;
  let prevRank = 0;
  entries.forEach((entry, i) => {
    entry.rank = value(entry) === prevValue ? prevRank : i + 1;
    prevValue = value(entry);
    prevRank = entry.rank;
  });
  return entries;
}

export type StrengthSchemeKey = 'single' | 'five' | 'fivebyfive';

/**
 * Sett-opplegg for styrke-ledertavlen: tyngste enkeltløft, tyngste 5-er og
 * tyngste 5x5 (fem sett på samme vekt i samme økt). Sendes til RPC-en
 * strength_leaderboard som min_reps/min_sets.
 */
export const STRENGTH_SCHEMES = [
  { key: 'single', minReps: 1, minSets: 1 },
  { key: 'five', minReps: 5, minSets: 1 },
  { key: 'fivebyfive', minReps: 5, minSets: 5 },
] as const;

/** Standarddistanser for løpe-ledertavlen, i meter (21097 = halvmaraton, 42195 = maraton) */
export const STANDARD_RUN_DISTANCES = [1000, 3000, 5000, 10000, 21097, 42195] as const;
