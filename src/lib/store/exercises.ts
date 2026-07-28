import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { uid } from '@/lib/ids';
import { EXERCISES } from '@/lib/data/exercises';
import type { Exercise } from '@/types';

interface ExerciseState {
  customExercises: Exercise[];
  addCustomExercise: (exercise: Omit<Exercise, 'id' | 'isCustom'>) => Exercise;
  deleteCustomExercise: (id: string) => void;
}

export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set) => ({
      customExercises: [],
      addCustomExercise: (exercise) => {
        const created: Exercise = { ...exercise, id: uid('exc'), isCustom: true };
        set((s) => ({ customExercises: [created, ...s.customExercises] }));
        return created;
      },
      deleteCustomExercise: (id) =>
        set((s) => ({ customExercises: s.customExercises.filter((e) => e.id !== id) })),
    }),
    { name: 'exercises', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

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
