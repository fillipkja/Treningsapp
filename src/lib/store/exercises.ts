import { create } from 'zustand';
import {
  deleteCustomExercise as apiDeleteCustomExercise,
  fetchMyCustomExercises,
  insertCustomExercise,
} from '@/lib/api/personal';
import { EXERCISES } from '@/lib/data/exercises';
import type { Exercise } from '@/types';

interface ExerciseState {
  customExercises: Exercise[];
  loaded: boolean;
  loading: boolean;

  /** Henter egne øvelser fra serveren */
  load: () => Promise<void>;
  addCustomExercise: (exercise: Omit<Exercise, 'id' | 'isCustom'>) => Promise<Exercise>;
  deleteCustomExercise: (id: string) => Promise<void>;
}

export const useExerciseStore = create<ExerciseState>()((set, get) => ({
  customExercises: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const customExercises = await fetchMyCustomExercises();
      set({ customExercises, loaded: true, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  addCustomExercise: async (exercise) => {
    const created = await insertCustomExercise(exercise);
    set((s) => ({ customExercises: [created, ...s.customExercises] }));
    return created;
  },

  deleteCustomExercise: async (id) => {
    await apiDeleteCustomExercise(id);
    set((s) => ({ customExercises: s.customExercises.filter((e) => e.id !== id) }));
  },
}));

/** Alle øvelser: innebygd database + brukerens egne */
export function useAllExercises(): Exercise[] {
  const custom = useExerciseStore((s) => s.customExercises);
  return custom.length > 0 ? [...custom, ...EXERCISES] : EXERCISES;
}

/** Slå opp øvelse på id, inkludert egendefinerte */
export function useExercise(id: string): Exercise | undefined {
  const custom = useExerciseStore((s) => s.customExercises);
  return custom.find((e) => e.id === id) ?? EXERCISES.find((e) => e.id === id);
}

/** Oppslag utenfor React (stores, hjelpere) */
export function getExerciseById(id: string): Exercise | undefined {
  return (
    useExerciseStore.getState().customExercises.find((e) => e.id === id) ??
    EXERCISES.find((e) => e.id === id)
  );
}
