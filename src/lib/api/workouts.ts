// API for økter, likes og kommentarer.
// Konvensjon: alle funksjoner KASTER Error med norsk melding (via norskFeil)
// ved feil — kallere fanger med try/catch og viser meldingen i UI.

import { norskFeil } from '@/lib/api/errors';
import {
  mapCommentRow,
  mapProfileRow,
  mapWorkoutRow,
  type ProfileRow,
  type WorkoutCommentRow,
  type WorkoutRow,
} from '@/lib/api/mappers';
import { supabase } from '@/lib/supabase';
import type { UserProfile, Workout, WorkoutComment } from '@/types';

const WORKOUT_SELECT = '*, workout_likes(user_id), workout_comments(*)';

/** Egne økter, nyeste først, med likes og kommentarer innebygd */
export async function fetchMyWorkouts(userId: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(WORKOUT_SELECT)
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as WorkoutRow[]).map(mapWorkoutRow);
}

interface FeedRow extends WorkoutRow {
  profiles: ProfileRow | null;
}

/** Feed: egne + venners delte økter (RLS avgjør synlighet), nyeste først */
export async function fetchFeed(): Promise<{ workout: Workout; author: UserProfile }[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, profiles!workouts_user_id_fkey(*), workout_likes(user_id), workout_comments(*)')
    .order('date', { ascending: false })
    .limit(50);
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as FeedRow[]).flatMap((row) =>
    row.profiles
      ? [{ workout: mapWorkoutRow(row), author: mapProfileRow(row.profiles) }]
      : [],
  );
}

/**
 * Én brukers økter som er synlige for meg (RLS: kun delte økter for venner),
 * nyeste først. Brukes på venneprofilen i stedet for å filtrere fetchFeed(),
 * som er begrenset til de 50 nyeste øktene på tvers av alle venner.
 */
export async function fetchSharedWorkoutsByUser(userId: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(WORKOUT_SELECT)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(50);
  // 22P02: userId er ikke en gyldig uuid — behandles som «ingen økter»
  if (error?.code === '22P02') return [];
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as WorkoutRow[]).map(mapWorkoutRow);
}

/**
 * Én økt med forfatter, likes og kommentarer. Returnerer null hvis økten
 * ikke finnes eller ikke er synlig for meg (RLS filtrerer den bort).
 */
export async function fetchWorkoutById(
  id: string,
): Promise<{ workout: Workout; author: UserProfile } | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, profiles!workouts_user_id_fkey(*), workout_likes(user_id), workout_comments(*)')
    .eq('id', id)
    .maybeSingle();
  // 22P02: id er ikke en gyldig uuid — behandles som «finnes ikke»
  if (error?.code === '22P02') return null;
  if (error) throw new Error(norskFeil(error));
  const row = data as FeedRow | null;
  if (!row || !row.profiles) return null;
  return { workout: mapWorkoutRow(row), author: mapProfileRow(row.profiles) };
}

export async function insertWorkout(
  w: Omit<Workout, 'id' | 'likes' | 'comments'>,
): Promise<Workout> {
  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: w.userId,
      name: w.name,
      date: w.date,
      started_at: w.startedAt ?? null,
      duration_min: w.durationMin ?? null,
      exercises: w.exercises,
      notes: w.notes ?? null,
      is_shared: w.isShared,
      program_id: w.programId ?? null,
      template_id: w.templateId ?? null,
      // Aggregatene beregnes på nytt av trigger-en trg_workout_aggregates —
      // verdiene her er kun et utgangspunkt, og raden vi leser tilbake under
      // inneholder serverens tall
      total_volume_kg: w.totalVolumeKg,
      total_sets: w.totalSets,
      pr_count: w.prCount,
    })
    .select()
    .single();
  if (error) throw new Error(norskFeil(error));
  // Ny økt har ingen likes/kommentarer ennå — mapWorkoutRow gir tomme lister
  return mapWorkoutRow(data as WorkoutRow);
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('id', id);
  if (error) throw new Error(norskFeil(error));
}

export async function setWorkoutShared(id: string, shared: boolean): Promise<void> {
  const { error } = await supabase.from('workouts').update({ is_shared: shared }).eq('id', id);
  if (error) throw new Error(norskFeil(error));
}

/** Lik / fjern like på en økt. Dobbel like er ikke en feil (idempotent). */
export async function setLike(workoutId: string, userId: string, liked: boolean): Promise<void> {
  if (liked) {
    const { error } = await supabase
      .from('workout_likes')
      .insert({ workout_id: workoutId, user_id: userId });
    if (error && error.code !== '23505') throw new Error(norskFeil(error));
    return;
  }
  const { error } = await supabase
    .from('workout_likes')
    .delete()
    .eq('workout_id', workoutId)
    .eq('user_id', userId);
  if (error) throw new Error(norskFeil(error));
}

export async function addComment(workoutId: string, text: string): Promise<WorkoutComment> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Ikke innlogget.');
  const { data, error } = await supabase
    .from('workout_comments')
    .insert({ workout_id: workoutId, user_id: userData.user.id, text: text.trim() })
    .select()
    .single();
  if (error) throw new Error(norskFeil(error));
  return mapCommentRow(data as WorkoutCommentRow);
}

interface CommentWithAuthorRow extends WorkoutCommentRow {
  profiles: ProfileRow | null;
}

/** Kommentarer på en økt med forfatterprofil, eldste først */
export async function fetchCommentsWithAuthors(
  workoutId: string,
): Promise<{ comment: WorkoutComment; author: UserProfile | null }[]> {
  const { data, error } = await supabase
    .from('workout_comments')
    .select('*, profiles(*)')
    .eq('workout_id', workoutId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as CommentWithAuthorRow[]).map((row) => ({
    comment: mapCommentRow(row),
    author: row.profiles ? mapProfileRow(row.profiles) : null,
  }));
}
