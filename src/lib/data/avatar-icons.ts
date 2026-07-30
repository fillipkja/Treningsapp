import type { Ionicons } from '@expo/vector-icons';

/**
 * Kuraterte Ionicons-navn brukeren kan velge som avatar i stedet for initialer.
 * Typet mot glyphMap slik at tsc feiler på ugyldige ikonnavn. Navnene lagres i
 * profiles.avatar_icon og må derfor holde seg innenfor ^[a-z0-9-]{1,40}$.
 */
export const avatarIcons = [
  'barbell',
  'fitness',
  'flash',
  'flame',
  'rocket',
  'trophy',
  'medal',
  'star',
  'heart',
  'paw',
  'planet',
  'leaf',
  'water',
  'snow',
  'football',
  'basketball',
  'bicycle',
  'diamond',
] as const satisfies readonly (keyof typeof Ionicons.glyphMap)[];

export type AvatarIcon = (typeof avatarIcons)[number];

/** Kun ikoner fra listen slippes gjennom til Ionicons (DB-verdien kan i teorien være noe annet) */
export function isAvatarIcon(name: string | undefined): name is AvatarIcon {
  return name != null && (avatarIcons as readonly string[]).includes(name);
}
