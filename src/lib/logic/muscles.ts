// Muskel-ferskhet: når ble hver muskelgruppe sist trent? Rene funksjoner —
// øktene kommer fra workout-storen, øvelsene slås opp via exercise-storen.

import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ALL_MUSCLES } from '@/i18n/labels';
import type { Exercise, MuscleGroup, Workout } from '@/types';

/** Status for én muskelgruppe. daysSince null = aldri trent. */
export interface MuscleStatus {
  muscle: MuscleGroup;
  lastTrained: string | null;
  daysSince: number | null;
}

/** De 12 konkrete gruppene — 'helkropp' er en merkelapp, ikke en egen rad */
const GROUPS = ALL_MUSCLES.filter((m) => m !== 'helkropp');

/**
 * Status for alle 12 muskelgrupper ut fra treningshistorikken, sortert med
 * de mest forsømte først (aldri trent aller først, deretter eldste dato).
 * En øvelse teller når den har minst ett fullført arbeidssett med reps
 * (vekt 0 er greit — kroppsvektøvelser teller). Kondisjon og mobilitet
 * teller ikke. Treffet krediteres både primær- og sekundærmuskler;
 * 'helkropp' krediterer alle gruppene.
 */
export function muscleStatuses(
  workouts: Workout[],
  resolveExercise: (id: string) => Exercise | undefined,
  now: Date,
): MuscleStatus[] {
  const lastByMuscle = new Map<MuscleGroup, string>();

  const credit = (muscle: MuscleGroup, date: string) => {
    const prev = lastByMuscle.get(muscle);
    if (!prev || date.localeCompare(prev) > 0) lastByMuscle.set(muscle, date);
  };

  for (const workout of workouts) {
    for (const we of workout.exercises) {
      const exercise = resolveExercise(we.exerciseId);
      if (!exercise) continue;
      if (exercise.category === 'kondisjon' || exercise.category === 'mobilitet') continue;
      const hasWorkingSet = we.sets.some((s) => s.completed && !s.isWarmup && s.reps > 0);
      if (!hasWorkingSet) continue;
      const hit = new Set<MuscleGroup>([...exercise.primaryMuscles, ...exercise.secondaryMuscles]);
      const muscles = hit.has('helkropp') ? GROUPS : [...hit];
      for (const muscle of muscles) {
        if (muscle !== 'helkropp') credit(muscle, workout.date);
      }
    }
  }

  const statuses: MuscleStatus[] = GROUPS.map((muscle) => {
    const lastTrained = lastByMuscle.get(muscle) ?? null;
    return {
      muscle,
      lastTrained,
      daysSince: lastTrained ? differenceInCalendarDays(now, parseISO(lastTrained)) : null,
    };
  });

  // Stabil sortering: sekundær rekkefølge er ALL_MUSCLES-rekkefølgen over
  const staleness = (s: MuscleStatus) =>
    s.daysSince === null ? Number.MAX_SAFE_INTEGER : s.daysSince;
  return statuses.sort((a, b) => staleness(b) - staleness(a));
}

/**
 * De mest forsømte gruppene til «på tide å trene»-hintet: aldri trent eller
 * minst minDays dager siden sist, maks max stykker. Forventer statuser fra
 * muscleStatuses (allerede sortert).
 */
export function staleMuscles(statuses: MuscleStatus[], minDays = 4, max = 3): MuscleStatus[] {
  return statuses.filter((s) => s.daysSince === null || s.daysSince >= minDays).slice(0, max);
}
