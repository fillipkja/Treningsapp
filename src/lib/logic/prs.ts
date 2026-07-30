import type { ExercisePR, WorkoutExercise } from '@/types';

export interface PRResult {
  /** Oppdatert PR-liste (nye objekter, gamle er urørte) */
  prs: ExercisePR[];
  /** Sett-id-er som ga ny rekord */
  prSetIds: Set<string>;
  /** Øvelses-id-er med ny rekord (til varsler/oppsummering) */
  prExerciseIds: string[];
}

/**
 * Sjekk en fullført økt mot eksisterende rekorder og returner oppdaterte PR-er.
 * En rekord telles ved ny beste vekt, ELLER flere reps på samme beste vekt.
 */
export function applyWorkoutPRs(
  exercises: WorkoutExercise[],
  existing: ExercisePR[],
  workoutDate: string,
): PRResult {
  const byId = new Map(existing.map((pr) => [pr.exerciseId, pr]));
  const prSetIds = new Set<string>();
  const prExerciseIds: string[] = [];

  for (const ex of exercises) {
    const current = byId.get(ex.exerciseId);
    let best: ExercisePR = current
      ? { ...current, history: [...current.history] }
      : {
          exerciseId: ex.exerciseId,
          bestWeightKg: 0,
          bestReps: 0,
          bestSetVolumeKg: 0,
          updatedAt: workoutDate,
          history: [],
        };
    const hadRecord = current !== undefined;
    let improved = false;

    for (const set of ex.sets) {
      if (!set.completed || set.isWarmup || set.weightKg <= 0 || set.reps <= 0) continue;
      const isRecord =
        set.weightKg > best.bestWeightKg ||
        (set.weightKg === best.bestWeightKg && set.reps > best.bestReps);
      if (isRecord) {
        if (hadRecord) prSetIds.add(set.id);
        improved = true;
      }
      best = {
        ...best,
        bestWeightKg: Math.max(best.bestWeightKg, set.weightKg),
        // bestReps gjelder PÅ beste vekt: nullstilles ved ny toppvekt, ellers
        // maks ved lik vekt — kryssvekt-maks ville gjort rep-rekorder uoppnåelige.
        bestReps:
          set.weightKg > best.bestWeightKg
            ? set.reps
            : set.weightKg === best.bestWeightKg
              ? Math.max(best.bestReps, set.reps)
              : best.bestReps,
        bestSetVolumeKg: Math.max(best.bestSetVolumeKg, set.weightKg * set.reps),
        updatedAt: workoutDate,
      };
    }

    if (improved) {
      // Første registrering på en øvelse er en baseline: den lagres i historikken,
      // men telles ikke som "ny rekord" i feed/varsler.
      if (hadRecord) prExerciseIds.push(ex.exerciseId);
      const daySet = ex.sets
        .filter((s) => s.completed && !s.isWarmup && s.weightKg > 0 && s.reps > 0)
        .reduce((a, b) =>
          b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a,
        );
      best.history.push({
        date: workoutDate,
        weightKg: daySet.weightKg,
        reps: daySet.reps,
      });
      byId.set(ex.exerciseId, best);
    }
  }

  return { prs: [...byId.values()], prSetIds, prExerciseIds };
}
