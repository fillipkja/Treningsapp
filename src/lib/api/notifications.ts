// API for varsler. Klienter kan IKKE opprette varsler — det gjør
// SECURITY DEFINER-triggere på serveren (se supabase/migrations/0001_init.sql).
// Konvensjon: alle funksjoner KASTER Error med norsk melding (via norskFeil)
// ved feil — kallere fanger med try/catch og viser meldingen i UI.

import { norskFeil } from '@/lib/api/errors';
import { supabase } from '@/lib/supabase';
import type { AppNotification, NotificationType } from '@/types';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  ref_id: string | null;
  read: boolean;
  created_at: string;
}

function mapNotificationRow(row: NotificationRow): AppNotification {
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
  };
}

/** Mine varsler, nyeste først (RLS filtrerer til egen bruker) */
export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
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
