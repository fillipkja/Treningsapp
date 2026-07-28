import type { Workout } from '@/types';

/**
 * Poengsystem for rangeringer og utfordringer:
 *  - 50 poeng per fullført økt
 *  - 1 poeng per 100 kg løftet volum
 *  - 25 poeng per personlig rekord
 */
export const POINTS = {
  perWorkout: 50,
  perVolumeChunk: 1,
  volumeChunkKg: 100,
  perPR: 25,
} as const;

export function pointsForWorkout(workout: Workout): number {
  return (
    POINTS.perWorkout +
    Math.floor(workout.totalVolumeKg / POINTS.volumeChunkKg) * POINTS.perVolumeChunk +
    workout.prCount * POINTS.perPR
  );
}

export interface PeriodStats {
  points: number;
  workouts: number;
  volumeKg: number;
  prs: number;
}

export function statsForWorkouts(workouts: Workout[]): PeriodStats {
  return workouts.reduce<PeriodStats>(
    (acc, w) => ({
      points: acc.points + pointsForWorkout(w),
      workouts: acc.workouts + 1,
      volumeKg: acc.volumeKg + w.totalVolumeKg,
      prs: acc.prs + w.prCount,
    }),
    { points: 0, workouts: 0, volumeKg: 0, prs: 0 },
  );
}
