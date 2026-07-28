import { t } from '@/i18n';

function storForbokstav(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Oversett vanlige Supabase-feil til brukervennlig melding på aktivt språk
 * (via error.*-nøklene i common-domenet).
 */
export function apiError(error: { message?: string; code?: string } | null | undefined): string {
  const msg = error?.message ?? '';
  const code = error?.code ?? '';
  // P0001 = raise exception fra våre egne triggere — meldingene er norske og
  // skrevet for brukeren (se supabase/migrations/0001_init.sql)
  if (code === 'P0001' && msg) return storForbokstav(msg);
  if (msg.includes('Invalid login credentials')) return t('error.wrongCredentials');
  if (msg.includes('User already registered')) return t('error.emailInUse');
  if (msg.includes('Password should be at least')) return t('error.passwordTooShort');
  if (msg.includes('Unable to validate email address') || msg.includes('invalid format'))
    return t('error.invalidEmail');
  if (msg.includes('Email not confirmed')) return t('error.emailNotConfirmed');
  if (msg.includes('rate limit') || msg.includes('Too many requests') || code === 'over_request_rate_limit')
    return t('error.rateLimit');
  if (code === '23505' || msg.includes('duplicate key')) {
    if (msg.includes('profiles_username')) return t('error.usernameTaken');
    if (msg.includes('friendships_pair')) return t('error.friendshipExists');
    return t('error.duplicate');
  }
  if (code === '23514' && msg.includes('username_format')) return t('error.usernameFormat');
  if (code === '23514') return t('error.invalidValues');
  if (msg.includes('Failed to fetch') || msg.includes('Network')) return t('error.network');
  // 42501 / RLS: ikke vis policy- eller kolonnenavn til brukeren
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied'))
    return t('error.noAccess');
  // Ukjente feil: generisk melding. Rå Postgres/PostgREST-tekst avslører
  // interne detaljer (policy-, constraint- og kolonnenavn) og skal ikke i UI.
  return t('error.generic');
}

/** @deprecated Alias for apiError — beholdt for eksisterende kallsteder. */
export const norskFeil = apiError;
