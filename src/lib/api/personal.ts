// API for personlige data: PR-er, programmer, maler, egne øvelser og badges.
// Konvensjon: alle funksjoner KASTER Error med norsk melding (via norskFeil)
// ved feil — kallere fanger med try/catch og viser meldingen i UI.

import { norskFeil } from '@/lib/api/errors';
import { supabase } from '@/lib/supabase';
import type {
  EarnedBadge,
  Exercise,
  ExercisePR,
  PRHistoryPoint,
  Program,
  ProgramDay,
  TemplateExercise,
  WorkoutTemplate,
} from '@/types';

// ============================================================ PR-er

interface PRRow {
  user_id: string;
  exercise_id: string;
  best_weight_kg: number;
  best_est_1rm: number;
  best_reps: number;
  best_set_volume_kg: number;
  history: unknown;
  updated_at: string;
}

function mapPRRow(row: PRRow): ExercisePR {
  return {
    exerciseId: row.exercise_id,
    bestWeightKg: row.best_weight_kg,
    bestEst1RM: row.best_est_1rm,
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
    best_est_1rm: pr.bestEst1RM,
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
