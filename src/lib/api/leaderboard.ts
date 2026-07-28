// API for rangering blant venner (RPC friend_leaderboard).
// Konvensjon: alle funksjoner KASTER Error med norsk melding (via norskFeil)
// ved feil — kallere fanger med try/catch og viser meldingen i UI.

import { norskFeil } from '@/lib/api/errors';
import { supabase } from '@/lib/supabase';

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
