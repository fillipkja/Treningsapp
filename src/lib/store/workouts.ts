import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { uid } from '@/lib/ids';
import { BADGE_DEFS, evaluateNewBadges } from '@/lib/logic/badges';
import { applyWorkoutPRs } from '@/lib/logic/prs';
import { completedSetCount, workoutVolume } from '@/lib/logic/workout-math';
import { useAuthStore } from './auth';
import { useNotificationStore } from './notifications';
import type {
  ActiveWorkout,
  EarnedBadge,
  ExercisePR,
  TemplateExercise,
  Workout,
  WorkoutComment,
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

interface WorkoutState {
  workouts: Workout[];
  prs: ExercisePR[];
  earnedBadges: EarnedBadge[];
  active: ActiveWorkout | null;

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
  /** Fullfør økten: beregner volum, rekorder og merker. Returnerer lagret økt. */
  finishActive: (share: boolean) => Workout | null;

  deleteWorkout: (id: string) => void;
  setWorkoutShared: (id: string, shared: boolean) => void;
  /** Likes/kommentarer på egne økter (fra simulerte venner eller meg selv) */
  likeMyWorkout: (workoutId: string, userId: string) => void;
  commentMyWorkout: (workoutId: string, comment: WorkoutComment) => void;

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

      finishActive: (share) => {
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
        const now = new Date();
        const date = now.toISOString();
        const { prs, prSetIds, prExerciseIds } = applyWorkoutPRs(exercises, state.prs, date);
        const flagged = exercises.map((e) => ({
          ...e,
          sets: e.sets.map((st) => (prSetIds.has(st.id) ? { ...st, isPR: true } : st)),
        }));
        const durationMin = Math.max(
          1,
          Math.round((now.getTime() - new Date(active.startedAt).getTime()) / 60_000),
        );
        const workout: Workout = {
          id: uid('w'),
          userId: useAuthStore.getState().user?.id ?? 'me',
          name: active.name || 'Treningsøkt',
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
          likes: [],
          comments: [],
        };
        const workouts = [workout, ...state.workouts];
        const newBadgeIds = evaluateNewBadges(
          { workouts, prs },
          state.earnedBadges.map((b) => b.badgeId),
        );
        const earnedBadges = [
          ...state.earnedBadges,
          ...newBadgeIds.map((badgeId) => ({ badgeId, earnedAt: date })),
        ];
        set({ workouts, prs, earnedBadges, active: null });

        const notify = useNotificationStore.getState().add;
        for (const badgeId of newBadgeIds) {
          const def = BADGE_DEFS.find((b) => b.id === badgeId);
          if (def) {
            notify({
              type: 'badge',
              title: 'Nytt merke!',
              body: `${def.icon} Du låste opp «${def.name}»`,
              refId: badgeId,
            });
          }
        }
        return workout;
      },

      deleteWorkout: (id) =>
        set((s) => {
          const workouts = s.workouts.filter((w) => w.id !== id);
          if (workouts.length === s.workouts.length) return s;
          // Reberegn rekorder kronologisk så slettede økter ikke blir stående som PR
          let prs: ExercisePR[] = [];
          for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
            prs = applyWorkoutPRs(w.exercises, prs, w.date).prs;
          }
          return { workouts, prs };
        }),

      setWorkoutShared: (id, shared) =>
        set((s) => ({
          workouts: s.workouts.map((w) => (w.id === id ? { ...w, isShared: shared } : w)),
        })),

      likeMyWorkout: (workoutId, userId) =>
        set((s) => ({
          workouts: s.workouts.map((w) =>
            w.id === workoutId
              ? {
                  ...w,
                  likes: w.likes.includes(userId)
                    ? w.likes.filter((u) => u !== userId)
                    : [...w.likes, userId],
                }
              : w,
          ),
        })),

      commentMyWorkout: (workoutId, comment) =>
        set((s) => ({
          workouts: s.workouts.map((w) =>
            w.id === workoutId ? { ...w, comments: [...w.comments, comment] } : w,
          ),
        })),

      lastSetsFor: (exerciseId) => {
        for (const w of get().workouts) {
          const found = w.exercises.find((e) => e.exerciseId === exerciseId);
          if (found && found.sets.length > 0) return found.sets;
        }
        return undefined;
      },
    }),
    {
      name: 'workouts',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
