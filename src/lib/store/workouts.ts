import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { t } from '@/i18n';
import { deletePRs, fetchMyBadges, fetchMyPRs, insertBadges, upsertPRs } from '@/lib/api/personal';
import {
  deleteWorkout as apiDeleteWorkout,
  fetchMyWorkouts,
  insertWorkout,
  setWorkoutShared as apiSetWorkoutShared,
} from '@/lib/api/workouts';
import { uid } from '@/lib/ids';
import { evaluateNewBadges } from '@/lib/logic/badges';
import { applyWorkoutPRs } from '@/lib/logic/prs';
import { completedSetCount, workoutVolume } from '@/lib/logic/workout-math';
import { useAuthStore } from './auth';
import type {
  ActiveWorkout,
  EarnedBadge,
  ExercisePR,
  TemplateExercise,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '@/types';

function emptySet(prev?: WorkoutSet): WorkoutSet {
  return {
    id: uid('set'),
    reps: prev?.reps ?? 0,
    weightKg: prev?.weightKg ?? 0,
    rpe: prev?.rpe,
    completed: false,
  };
}

function myUserId(): string {
  return useAuthStore.getState().user!.id;
}

/** Sammenlign to PR-er på verdier (ikke referanse) for å finne endrede rader */
function samePR(a: ExercisePR, b: ExercisePR): boolean {
  return (
    a.bestWeightKg === b.bestWeightKg &&
    a.bestEst1RM === b.bestEst1RM &&
    a.bestReps === b.bestReps &&
    a.bestSetVolumeKg === b.bestSetVolumeKg &&
    a.updatedAt === b.updatedAt &&
    a.history.length === b.history.length
  );
}

/** PR-er i `next` som er nye eller endret i forhold til `prev` */
function changedPRs(prev: ExercisePR[], next: ExercisePR[]): ExercisePR[] {
  const prevById = new Map(prev.map((pr) => [pr.exerciseId, pr]));
  return next.filter((pr) => {
    const before = prevById.get(pr.exerciseId);
    return !before || !samePR(before, pr);
  });
}

/** Rekorder/merker som ikke kom fram til serveren — forsøkes igjen ved neste synk */
const pendingPRExerciseIds = new Set<string>();
const pendingBadgeIds = new Set<string>();

/**
 * Synker endrede rekorder og nye merker. Kaster ALDRI videre: kalleren har
 * allerede lagret eller slettet økten på serveren, og en feil her skal ikke se
 * ut som om hovedoperasjonen mislyktes. Det som ikke kom fram, ligger i
 * pending-settene og blir med i neste forsøk.
 */
async function syncPRsAndBadges(
  userId: string,
  prs: ExercisePR[],
  changedExerciseIds: string[],
  newBadgeIds: string[],
): Promise<void> {
  for (const exerciseId of changedExerciseIds) pendingPRExerciseIds.add(exerciseId);
  for (const badgeId of newBadgeIds) pendingBadgeIds.add(badgeId);
  const prsToSync = prs.filter((pr) => pendingPRExerciseIds.has(pr.exerciseId));
  const badgesToSync = [...pendingBadgeIds];
  try {
    await Promise.all([upsertPRs(userId, prsToSync), insertBadges(userId, badgesToSync)]);
    for (const pr of prsToSync) pendingPRExerciseIds.delete(pr.exerciseId);
    for (const badgeId of badgesToSync) pendingBadgeIds.delete(badgeId);
  } catch {
    // Beholdes i pending-settene og forsøkes på nytt ved neste lagring
  }
}

interface WorkoutState {
  workouts: Workout[];
  prs: ExercisePR[];
  earnedBadges: EarnedBadge[];
  active: ActiveWorkout | null;
  loaded: boolean;
  loading: boolean;

  /** Henter økter, rekorder og merker fra serveren */
  load: () => Promise<void>;

  startWorkout: (name: string, opts?: { programId?: string; templateId?: string }) => void;
  startFromExercises: (
    name: string,
    exercises: TemplateExercise[],
    opts?: { programId?: string; templateId?: string },
  ) => void;
  addExerciseToActive: (exerciseId: string) => void;
  removeExerciseFromActive: (workoutExerciseId: string) => void;
  addSet: (workoutExerciseId: string) => void;
  updateSet: (workoutExerciseId: string, setId: string, patch: Partial<WorkoutSet>) => void;
  removeSet: (workoutExerciseId: string, setId: string) => void;
  updateActive: (patch: Partial<Pick<ActiveWorkout, 'name' | 'notes'>>) => void;
  cancelActive: () => void;
  /**
   * Fullfør økten: beregner volum, rekorder og merker klientside, lagrer på
   * serveren og oppdaterer lokal state. Kaster Error (norsk melding) ved
   * serverfeil — skjermen fanger og viser den. Returnerer null hvis ingen
   * fullførte sett.
   */
  finishActive: (share: boolean) => Promise<Workout | null>;

  deleteWorkout: (id: string) => Promise<void>;
  setWorkoutShared: (id: string, shared: boolean) => Promise<void>;

  /** Siste økt som inneholdt øvelsen — brukes til å foreslå vekt/reps */
  lastSetsFor: (exerciseId: string) => WorkoutSet[] | undefined;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      workouts: [],
      prs: [],
      earnedBadges: [],
      active: null,
      loaded: false,
      loading: false,

      load: async () => {
        if (get().loading) return;
        set({ loading: true });
        try {
          const userId = myUserId();
          const [workouts, prs, earnedBadges] = await Promise.all([
            fetchMyWorkouts(userId),
            fetchMyPRs(userId),
            fetchMyBadges(userId),
          ]);
          set({ workouts, prs, earnedBadges, loaded: true, loading: false });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      startWorkout: (name, opts) =>
        set({
          active: {
            name,
            startedAt: new Date().toISOString(),
            exercises: [],
            ...opts,
          },
        }),

      startFromExercises: (name, exercises, opts) => {
        const state = get();
        const built: WorkoutExercise[] = exercises.map((te) => {
          const last = state.lastSetsFor(te.exerciseId);
          return {
            id: uid('we'),
            exerciseId: te.exerciseId,
            sets: Array.from({ length: te.sets }, (_, i) => {
              const prev = last?.[Math.min(i, (last?.length ?? 1) - 1)];
              const s = emptySet(prev);
              if (!prev) s.reps = te.repsMin;
              return s;
            }),
            notes: te.note,
          };
        });
        set({
          active: { name, startedAt: new Date().toISOString(), exercises: built, ...opts },
        });
      },

      addExerciseToActive: (exerciseId) =>
        set((s) => {
          if (!s.active) return s;
          const last = get().lastSetsFor(exerciseId);
          const first = emptySet(last?.[0]);
          return {
            active: {
              ...s.active,
              exercises: [
                ...s.active.exercises,
                { id: uid('we'), exerciseId, sets: [first] },
              ],
            },
          };
        }),

      removeExerciseFromActive: (workoutExerciseId) =>
        set((s) =>
          s.active
            ? {
                active: {
                  ...s.active,
                  exercises: s.active.exercises.filter((e) => e.id !== workoutExerciseId),
                },
              }
            : s,
        ),

      addSet: (workoutExerciseId) =>
        set((s) => {
          if (!s.active) return s;
          return {
            active: {
              ...s.active,
              exercises: s.active.exercises.map((e) =>
                e.id === workoutExerciseId
                  ? { ...e, sets: [...e.sets, emptySet(e.sets[e.sets.length - 1])] }
                  : e,
              ),
            },
          };
        }),

      updateSet: (workoutExerciseId, setId, patch) =>
        set((s) => {
          if (!s.active) return s;
          return {
            active: {
              ...s.active,
              exercises: s.active.exercises.map((e) =>
                e.id === workoutExerciseId
                  ? {
                      ...e,
                      sets: e.sets.map((st) => (st.id === setId ? { ...st, ...patch } : st)),
                    }
                  : e,
              ),
            },
          };
        }),

      removeSet: (workoutExerciseId, setId) =>
        set((s) => {
          if (!s.active) return s;
          return {
            active: {
              ...s.active,
              exercises: s.active.exercises.map((e) =>
                e.id === workoutExerciseId
                  ? { ...e, sets: e.sets.filter((st) => st.id !== setId) }
                  : e,
              ),
            },
          };
        }),

      updateActive: (patch) =>
        set((s) => (s.active ? { active: { ...s.active, ...patch } } : s)),

      cancelActive: () => set({ active: null }),

      finishActive: async (share) => {
        const state = get();
        const active = state.active;
        if (!active) return null;
        const exercises = active.exercises
          .map((e) => ({ ...e, sets: e.sets.filter((st) => st.completed) }))
          .filter((e) => e.sets.length > 0);
        if (exercises.length === 0) {
          set({ active: null });
          return null;
        }
        const userId = myUserId();
        const now = new Date();
        const date = now.toISOString();
        const { prs, prSetIds, prExerciseIds } = applyWorkoutPRs(exercises, state.prs, date);
        const flagged = exercises.map((e) => ({
          ...e,
          sets: e.sets.map((st) => (prSetIds.has(st.id) ? { ...st, isPR: true } : st)),
        }));
        const durationMin = Math.min(
          1440,
          Math.max(
            1,
            Math.round((now.getTime() - new Date(active.startedAt).getTime()) / 60_000),
          ),
        );

        // Lagre økten på serveren først; feiler den beholdes `active` så
        // brukeren kan prøve igjen. Feil kastes videre til skjermen.
        const saved = await insertWorkout({
          userId,
          name: active.name || t('training.defaultWorkoutName'),
          date,
          startedAt: active.startedAt,
          durationMin,
          exercises: flagged,
          notes: active.notes,
          isShared: share,
          programId: active.programId,
          templateId: active.templateId,
          totalVolumeKg: workoutVolume(flagged),
          totalSets: completedSetCount(flagged),
          prCount: prExerciseIds.length,
        });

        // Økten finnes nå på serveren — oppdater lokal state med én gang så
        // et nytt forsøk ikke kan duplisere den.
        const workouts = [saved, ...state.workouts];
        const newBadgeIds = evaluateNewBadges(
          { workouts, prs },
          state.earnedBadges.map((b) => b.badgeId),
        );
        const earnedBadges = [
          ...state.earnedBadges,
          ...newBadgeIds.map((badgeId) => ({ badgeId, earnedAt: date })),
        ];
        set({ workouts, prs, earnedBadges, active: null });

        // Synk kun endrede PR-er og nye merker. Feil kastes ikke videre — økten
        // er lagret, så skjermen skal navigere videre til feiringen.
        await syncPRsAndBadges(
          userId,
          prs,
          changedPRs(state.prs, prs).map((pr) => pr.exerciseId),
          newBadgeIds,
        );
        return saved;
      },

      deleteWorkout: async (id) => {
        const state = get();
        const workouts = state.workouts.filter((w) => w.id !== id);
        if (workouts.length === state.workouts.length) return;
        // Reberegn rekorder kronologisk så slettede økter ikke blir stående som PR
        let prs: ExercisePR[] = [];
        for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
          prs = applyWorkoutPRs(w.exercises, prs, w.date).prs;
        }
        const userId = myUserId();
        const remaining = new Set(prs.map((pr) => pr.exerciseId));
        const removedExerciseIds = state.prs
          .map((pr) => pr.exerciseId)
          .filter((exerciseId) => !remaining.has(exerciseId));
        await apiDeleteWorkout(id);
        // Slettingen lyktes: oppdater lokal state før PR-synken, slik at en feil
        // i synken ikke vises som «Kunne ikke slette økten».
        set({ workouts, prs });
        for (const exerciseId of removedExerciseIds) pendingPRExerciseIds.delete(exerciseId);
        try {
          await deletePRs(userId, removedExerciseIds);
        } catch {
          // Rekordene ryddes bort ved neste sletting/lasting
        }
        await syncPRsAndBadges(
          userId,
          prs,
          changedPRs(state.prs, prs).map((pr) => pr.exerciseId),
          [],
        );
      },

      setWorkoutShared: async (id, shared) => {
        const before = get().workouts;
        // Optimistisk: trygt å angre ved feil
        set((s) => ({
          workouts: s.workouts.map((w) => (w.id === id ? { ...w, isShared: shared } : w)),
        }));
        try {
          await apiSetWorkoutShared(id, shared);
        } catch (error) {
          set({ workouts: before });
          throw error;
        }
      },

      lastSetsFor: (exerciseId) => {
        for (const w of get().workouts) {
          const found = w.exercises.find((e) => e.exerciseId === exerciseId);
          if (found && found.sets.length > 0) return found.sets;
        }
        return undefined;
      },
    }),
    {
      // Egen nøkkel: den gamle 'workouts'-nøkkelen leses av legacy-migreringen
      // og skal ikke overskrives. Kun pågående økt persist'es lokalt.
      name: 'workouts-active',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ active: s.active }),
    },
  ),
);
