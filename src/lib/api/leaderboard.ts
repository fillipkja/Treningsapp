// API for rangering blant venner (RPC-ene friend_leaderboard,
// strength_leaderboard og running_leaderboard).
// Konvensjon: alle funksjoner KASTER Error med norsk melding (via norskFeil)
// ved feil — kallere fanger med try/catch og viser meldingen i UI.

import { norskFeil } from '@/lib/api/errors';
import { supabase } from '@/lib/supabase';
import type { RunningLeaderboardEntry, StrengthLeaderboardEntry } from '@/types';

interface FriendLeaderboardRow {
  user_id: string;
  workout_count: number;
  volume_kg: number;
  pr_count: number;
}

export interface FriendLeaderboardResult {
  userId: string;
  workouts: number;
  volumeKg: number;
  prs: number;
}

/** Aggregater for meg + aksepterte venner i perioden [start, end] */
export async function fetchFriendLeaderboard(
  start: Date,
  end: Date,
): Promise<FriendLeaderboardResult[]> {
  const { data, error } = await supabase.rpc('friend_leaderboard', {
    period_start: start.toISOString(),
    period_end: end.toISOString(),
  });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as FriendLeaderboardRow[]).map((row) => ({
    userId: row.user_id,
    workouts: Number(row.workout_count),
    volumeKg: Number(row.volume_kg),
    prs: Number(row.pr_count),
  }));
}

interface StrengthLeaderboardRow {
  user_id: string;
  best_weight_kg: number | string;
  achieved_at: string | null;
}

/** Tyngste løft per venn for en øvelse og et sett-opplegg (se STRENGTH_SCHEMES) */
export async function fetchStrengthLeaderboard(
  exerciseId: string,
  minReps: number,
  minSets: number,
): Promise<StrengthLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('strength_leaderboard', {
    ex_id: exerciseId,
    min_reps: minReps,
    min_sets: minSets,
  });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as StrengthLeaderboardRow[]).map((row) => ({
    userId: row.user_id,
    bestWeightKg: Number(row.best_weight_kg),
    achievedAt: row.achieved_at ?? undefined,
  }));
}

interface RunningLeaderboardRow {
  user_id: string;
  best_sec: number;
  achieved_at: string | null;
}

/** Beste tid per venn på en distanse (meter, se STANDARD_RUN_DISTANCES) */
export async function fetchRunningLeaderboard(
  distanceM: number,
): Promise<RunningLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('running_leaderboard', { dist_m: distanceM });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as RunningLeaderboardRow[]).map((row) => ({
    userId: row.user_id,
    bestSec: Number(row.best_sec),
    achievedAt: row.achieved_at ?? undefined,
  }));
}
