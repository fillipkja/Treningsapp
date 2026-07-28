// API for vennskap og venneforespørsler.
// Konvensjon: alle funksjoner KASTER Error med norsk melding (via norskFeil)
// ved feil — kallere fanger med try/catch og viser meldingen i UI.

import { norskFeil } from '@/lib/api/errors';
import { mapProfileRow, type ProfileRow } from '@/lib/api/mappers';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

interface FriendshipRow {
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  requester: ProfileRow | null;
  addressee: ProfileRow | null;
}

/**
 * Alle relasjoner jeg er del av (RLS filtrerer), delt i venner,
 * innkommende og utgående forespørsler.
 */
export async function fetchFriendState(myId: string): Promise<{
  friends: UserProfile[];
  incoming: UserProfile[];
  outgoing: UserProfile[];
}> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      '*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)',
    );
  if (error) throw new Error(norskFeil(error));
  const friends: UserProfile[] = [];
  const incoming: UserProfile[] = [];
  const outgoing: UserProfile[] = [];
  for (const row of (data ?? []) as FriendshipRow[]) {
    const iAmRequester = row.requester_id === myId;
    const otherRow = iAmRequester ? row.addressee : row.requester;
    if (!otherRow) continue;
    const other = mapProfileRow(otherRow);
    if (row.status === 'accepted') friends.push(other);
    else if (iAmRequester) outgoing.push(other);
    else incoming.push(other);
  }
  return { friends, incoming, outgoing };
}

export async function sendFriendRequest(myId: string, otherId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: myId, addressee_id: otherId, status: 'pending' });
  if (error) throw new Error(norskFeil(error));
}

/** Aksepter forespørsel fra requesterId (kun mottakeren kan iht. RLS) */
export async function acceptFriendRequest(requesterId: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Ikke innlogget.');
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('requester_id', requesterId)
    .eq('addressee_id', userData.user.id);
  if (error) throw new Error(norskFeil(error));
}

/**
 * Fjerner vennskap/forespørsel uansett hvem som sendte den (begge retninger).
 * To separate kall i stedet for et .or()-filter: id-ene kommer bl.a. fra
 * ruteparametere (dyplenker), og strenginterpolasjon i PostgREST-filtre kan
 * endre filterets struktur (komma/parentes i verdien).
 */
export async function removeFriendship(myId: string, otherId: string): Promise<void> {
  const [sent, received] = await Promise.all([
    supabase.from('friendships').delete().eq('requester_id', myId).eq('addressee_id', otherId),
    supabase.from('friendships').delete().eq('requester_id', otherId).eq('addressee_id', myId),
  ]);
  const error = sent.error ?? received.error;
  if (error) throw new Error(norskFeil(error));
}
