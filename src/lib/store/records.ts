import { create } from 'zustand';
import {
  deleteManualRecord as apiDeleteManualRecord,
  deleteRunRecord as apiDeleteRunRecord,
  fetchMyManualRecords,
  fetchMyRunRecords,
  insertManualRecord,
  insertRunRecord,
  updateManualRecord as apiUpdateManualRecord,
  updateRunRecord as apiUpdateRunRecord,
  type ManualRecordPatch,
  type RunRecordPatch,
} from '@/lib/api/personal';
import { useAuthStore } from './auth';
import type { ManualRecord, RunRecord } from '@/types';

/** Nyeste dato først, udaterte sist — samme rekkefølge som serveren leverer */
function byDateDesc<T extends { date?: string; createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    // Tom streng sorterer sist i synkende rekkefølge; nyest opprettet vinner likt
    const byDate = (b.date ?? '').localeCompare(a.date ?? '');
    return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt);
  });
}

interface RecordState {
  records: ManualRecord[];
  runs: RunRecord[];
  loaded: boolean;
  loading: boolean;

  load: () => Promise<void>;
  addRecord: (record: Omit<ManualRecord, 'id' | 'createdAt'>) => Promise<ManualRecord>;
  /** null i patch nullstiller feltet (f.eks. fjernet sted/kroppsvekt) */
  updateRecord: (id: string, patch: ManualRecordPatch) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  addRun: (run: Omit<RunRecord, 'id' | 'createdAt'>) => Promise<RunRecord>;
  /** null i patch nullstiller feltet (f.eks. fjernet sted/notat) */
  updateRun: (id: string, patch: RunRecordPatch) => Promise<void>;
  deleteRun: (id: string) => Promise<void>;
}

export const useRecordStore = create<RecordState>()((set, get) => ({
  records: [],
  runs: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const userId = useAuthStore.getState().user!.id;
      const [records, runs] = await Promise.all([
        fetchMyManualRecords(userId),
        fetchMyRunRecords(userId),
      ]);
      set({ records, runs, loaded: true, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  addRecord: async (record) => {
    const userId = useAuthStore.getState().user!.id;
    const created = await insertManualRecord(userId, record);
    set((s) => ({ records: byDateDesc([created, ...s.records]) }));
    return created;
  },

  updateRecord: async (id, patch) => {
    const updated = await apiUpdateManualRecord(id, patch);
    set((s) => ({
      records: byDateDesc(s.records.map((r) => (r.id === id ? updated : r))),
    }));
  },

  deleteRecord: async (id) => {
    await apiDeleteManualRecord(id);
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
  },

  addRun: async (run) => {
    const userId = useAuthStore.getState().user!.id;
    const created = await insertRunRecord(userId, run);
    set((s) => ({ runs: byDateDesc([created, ...s.runs]) }));
    return created;
  },

  updateRun: async (id, patch) => {
    const updated = await apiUpdateRunRecord(id, patch);
    set((s) => ({
      runs: byDateDesc(s.runs.map((r) => (r.id === id ? updated : r))),
    }));
  },

  deleteRun: async (id) => {
    await apiDeleteRunRecord(id);
    set((s) => ({ runs: s.runs.filter((r) => r.id !== id) }));
  },
}));
