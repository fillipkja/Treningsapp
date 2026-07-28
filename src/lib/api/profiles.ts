// API for profiloppslag.
// Konvensjon: alle funksjoner KASTER Error med norsk melding (via norskFeil)
// ved feil — kallere fanger med try/catch og viser meldingen i UI.

import { norskFeil } from '@/lib/api/errors';
import { mapProfileRow, type ProfileRow } from '@/lib/api/mappers';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

/** Eksakt (case-insensitivt) brukernavnsøk via RPC. null hvis ingen treff. */
export async function searchByUsername(q: string): Promise<UserProfile | null> {
  const query = q.trim();
  if (!query) return null;
  const { data, error } = await supabase.rpc('find_profile_by_username', { q: query });
  if (error) throw new Error(norskFeil(error));
  const rows = (data ?? []) as ProfileRow[];
  return rows.length > 0 ? mapProfileRow(rows[0]) : null;
}

/** Henter profiler for en liste bruker-id-er, som Map fra id til profil */
export async function fetchProfilesByIds(ids: string[]): Promise<Map<string, UserProfile>> {
  const result = new Map<string, UserProfile>();
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return result;
  const { data, error } = await supabase.from('profiles').select('*').in('id', unique);
  if (error) throw new Error(norskFeil(error));
  for (const row of (data ?? []) as ProfileRow[]) {
    result.set(row.id, mapProfileRow(row));
  }
  return result;
}
