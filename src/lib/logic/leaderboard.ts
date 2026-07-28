import {
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { LeaderboardEntry, Period, Workout } from '@/types';
import { statsForWorkouts } from './points';

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
 * Bygg rangering for en gruppe brukere. `workoutsByUser` skal inneholde
 * alle økter per bruker (filtreres på perioden her). Delt førsteplass får samme rank.
 */
export function buildLeaderboard(
  workoutsByUser: Map<string, Workout[]>,
  period: Period,
  now: Date,
): LeaderboardEntry[] {
  const interval = periodInterval(period, now);
  const entries = [...workoutsByUser.entries()].map(([userId, workouts]) => {
    const stats = statsForWorkouts(workoutsInInterval(workouts, interval));
    return { userId, points: stats.points, workouts: stats.workouts, volumeKg: stats.volumeKg, prs: stats.prs, rank: 0 };
  });
  entries.sort((a, b) => b.points - a.points);
  let prevPoints = Number.NaN;
  let prevRank = 0;
  entries.forEach((entry, i) => {
    entry.rank = entry.points === prevPoints ? prevRank : i + 1;
    prevPoints = entry.points;
    prevRank = entry.rank;
  });
  return entries;
}
