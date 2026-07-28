function storForbokstav(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Oversett vanlige Supabase-feil til norsk for visning i UI */
export function norskFeil(error: { message?: string; code?: string } | null | undefined): string {
  const msg = error?.message ?? '';
  const code = error?.code ?? '';
  // P0001 = raise exception fra våre egne triggere — meldingene er norske og
  // skrevet for brukeren (se supabase/migrations/0001_init.sql)
  if (code === 'P0001' && msg) return storForbokstav(msg);
  if (msg.includes('Invalid login credentials')) return 'Feil e-post eller passord.';
  if (msg.includes('User already registered')) return 'Det finnes allerede en konto med denne e-posten.';
  if (msg.includes('Password should be at least')) return 'Passordet må ha minst 6 tegn.';
  if (msg.includes('Unable to validate email address') || msg.includes('invalid format'))
    return 'Skriv inn en gyldig e-postadresse.';
  if (msg.includes('Email not confirmed')) return 'Bekreft e-posten din via lenken vi sendte deg.';
  if (msg.includes('rate limit') || msg.includes('Too many requests') || code === 'over_request_rate_limit')
    return 'For mange forsøk — vent litt og prøv igjen.';
  if (code === '23505' || msg.includes('duplicate key')) {
    if (msg.includes('profiles_username')) return 'Brukernavnet er opptatt.';
    if (msg.includes('friendships_pair')) return 'Dere har allerede en venneforespørsel.';
    return 'Dette finnes allerede.';
  }
  if (code === '23514' && msg.includes('username_format'))
    return 'Brukernavn: 3–24 tegn, kun små bokstaver, tall, punktum og understrek.';
  if (code === '23514') return 'Noen av verdiene er ikke gyldige. Sjekk feltene og prøv igjen.';
  if (msg.includes('Failed to fetch') || msg.includes('Network'))
    return 'Fikk ikke kontakt med serveren — sjekk nettforbindelsen.';
  // 42501 / RLS: ikke vis policy- eller kolonnenavn til brukeren
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied'))
    return 'Du har ikke tilgang til dette.';
  // Ukjente feil: generisk melding. Rå Postgres/PostgREST-tekst avslører
  // interne detaljer (policy-, constraint- og kolonnenavn) og skal ikke i UI.
  return 'Noe gikk galt. Prøv igjen.';
}
