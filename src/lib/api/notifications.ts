// API for varsler. Klienter kan IKKE opprette varsler — det gjør
// SECURITY DEFINER-triggere på serveren (se supabase/migrations/0001_init.sql).
// Konvensjon: alle funksjoner KASTER Error med norsk melding (via norskFeil)
// ved feil — kallere fanger med try/catch og viser meldingen i UI.

import { norskFeil } from '@/lib/api/errors';
import { mapProfileRow, type ProfileRow } from '@/lib/api/mappers';
import { supabase } from '@/lib/supabase';
import type { AppNotification, NotificationType, UserProfile } from '@/types';

/**
 * Varsel med innebygd aktørprofil (hvem som utløste varselet). Brukes til å
 * komponere lokalisert varseltekst klientside; lagret title/body er fallback
 * for gamle varsler og ukjente typer.
 */
export type NotificationWithActor = AppNotification & { actor?: UserProfile };

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  ref_id: string | null;
  read: boolean;
  created_at: string;
  /** Fylles av .select('*, actor:profiles!notifications_actor_id_fkey(*)') */
  actor?: ProfileRow | null;
}

function mapNotificationRow(row: NotificationRow): NotificationWithActor {
  return {
    id: row.id,
    // Databasen har også typen 'venn_akseptert' som ikke finnes i domenetypen;
    // UI-et må håndtere ukjente typer med en standardvisning.
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: row.read,
    refId: row.ref_id ?? undefined,
    actor: row.actor ? mapProfileRow(row.actor) : undefined,
  };
}

/** Mine varsler med aktørprofil, nyeste først (RLS filtrerer til egen bruker) */
export async function fetchNotifications(): Promise<NotificationWithActor[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(*)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(norskFeil(error));
  return ((data ?? []) as NotificationRow[]).map(mapNotificationRow);
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw new Error(norskFeil(error));
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw new Error(norskFeil(error));
}
