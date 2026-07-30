// API for personlige data: PR-er, rekorder, løp, programmer, maler, egne øvelser og badges.
// Konvensjon: alle funksjoner KASTER Error med norsk melding (via norskFeil)
// ved feil — kallere fanger med try/catch og viser meldingen i UI.

import { norskFeil } from '@/lib/api/errors';
import { supabase } from '@/lib/supabase';
import type {
  EarnedBadge,
  Exercise,
  ExercisePR,
  FriendRecord,
  FriendRun,
  ManualRecord,
  PRHistoryPoint,
  Program,
  ProgramDay,
  RunRecord,
  TemplateExercise,
  WorkoutTemplate,
} from '@/types';

// ============================================================ PR-er

interface PRRow {
  user_id: string;
  exercise_id: string;
  best_weight_kg: number;
  best_reps: number;
  best_set_volume_kg: number;
  history: unknown;
  updated_at: string;
}

function mapPRRow(row: PRRow): ExercisePR {
  return {
    exerciseId: row.exercise_id,
    bestWeightKg: row.best_weight_kg,
    bestReps: row.best_reps,
    bestSetVolumeKg: row.best_set_volume_kg,
    updatedAt: row.updated_at,
    history: Array.isArray(row.history) ? (row.history as PRHistoryPoint[]) : [],
  };
}

export async function fetchMyPRs(userId: string): Promise<ExercisePR[]> {
  const { data, error } = await supabase.from('prs').select('*').eq('user_id', userId);
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as PRRow[]).map(mapPRRow);
}

export async function upsertPRs(userId: string, prs: ExercisePR[]): Promise<void> {
  if (prs.length === 0) return;
  const rows = prs.map((pr) => ({
    user_id: userId,
    exercise_id: pr.exerciseId,
    best_weight_kg: pr.bestWeightKg,
    best_reps: pr.bestReps,
    best_set_volume_kg: pr.bestSetVolumeKg,
    history: pr.history,
    updated_at: pr.updatedAt,
  }));
  const { error } = await supabase.from('prs').upsert(rows, { onConflict: 'user_id,exercise_id' });
  if (error) throw new Error(norskFeil(error));
}

export async function deletePRs(userId: string, exerciseIds: string[]): Promise<void> {
  if (exerciseIds.length === 0) return;
  const { error } = await supabase
    .from('prs')
    .delete()
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds);
  if (error) throw new Error(norskFeil(error));
}

// ============================================================ manuelle rekorder

interface ManualRecordRow {
  id: string;
  user_id: string;
  exercise_id: string;
  weight_kg: number;
  reps: number;
  sets: number;
  date: string | null;
  location: string | null;
  bodyweight_kg: number | null;
  notes: string | null;
  is_shared: boolean;
  created_at: string;
}

function mapManualRecordRow(row: ManualRecordRow): ManualRecord {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    weightKg: row.weight_kg,
    reps: row.reps,
    sets: row.sets,
    date: row.date ?? undefined,
    location: row.location ?? undefined,
    bodyweightKg: row.bodyweight_kg ?? undefined,
    notes: row.notes ?? undefined,
    isShared: row.is_shared,
    createdAt: row.created_at,
  };
}

export async function fetchMyManualRecords(userId: string): Promise<ManualRecord[]> {
  const { data, error } = await supabase
    .from('manual_records')
    .select('*')
    .eq('user_id', userId)
    // Udaterte rekorder sist og nyest opprettet ved lik dato — som byDateDesc
    // i record-storen, ellers stokkes like rader om ved neste lokale endring
    .order('date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as ManualRecordRow[]).map(mapManualRecordRow);
}

export async function insertManualRecord(
  userId: string,
  record: Omit<ManualRecord, 'id' | 'createdAt'>,
): Promise<ManualRecord> {
  const { data, error } = await supabase
    .from('manual_records')
    .insert({
      user_id: userId,
      exercise_id: record.exerciseId,
      weight_kg: record.weightKg,
      reps: record.reps,
      sets: record.sets,
      date: record.date ?? null,
      location: record.location ?? null,
      bodyweight_kg: record.bodyweightKg ?? null,
      notes: record.notes ?? null,
      is_shared: record.isShared,
    })
    .select()
    .single();
  if (error) throw new Error(norskFeil(error));
  return mapManualRecordRow(data as ManualRecordRow);
}

/** Felter som kan endres på en rekord. null nullstiller kolonnen. */
export interface ManualRecordPatch {
  exerciseId?: string;
  weightKg?: number;
  reps?: number;
  sets?: number;
  date?: string | null;
  location?: string | null;
  bodyweightKg?: number | null;
  notes?: string | null;
  isShared?: boolean;
}

export async function updateManualRecord(
  id: string,
  patch: ManualRecordPatch,
): Promise<ManualRecord> {
  const row: Record<string, unknown> = {};
  if (patch.exerciseId !== undefined) row.exercise_id = patch.exerciseId;
  if (patch.weightKg !== undefined) row.weight_kg = patch.weightKg;
  if (patch.reps !== undefined) row.reps = patch.reps;
  if (patch.sets !== undefined) row.sets = patch.sets;
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.location !== undefined) row.location = patch.location ?? null;
  if (patch.bodyweightKg !== undefined) row.bodyweight_kg = patch.bodyweightKg ?? null;
  if (patch.notes !== undefined) row.notes = patch.notes ?? null;
  if (patch.isShared !== undefined) row.is_shared = patch.isShared;
  const { data, error } = await supabase
    .from('manual_records')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(norskFeil(error));
  return mapManualRecordRow(data as ManualRecordRow);
}

export async function deleteManualRecord(id: string): Promise<void> {
  const { error } = await supabase.from('manual_records').delete().eq('id', id);
  if (error) throw new Error(norskFeil(error));
}

interface SharedRecordRow {
  id: string;
  exercise_id: string;
  weight_kg: number;
  reps: number;
  sets: number;
  date: string | null;
}

/** En venns delte rekorder — RPC-en returnerer kun trygge kolonner */
export async function fetchSharedRecordsByUser(userId: string): Promise<FriendRecord[]> {
  const { data, error } = await supabase.rpc('shared_records_for', { owner: userId });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as SharedRecordRow[]).map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    weightKg: row.weight_kg,
    reps: row.reps,
    sets: row.sets,
    date: row.date ?? undefined,
  }));
}

// ============================================================ løperekorder

interface RunRecordRow {
  id: string;
  user_id: string;
  distance_m: number;
  duration_sec: number;
  date: string | null;
  location: string | null;
  notes: string | null;
  is_shared: boolean;
  created_at: string;
}

function mapRunRecordRow(row: RunRecordRow): RunRecord {
  return {
    id: row.id,
    distanceM: row.distance_m,
    durationSec: row.duration_sec,
    date: row.date ?? undefined,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    isShared: row.is_shared,
    createdAt: row.created_at,
  };
}

export async function fetchMyRunRecords(userId: string): Promise<RunRecord[]> {
  const { data, error } = await supabase
    .from('run_records')
    .select('*')
    .eq('user_id', userId)
    // Udaterte løp sist og nyest opprettet ved lik dato — som byDateDesc
    // i record-storen, ellers stokkes like rader om ved neste lokale endring
    .order('date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as RunRecordRow[]).map(mapRunRecordRow);
}

export async function insertRunRecord(
  userId: string,
  run: Omit<RunRecord, 'id' | 'createdAt'>,
): Promise<RunRecord> {
  const { data, error } = await supabase
    .from('run_records')
    .insert({
      user_id: userId,
      distance_m: run.distanceM,
      duration_sec: run.durationSec,
      date: run.date ?? null,
      location: run.location ?? null,
      notes: run.notes ?? null,
      is_shared: run.isShared,
    })
    .select()
    .single();
  if (error) throw new Error(norskFeil(error));
  return mapRunRecordRow(data as RunRecordRow);
}

/** Felter som kan endres på et løp. null nullstiller kolonnen. */
export interface RunRecordPatch {
  distanceM?: number;
  durationSec?: number;
  date?: string | null;
  location?: string | null;
  notes?: string | null;
  isShared?: boolean;
}

export async function updateRunRecord(id: string, patch: RunRecordPatch): Promise<RunRecord> {
  const row: Record<string, unknown> = {};
  if (patch.distanceM !== undefined) row.distance_m = patch.distanceM;
  if (patch.durationSec !== undefined) row.duration_sec = patch.durationSec;
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.location !== undefined) row.location = patch.location ?? null;
  if (patch.notes !== undefined) row.notes = patch.notes ?? null;
  if (patch.isShared !== undefined) row.is_shared = patch.isShared;
  const { data, error } = await supabase
    .from('run_records')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(norskFeil(error));
  return mapRunRecordRow(data as RunRecordRow);
}

export async function deleteRunRecord(id: string): Promise<void> {
  const { error } = await supabase.from('run_records').delete().eq('id', id);
  if (error) throw new Error(norskFeil(error));
}

interface SharedRunRow {
  id: string;
  distance_m: number;
  duration_sec: number;
  date: string | null;
}

/** En venns delte løp — RPC-en returnerer kun trygge kolonner */
export async function fetchSharedRunsByUser(userId: string): Promise<FriendRun[]> {
  const { data, error } = await supabase.rpc('shared_runs_for', { owner: userId });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as SharedRunRow[]).map((row) => ({
    id: row.id,
    distanceM: row.distance_m,
    durationSec: row.duration_sec,
    date: row.date ?? undefined,
  }));
}

// ============================================================ programmer

interface ProgramRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  days: unknown;
  is_favorite: boolean;
  created_at: string;
}

function mapProgramRow(row: ProgramRow): Program {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    days: Array.isArray(row.days) ? (row.days as ProgramDay[]) : [],
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
  };
}

export async function fetchMyPrograms(userId: string): Promise<Program[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as ProgramRow[]).map(mapProgramRow);
}

export async function insertProgram(
  userId: string,
  program: Omit<Program, 'id' | 'createdAt'>,
): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .insert({
      user_id: userId,
      name: program.name,
      description: program.description ?? null,
      days: program.days,
      is_favorite: program.isFavorite,
    })
    .select()
    .single();
  if (error) throw new Error(norskFeil(error));
  return mapProgramRow(data as ProgramRow);
}

export async function updateProgram(
  id: string,
  patch: Partial<Omit<Program, 'id' | 'createdAt'>>,
): Promise<Program> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.description !== undefined) row.description = patch.description ?? null;
  if (patch.days !== undefined) row.days = patch.days;
  if (patch.isFavorite !== undefined) row.is_favorite = patch.isFavorite;
  const { data, error } = await supabase
    .from('programs')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(norskFeil(error));
  return mapProgramRow(data as ProgramRow);
}

export async function deleteProgram(id: string): Promise<void> {
  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) throw new Error(norskFeil(error));
}

// ============================================================ maler

interface TemplateRow {
  id: string;
  user_id: string;
  name: string;
  exercises: unknown;
  is_favorite: boolean;
  created_at: string;
}

function mapTemplateRow(row: TemplateRow): WorkoutTemplate {
  return {
    id: row.id,
    name: row.name,
    exercises: Array.isArray(row.exercises) ? (row.exercises as TemplateExercise[]) : [],
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
  };
}

export async function fetchMyTemplates(userId: string): Promise<WorkoutTemplate[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as TemplateRow[]).map(mapTemplateRow);
}

export async function insertTemplate(
  userId: string,
  template: Omit<WorkoutTemplate, 'id' | 'createdAt'>,
): Promise<WorkoutTemplate> {
  const { data, error } = await supabase
    .from('templates')
    .insert({
      user_id: userId,
      name: template.name,
      exercises: template.exercises,
      is_favorite: template.isFavorite,
    })
    .select()
    .single();
  if (error) throw new Error(norskFeil(error));
  return mapTemplateRow(data as TemplateRow);
}

export async function updateTemplate(
  id: string,
  patch: Partial<Omit<WorkoutTemplate, 'id' | 'createdAt'>>,
): Promise<WorkoutTemplate> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.exercises !== undefined) row.exercises = patch.exercises;
  if (patch.isFavorite !== undefined) row.is_favorite = patch.isFavorite;
  const { data, error } = await supabase
    .from('templates')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(norskFeil(error));
  return mapTemplateRow(data as TemplateRow);
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) throw new Error(norskFeil(error));
}

// ============================================================ egne øvelser

interface CustomExerciseRow {
  id: string;
  user_id: string;
  /** Hele Exercise-objektet som jsonb; radens uuid overstyrer id-feltet */
  data: unknown;
  created_at: string;
}

export async function fetchMyCustomExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('custom_exercises')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as CustomExerciseRow[]).map((row) => ({
    ...(row.data as Exercise),
    id: row.id,
    isCustom: true,
  }));
}

export async function insertCustomExercise(ex: Omit<Exercise, 'id'>): Promise<Exercise> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Ikke innlogget.');
  const { data, error } = await supabase
    .from('custom_exercises')
    .insert({ user_id: userData.user.id, data: { ...ex, isCustom: true } })
    .select()
    .single();
  if (error) throw new Error(norskFeil(error));
  const row = data as CustomExerciseRow;
  return { ...ex, id: row.id, isCustom: true };
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const { error } = await supabase.from('custom_exercises').delete().eq('id', id);
  if (error) throw new Error(norskFeil(error));
}

// ============================================================ badges

interface EarnedBadgeRow {
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export async function fetchMyBadges(userId: string): Promise<EarnedBadge[]> {
  const { data, error } = await supabase
    .from('earned_badges')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: true });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as EarnedBadgeRow[]).map((row) => ({
    badgeId: row.badge_id,
    earnedAt: row.earned_at,
  }));
}

/** Idempotent: allerede opptjente badges hopper vi over */
export async function insertBadges(userId: string, badgeIds: string[]): Promise<void> {
  if (badgeIds.length === 0) return;
  const rows = badgeIds.map((badgeId) => ({ user_id: userId, badge_id: badgeId }));
  const { error } = await supabase
    .from('earned_badges')
    .upsert(rows, { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
  if (error) throw new Error(norskFeil(error));
}
