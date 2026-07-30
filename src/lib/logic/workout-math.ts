import { parseISO } from 'date-fns';
import { dateKey } from '@/lib/format';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/types';

export function setVolume(set: WorkoutSet): number {
  return set.completed && !set.isWarmup ? set.weightKg * set.reps : 0;
}

export function exerciseVolume(exercise: WorkoutExercise): number {
  return exercise.sets.reduce((sum, s) => sum + setVolume(s), 0);
}

export function workoutVolume(exercises: WorkoutExercise[]): number {
  return exercises.reduce((sum, e) => sum + exerciseVolume(e), 0);
}

export function completedSetCount(exercises: WorkoutExercise[]): number {
  return exercises.reduce(
    (sum, e) => sum + e.sets.filter((s) => s.completed && !s.isWarmup).length,
    0,
  );
}

/** Beste fullførte arbeidssett i en øvelse: høyest vekt, ved lik vekt flest reps */
export function bestSet(exercise: WorkoutExercise): WorkoutSet | undefined {
  return exercise.sets
    .filter((s) => s.completed && !s.isWarmup && s.weightKg > 0 && s.reps > 0)
    .reduce<WorkoutSet | undefined>(
      (best, s) =>
        !best || s.weightKg > best.weightKg || (s.weightKg === best.weightKg && s.reps > best.reps)
          ? s
          : best,
      undefined,
    );
}

/** Summer volum per lokal dato-nøkkel (yyyy-MM-dd) for grafer */
export function volumeByDate(workouts: Workout[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of workouts) {
    const key = dateKey(parseISO(w.date));
    map.set(key, (map.get(key) ?? 0) + w.totalVolumeKg);
  }
  return map;
}
