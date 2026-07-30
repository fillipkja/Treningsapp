// Opplasting av profilbilder til storage-bøtta «avatars».
// Konvensjon: alle funksjoner KASTER Error med norsk melding (via norskFeil)
// ved feil — kallere fanger med try/catch og viser meldingen i UI.

import { norskFeil } from '@/lib/api/errors';
import { supabase } from '@/lib/supabase';

/** Base64 → bytes uten ekstra avhengigheter (atob finnes i Hermes og på web) */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function extensionFor(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * Laster opp et profilbilde og returnerer offentlig https-URL (kravet i
 * avatar_url-constrainten). Nytt filnavn per opplasting slik at expo-image
 * sin URL-cache aldri viser et utdatert bilde.
 */
export async function uploadAvatarImage(
  userId: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const path = `${userId}/${Date.now().toString(36)}.${extensionFor(mimeType)}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, base64ToBytes(base64), { contentType: mimeType, upsert: false });
  if (error) throw new Error(norskFeil(error));
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

/**
 * Rydder bort gamle bilder i brukerens mappe. Beste forsøk — feil svelges,
 * for et foreldreløst bilde er bare litt bortkastet lagring.
 */
export async function removeOtherAvatarImages(userId: string, keepUrl?: string): Promise<void> {
  try {
    const { data } = await supabase.storage.from('avatars').list(userId);
    const stale = (data ?? [])
      .map((file) => `${userId}/${file.name}`)
      .filter((path) => !keepUrl || !keepUrl.endsWith(path));
    if (stale.length > 0) await supabase.storage.from('avatars').remove(stale);
  } catch {
    // Ignoreres bevisst
  }
}
