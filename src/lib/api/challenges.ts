// API for utfordringer.
// Konvensjon: alle funksjoner KASTER Error med norsk melding (via norskFeil)
// ved feil — kallere fanger med try/catch og viser meldingen i UI.

import { norskFeil } from '@/lib/api/errors';
import { mapProfileRow, type ProfileRow } from '@/lib/api/mappers';
import { supabase } from '@/lib/supabase';
import type { Challenge, ChallengeType, UserProfile } from '@/types';

interface ChallengeRow {
  id: string;
  creator_id: string;
  name: string;
  type: ChallengeType;
  target: number | null;
  program_id: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface ChallengeParticipantRow {
  user_id: string;
  profiles: ProfileRow | null;
}

interface ChallengeJoinedRow extends ChallengeRow {
  challenge_participants: ChallengeParticipantRow[];
}

function mapChallengeRow(row: ChallengeRow, participantIds: string[]): Challenge {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    startDate: row.start_date,
    endDate: row.end_date,
    creatorId: row.creator_id,
    participants: participantIds,
    target: row.target ?? undefined,
    programId: row.program_id ?? undefined,
  };
}

/** Utfordringer jeg deltar i eller har laget (RLS filtrerer), med deltakerprofiler */
export async function fetchMyChallenges(): Promise<
  { challenge: Challenge; participants: UserProfile[] }[]
> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*, challenge_participants(user_id, profiles(*))')
    .order('end_date', { ascending: false });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as ChallengeJoinedRow[]).map((row) => {
    const parts = row.challenge_participants ?? [];
    return {
      challenge: mapChallengeRow(
        row,
        parts.map((p) => p.user_id),
      ),
      participants: parts.flatMap((p) => (p.profiles ? [mapProfileRow(p.profiles)] : [])),
    };
  });
}

export async function createChallenge(input: {
  name: string;
  type: ChallengeType;
  target?: number;
  durationDays: number;
  programId?: string;
  participantIds: string[];
}): Promise<Challenge> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Ikke innlogget.');
  const creatorId = userData.user.id;
  const start = new Date();
  const end = new Date(start.getTime() + input.durationDays * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      creator_id: creatorId,
      name: input.name.trim(),
      type: input.type,
      target: input.target ?? null,
      program_id: input.programId ?? null,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(norskFeil(error));
  const row = data as ChallengeRow;
  const participantIds = Array.from(new Set([creatorId, ...input.participantIds]));
  const { error: participantError } = await supabase
    .from('challenge_participants')
    .insert(participantIds.map((userId) => ({ challenge_id: row.id, user_id: userId })));
  if (participantError) {
    // Rydd opp så det ikke blir liggende en utfordring uten deltakere
    await supabase.from('challenges').delete().eq('id', row.id);
    throw new Error(norskFeil(participantError));
  }
  return mapChallengeRow(row, participantIds);
}

export async function leaveChallenge(challengeId: string, myId: string): Promise<void> {
  const { error } = await supabase
    .from('challenge_participants')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('user_id', myId);
  if (error) throw new Error(norskFeil(error));
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  const { error } = await supabase.from('challenges').delete().eq('id', challengeId);
  if (error) throw new Error(norskFeil(error));
}

interface StandingRow {
  user_id: string;
  workout_count: number;
  volume_kg: number;
  pr_count: number;
  program_count: number;
}

export interface ChallengeStanding {
  userId: string;
  workoutCount: number;
  volumeKg: number;
  prCount: number;
  programCount: number;
}

/** Stillingen i en utfordring via RPC challenge_standings */
export async function fetchStandings(challengeId: string): Promise<ChallengeStanding[]> {
  const { data, error } = await supabase.rpc('challenge_standings', { c_id: challengeId });
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as StandingRow[]).map((row) => ({
    userId: row.user_id,
    workoutCount: Number(row.workout_count),
    volumeKg: Number(row.volume_kg),
    prCount: Number(row.pr_count),
    programCount: Number(row.program_count),
  }));
}
