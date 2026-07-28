import { parseISO } from 'date-fns';
import { dateKey } from '@/lib/format';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/types';

/** Estimert 1RM etter Epley: vekt × (1 + reps/30). Ved 1 rep er vekten selve 1RM. */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

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

/** Beste (høyeste est. 1RM) fullførte arbeidssett i en øvelse */
export function bestSet(exercise: WorkoutExercise): WorkoutSet | undefined {
  return exercise.sets
    .filter((s) => s.completed && !s.isWarmup && s.weightKg > 0 && s.reps > 0)
    .reduce<WorkoutSet | undefined>(
      (best, s) =>
        !best || epley1RM(s.weightKg, s.reps) > epley1RM(best.weightKg, best.reps) ? s : best,
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
