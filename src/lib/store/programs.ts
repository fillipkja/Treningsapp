import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { t } from '@/i18n';
import {
  deleteProgram as apiDeleteProgram,
  deleteTemplate as apiDeleteTemplate,
  fetchMyPrograms,
  fetchMyTemplates,
  insertProgram,
  insertTemplate,
  updateProgram as apiUpdateProgram,
  updateTemplate as apiUpdateTemplate,
} from '@/lib/api/personal';
import { uid } from '@/lib/ids';
import { useAuthStore } from './auth';
import type { Program, ProgramDay, WorkoutTemplate } from '@/types';

/**
 * Startprogrammer så appen ikke er tom ved første åpning (seedes til serveren).
 * Bygges ved seedtidspunkt slik at navn/beskrivelser følger brukerens aktive språk.
 */
const starterPrograms = (): Program[] => [
  {
    id: 'prog-ppl',
    name: t('training.starterPplName'),
    description: t('training.starterPplDesc'),
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
    name: t('training.starterFullBodyName'),
    description: t('training.starterFullBodyDesc'),
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00Z',
    days: [
      {
        id: 'fk-a',
        name: t('training.starterDayA'),
        exercises: [
          { exerciseId: 'kneboy', sets: 3, repsMin: 5, repsMax: 8 },
          { exerciseId: 'benkpress', sets: 3, repsMin: 5, repsMax: 8 },
          { exerciseId: 'roing-stang', sets: 3, repsMin: 8, repsMax: 10 },
          { exerciseId: 'planke', sets: 3, repsMin: 1 },
        ],
      },
      {
        id: 'fk-b',
        name: t('training.starterDayB'),
        exercises: [
          { exerciseId: 'markloft', sets: 3, repsMin: 3, repsMax: 5 },
          { exerciseId: 'skulderpress-stang', sets: 3, repsMin: 8, repsMax: 10 },
          { exerciseId: 'nedtrekk', sets: 3, repsMin: 10, repsMax: 12 },
          { exerciseId: 'utfall', sets: 3, repsMin: 10, repsMax: 12 },
        ],
      },
      {
        id: 'fk-c',
        name: t('training.starterDayC'),
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

const starterTemplates = (): WorkoutTemplate[] => [
  {
    id: 'tmpl-overkropp',
    name: t('training.starterUpperName'),
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
    name: t('training.starterLegsName'),
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00Z',
    exercises: [
      { exerciseId: 'kneboy', sets: 4, repsMin: 6 },
      { exerciseId: 'rumensk-markloft', sets: 3, repsMin: 8 },
      { exerciseId: 'beinpress', sets: 3, repsMin: 10 },
    ],
  },
];

function seededFlagKey(userId: string): string {
  return `seeded-starters:${userId}`;
}

interface ProgramState {
  programs: Program[];
  templates: WorkoutTemplate[];
  loaded: boolean;
  loading: boolean;

  /** Henter programmer og maler fra serveren; seeder startere første gang */
  load: () => Promise<void>;

  addProgram: (program: Omit<Program, 'id' | 'createdAt'>) => Promise<Program>;
  updateProgram: (id: string, patch: Partial<Program>) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  toggleProgramFavorite: (id: string) => Promise<void>;
  addDay: (programId: string, day: Omit<ProgramDay, 'id'>) => Promise<void>;
  addTemplate: (template: Omit<WorkoutTemplate, 'id' | 'createdAt'>) => Promise<WorkoutTemplate>;
  updateTemplate: (id: string, patch: Partial<WorkoutTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  toggleTemplateFavorite: (id: string) => Promise<void>;
}

export const useProgramStore = create<ProgramState>()((set, get) => ({
  programs: [],
  templates: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const userId = useAuthStore.getState().user!.id;
      let [programs, templates] = await Promise.all([
        fetchMyPrograms(userId),
        fetchMyTemplates(userId),
      ]);

      // Seed starterne til serveren første gang (helt tom konto uten flagg)
      const flagKey = seededFlagKey(userId);
      const alreadySeeded = (await AsyncStorage.getItem(flagKey)) != null;
      if (programs.length === 0 && templates.length === 0 && !alreadySeeded) {
        programs = await Promise.all(
          starterPrograms().map(({ id: _id, createdAt: _createdAt, ...p }) =>
            insertProgram(userId, p),
          ),
        );
        templates = await Promise.all(
          starterTemplates().map(({ id: _id, createdAt: _createdAt, ...tmpl }) =>
            insertTemplate(userId, tmpl),
          ),
        );
        await AsyncStorage.setItem(flagKey, '1');
      } else if (!alreadySeeded) {
        // Kontoen har allerede data — ikke seed senere selv om alt slettes
        await AsyncStorage.setItem(flagKey, '1');
      }

      set({ programs, templates, loaded: true, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  addProgram: async (program) => {
    const userId = useAuthStore.getState().user!.id;
    const created = await insertProgram(userId, program);
    set((s) => ({ programs: [created, ...s.programs] }));
    return created;
  },

  updateProgram: async (id, patch) => {
    const updated = await apiUpdateProgram(id, patch);
    set((s) => ({ programs: s.programs.map((p) => (p.id === id ? updated : p)) }));
  },

  deleteProgram: async (id) => {
    await apiDeleteProgram(id);
    set((s) => ({ programs: s.programs.filter((p) => p.id !== id) }));
  },

  toggleProgramFavorite: async (id) => {
    const before = get().programs;
    const current = before.find((p) => p.id === id);
    if (!current) return;
    // Optimistisk: trygt å angre ved feil
    set((s) => ({
      programs: s.programs.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)),
    }));
    try {
      await apiUpdateProgram(id, { isFavorite: !current.isFavorite });
    } catch (error) {
      set({ programs: before });
      throw error;
    }
  },

  addDay: async (programId, day) => {
    const program = get().programs.find((p) => p.id === programId);
    if (!program) return;
    const days = [...program.days, { ...day, id: uid('day') }];
    const updated = await apiUpdateProgram(programId, { days });
    set((s) => ({ programs: s.programs.map((p) => (p.id === programId ? updated : p)) }));
  },

  addTemplate: async (template) => {
    const userId = useAuthStore.getState().user!.id;
    const created = await insertTemplate(userId, template);
    set((s) => ({ templates: [created, ...s.templates] }));
    return created;
  },

  updateTemplate: async (id, patch) => {
    const updated = await apiUpdateTemplate(id, patch);
    set((s) => ({ templates: s.templates.map((t) => (t.id === id ? updated : t)) }));
  },

  deleteTemplate: async (id) => {
    await apiDeleteTemplate(id);
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
  },

  toggleTemplateFavorite: async (id) => {
    const before = get().templates;
    const current = before.find((t) => t.id === id);
    if (!current) return;
    // Optimistisk: trygt å angre ved feil
    set((s) => ({
      templates: s.templates.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t)),
    }));
    try {
      await apiUpdateTemplate(id, { isFavorite: !current.isFavorite });
    } catch (error) {
      set({ templates: before });
      throw error;
    }
  },
}));
