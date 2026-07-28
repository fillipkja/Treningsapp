import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { uid } from '@/lib/ids';
import type { Program, ProgramDay, WorkoutTemplate } from '@/types';

/** Startprogrammer så appen ikke er tom ved første åpning */
const STARTER_PROGRAMS: Program[] = [
  {
    id: 'prog-ppl',
    name: 'Push Pull Legs',
    description: 'Klassisk 3-splitt for muskelvekst. Kjør 3–6 økter i uka.',
    isFavorite: true,
    createdAt: '2026-01-01T00:00:00Z',
    days: [
      {
        id: 'ppl-push',
        name: 'Push',
        exercises: [
          { exerciseId: 'benkpress', sets: 4, repsMin: 5, repsMax: 8 },
          { exerciseId: 'skulderpress-stang', sets: 3, repsMin: 8, repsMax: 10 },
          { exerciseId: 'skrabenk-manualer', sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'sidehev', sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'triceps-pushdown', sets: 3, repsMin: 10, repsMax: 15 },
        ],
      },
      {
        id: 'ppl-pull',
        name: 'Pull',
        exercises: [
          { exerciseId: 'markloft', sets: 3, repsMin: 3, repsMax: 5 },
          { exerciseId: 'pullups', sets: 3, repsMin: 6, repsMax: 10 },
          { exerciseId: 'roing-stang', sets: 3, repsMin: 8, repsMax: 10 },
          { exerciseId: 'nedtrekk', sets: 3, repsMin: 10, repsMax: 12 },
          { exerciseId: 'bicepscurl-stang', sets: 3, repsMin: 10, repsMax: 12 },
        ],
      },
      {
        id: 'ppl-legs',
        name: 'Legs',
        exercises: [
          { exerciseId: 'kneboy', sets: 4, repsMin: 5, repsMax: 8 },
          { exerciseId: 'rumensk-markloft', sets: 3, repsMin: 8, repsMax: 10 },
          { exerciseId: 'beinpress', sets: 3, repsMin: 10, repsMax: 12 },
          { exerciseId: 'utfall', sets: 3, repsMin: 10, repsMax: 12 },
        ],
      },
    ],
  },
  {
    id: 'prog-fullkropp',
    name: 'Fullkropp 3 dager',
    description: 'Effektivt helkroppsprogram for deg som trener 2–3 ganger i uka.',
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00Z',
    days: [
      {
        id: 'fk-a',
        name: 'Dag A',
        exercises: [
          { exerciseId: 'kneboy', sets: 3, repsMin: 5, repsMax: 8 },
          { exerciseId: 'benkpress', sets: 3, repsMin: 5, repsMax: 8 },
          { exerciseId: 'roing-stang', sets: 3, repsMin: 8, repsMax: 10 },
          { exerciseId: 'planke', sets: 3, repsMin: 1 },
        ],
      },
      {
        id: 'fk-b',
        name: 'Dag B',
        exercises: [
          { exerciseId: 'markloft', sets: 3, repsMin: 3, repsMax: 5 },
          { exerciseId: 'skulderpress-stang', sets: 3, repsMin: 8, repsMax: 10 },
          { exerciseId: 'nedtrekk', sets: 3, repsMin: 10, repsMax: 12 },
          { exerciseId: 'utfall', sets: 3, repsMin: 10, repsMax: 12 },
        ],
      },
      {
        id: 'fk-c',
        name: 'Dag C',
        exercises: [
          { exerciseId: 'frontboy', sets: 3, repsMin: 6, repsMax: 8 },
          { exerciseId: 'dips', sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'chins', sets: 3, repsMin: 6, repsMax: 10 },
          { exerciseId: 'hip-thrust', sets: 3, repsMin: 8, repsMax: 12 },
        ],
      },
    ],
  },
];

const STARTER_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'tmpl-overkropp',
    name: 'Rask overkropp',
    isFavorite: true,
    createdAt: '2026-01-01T00:00:00Z',
    exercises: [
      { exerciseId: 'benkpress', sets: 3, repsMin: 8 },
      { exerciseId: 'roing-stang', sets: 3, repsMin: 8 },
      { exerciseId: 'skulderpress-stang', sets: 3, repsMin: 10 },
      { exerciseId: 'bicepscurl-stang', sets: 2, repsMin: 12 },
      { exerciseId: 'triceps-pushdown', sets: 2, repsMin: 12 },
    ],
  },
  {
    id: 'tmpl-bein',
    name: 'Beindag express',
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00Z',
    exercises: [
      { exerciseId: 'kneboy', sets: 4, repsMin: 6 },
      { exerciseId: 'rumensk-markloft', sets: 3, repsMin: 8 },
      { exerciseId: 'beinpress', sets: 3, repsMin: 10 },
    ],
  },
];

interface ProgramState {
  programs: Program[];
  templates: WorkoutTemplate[];
  addProgram: (program: Omit<Program, 'id' | 'createdAt'>) => Program;
  updateProgram: (id: string, patch: Partial<Program>) => void;
  deleteProgram: (id: string) => void;
  toggleProgramFavorite: (id: string) => void;
  addDay: (programId: string, day: Omit<ProgramDay, 'id'>) => void;
  addTemplate: (template: Omit<WorkoutTemplate, 'id' | 'createdAt'>) => WorkoutTemplate;
  updateTemplate: (id: string, patch: Partial<WorkoutTemplate>) => void;
  deleteTemplate: (id: string) => void;
  toggleTemplateFavorite: (id: string) => void;
}

export const useProgramStore = create<ProgramState>()(
  persist(
    (set) => ({
      programs: STARTER_PROGRAMS,
      templates: STARTER_TEMPLATES,

      addProgram: (program) => {
        const created: Program = { ...program, id: uid('prog'), createdAt: new Date().toISOString() };
        set((s) => ({ programs: [created, ...s.programs] }));
        return created;
      },
      updateProgram: (id, patch) =>
        set((s) => ({ programs: s.programs.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deleteProgram: (id) => set((s) => ({ programs: s.programs.filter((p) => p.id !== id) })),
      toggleProgramFavorite: (id) =>
        set((s) => ({
          programs: s.programs.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)),
        })),
      addDay: (programId, day) =>
        set((s) => ({
          programs: s.programs.map((p) =>
            p.id === programId ? { ...p, days: [...p.days, { ...day, id: uid('day') }] } : p,
          ),
        })),

      addTemplate: (template) => {
        const created: WorkoutTemplate = { ...template, id: uid('tmpl'), createdAt: new Date().toISOString() };
        set((s) => ({ templates: [created, ...s.templates] }));
        return created;
      },
      updateTemplate: (id, patch) =>
        set((s) => ({ templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
      toggleTemplateFavorite: (id) =>
        set((s) => ({
          templates: s.templates.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t)),
        })),
    }),
    { name: 'programs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
