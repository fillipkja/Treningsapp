// Radtyper og mapping fra snake_case (Postgres) til camelCase (domenetyper).
// Konvensjon for hele API-laget (src/lib/api): funksjoner KASTER Error med
// norsk melding (via norskFeil) ved feil — kallere fanger med try/catch og
// viser meldingen i UI (infoDialog eller inline-tekst).

import { mapProfile } from '@/lib/store/auth';
import type {
  TrainingGoal,
  UserProfile,
  Workout,
  WorkoutComment,
  WorkoutExercise,
} from '@/types';

/**
 * Rad fra public.profiles (samme form som ProfileRow i auth-store).
 * Kroppsdata (height_cm/weight_kg) ligger i public.profile_private og er kun
 * lesbar for brukeren selv — den er derfor ikke med her.
 */
export interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_url: string | null;
  goal: TrainingGoal | null;
  bio: string | null;
  share_workouts: boolean;
  created_at: string;
}

/** Mapper en profil-rad til UserProfile — gjenbruker mapProfile fra auth-store */
export function mapProfileRow(row: ProfileRow): UserProfile {
  return mapProfile(row);
}

/** Innebygd rad fra workout_likes(user_id) */
export interface WorkoutLikeRow {
  user_id: string;
}

/** Rad fra public.workout_comments */
export interface WorkoutCommentRow {
  id: string;
  workout_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

/** Rad fra public.workouts, ev. med innebygde likes/kommentarer */
export interface WorkoutRow {
  id: string;
  user_id: string;
  name: string;
  date: string;
  started_at: string | null;
  duration_min: number | null;
  exercises: unknown;
  notes: string | null;
  is_shared: boolean;
  program_id: string | null;
  template_id: string | null;
  total_volume_kg: number;
  total_sets: number;
  pr_count: number;
  created_at: string;
  /** Fylles av .select('*, workout_likes(user_id), workout_comments(*)') */
  workout_likes?: WorkoutLikeRow[];
  workout_comments?: WorkoutCommentRow[];
}

export function mapCommentRow(row: WorkoutCommentRow): WorkoutComment {
  return {
    id: row.id,
    userId: row.user_id,
    text: row.text,
    createdAt: row.created_at,
  };
}

export function mapWorkoutRow(row: WorkoutRow): Workout {
  // Defensivt: jsonb/innebygde lister kommer fra andre brukeres rader, og
  // feeden skal aldri krasje på uventet form (f.eks. exercises som objekt).
  const comments = (Array.isArray(row.workout_comments) ? row.workout_comments : [])
    .map(mapCommentRow)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    date: row.date,
    startedAt: row.started_at ?? undefined,
    durationMin: row.duration_min ?? undefined,
    exercises: Array.isArray(row.exercises) ? (row.exercises as WorkoutExercise[]) : [],
    notes: row.notes ?? undefined,
    isShared: row.is_shared,
    programId: row.program_id ?? undefined,
    templateId: row.template_id ?? undefined,
    totalVolumeKg: row.total_volume_kg,
    totalSets: row.total_sets,
    prCount: row.pr_count,
    likes: (Array.isArray(row.workout_likes) ? row.workout_likes : []).map((like) => like.user_id),
    comments,
  };
}
