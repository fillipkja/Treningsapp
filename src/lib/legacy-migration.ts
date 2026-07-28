// Migrering av data fra den gamle, lokale versjonen av appen.
// Gamle zustand-persist-nøkler i AsyncStorage:
//   'workouts'  -> { state: { workouts, prs, earnedBadges, ... } }
//   'programs'  -> { state: { programs, templates } }
// Etter vellykket migrering fjernes nøklene. Robust mot korrupt JSON:
// uparsebare nøkler og enkeltrader som feiler hoppes over.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { insertBadges, insertProgram, insertTemplate, upsertPRs } from '@/lib/api/personal';
import { insertWorkout } from '@/lib/api/workouts';
import { useAuthStore } from '@/lib/store/auth';
import type { EarnedBadge, ExercisePR, Program, Workout, WorkoutTemplate } from '@/types';

const LEGACY_WORKOUTS_KEY = 'workouts';
const LEGACY_PROGRAMS_KEY = 'programs';

/** Parse en zustand-persist-blob og returner state-objektet, eller null */
function parsePersistedState(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const state = (parsed as { state?: unknown }).state;
    if (typeof state !== 'object' || state === null) return null;
    return state as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Finnes det lokale data fra den gamle versjonen? */
export async function hasLegacyData(): Promise<boolean> {
  const pairs = await AsyncStorage.multiGet([LEGACY_WORKOUTS_KEY, LEGACY_PROGRAMS_KEY]);
  const workoutState = parsePersistedState(pairs[0]?.[1] ?? null);
  const programState = parsePersistedState(pairs[1]?.[1] ?? null);
  return (
    asArray(workoutState?.workouts).length > 0 ||
    asArray(workoutState?.prs).length > 0 ||
    asArray(workoutState?.earnedBadges).length > 0 ||
    asArray(programState?.programs).length > 0 ||
    asArray(programState?.templates).length > 0
  );
}

/**
 * Last opp gamle lokale data til serveren for innlogget bruker og fjern
 * AsyncStorage-nøklene etterpå. Returnerer antall migrerte økter.
 */
export async function migrateLegacyData(): Promise<{ workouts: number }> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) throw new Error('Ikke innlogget.');

  const pairs = await AsyncStorage.multiGet([LEGACY_WORKOUTS_KEY, LEGACY_PROGRAMS_KEY]);
  const workoutState = parsePersistedState(pairs[0]?.[1] ?? null);
  const programState = parsePersistedState(pairs[1]?.[1] ?? null);

  let migratedWorkouts = 0;

  if (workoutState) {
    // Økter: eldste først så rekkefølgen på serveren blir kronologisk riktig
    const workouts = asArray<Workout>(workoutState.workouts)
      .filter((w) => w && typeof w === 'object' && typeof w.date === 'string')
      .sort((a, b) => a.date.localeCompare(b.date));
    for (const w of workouts) {
      try {
        const { id: _id, likes: _likes, comments: _comments, ...rest } = w;
        await insertWorkout({
          ...rest,
          userId,
          name: rest.name || 'Treningsøkt',
          exercises: Array.isArray(rest.exercises) ? rest.exercises : [],
          notes: rest.notes?.slice(0, 2000),
          durationMin:
            typeof rest.durationMin === 'number'
              ? Math.min(1440, Math.max(0, Math.round(rest.durationMin)))
              : undefined,
          totalVolumeKg: rest.totalVolumeKg ?? 0,
          totalSets: rest.totalSets ?? 0,
          prCount: rest.prCount ?? 0,
          isShared: rest.isShared ?? false,
        });
        migratedWorkouts += 1;
      } catch {
        // Hopp over økter som ikke lar seg lagre
      }
    }

    try {
      const prs = asArray<ExercisePR>(workoutState.prs).filter(
        (pr) => pr && typeof pr === 'object' && typeof pr.exerciseId === 'string',
      );
      await upsertPRs(
        userId,
        prs.map((pr) => ({ ...pr, history: Array.isArray(pr.history) ? pr.history : [] })),
      );
    } catch {
      // Hopp over
    }

    try {
      const badgeIds = asArray<EarnedBadge>(workoutState.earnedBadges)
        .map((b) => b?.badgeId)
        .filter((id): id is string => typeof id === 'string');
      await insertBadges(userId, badgeIds);
    } catch {
      // Hopp over
    }
  }

  if (programState) {
    for (const p of asArray<Program>(programState.programs)) {
      try {
        if (!p || typeof p !== 'object' || typeof p.name !== 'string') continue;
        await insertProgram(userId, {
          name: p.name,
          description: p.description,
          days: Array.isArray(p.days) ? p.days : [],
          isFavorite: p.isFavorite ?? false,
        });
      } catch {
        // Hopp over
      }
    }
    for (const t of asArray<WorkoutTemplate>(programState.templates)) {
      try {
        if (!t || typeof t !== 'object' || typeof t.name !== 'string') continue;
        await insertTemplate(userId, {
          name: t.name,
          exercises: Array.isArray(t.exercises) ? t.exercises : [],
          isFavorite: t.isFavorite ?? false,
        });
      } catch {
        // Hopp over
      }
    }
  }

  await AsyncStorage.multiRemove([LEGACY_WORKOUTS_KEY, LEGACY_PROGRAMS_KEY]);
  return { workouts: migratedWorkouts };
}
