import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { norskFeil } from '@/lib/api/errors';
import { supabase } from '@/lib/supabase';
import type { Gender, TrainingGoal, UserProfile } from '@/types';

interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_url: string | null;
  avatar_icon: string | null;
  goal: TrainingGoal | null;
  bio: string | null;
  share_workouts: boolean;
  created_at: string;
}

/** Rad fra public.profile_private — kun egen bruker kan lese denne (RLS) */
interface ProfilePrivateRow {
  height_cm: number | null;
  weight_kg: number | null;
  gender: Gender | null;
}

/**
 * Mapper en profilrad. Kroppsdata (høyde/vekt) ligger i public.profile_private
 * og er bare tilgjengelig for brukeren selv — derfor er `priv` valgfri, og
 * andres profiler får aldri disse feltene satt.
 */
export function mapProfile(row: ProfileRow, priv?: ProfilePrivateRow | null): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    avatarColor: row.avatar_color,
    avatarUri: row.avatar_url ?? undefined,
    avatarIcon: row.avatar_icon ?? undefined,
    heightCm: priv?.height_cm ?? undefined,
    weightKg: priv?.weight_kg ?? undefined,
    gender: priv?.gender ?? undefined,
    goal: row.goal ?? undefined,
    bio: row.bio ?? undefined,
    shareWorkouts: row.share_workouts,
    createdAt: row.created_at,
  };
}

/** Maks lengde på display_name — speiler check-constraint i 0001_init.sql */
const DISPLAY_NAME_MAX = 40;

/** Felter som kan oppdateres på egen profil. null nullstiller kolonnen. */
export interface ProfilePatch {
  username?: string;
  displayName?: string;
  avatarColor?: string;
  avatarUri?: string | null;
  avatarIcon?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  gender?: Gender | null;
  goal?: TrainingGoal | null;
  bio?: string | null;
  shareWorkouts?: boolean;
}

export type AuthStatus = 'loading' | 'signedOut' | 'needsOnboarding' | 'ready';

interface AuthState {
  session: Session | null;
  /** Min profil (null før onboarding er fullført) */
  user: UserProfile | null;
  status: AuthStatus;

  /** Kalles én gang fra rot-layouten */
  init: () => void;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  completeOnboarding: (profile: {
    username: string;
    displayName: string;
    avatarColor: string;
    avatarUri?: string;
    heightCm?: number;
    weightKg?: number;
    gender?: Gender;
    goal?: TrainingGoal;
  }) => Promise<{ error?: string }>;
  updateProfile: (patch: ProfilePatch) => Promise<{ error?: string }>;
}

let initialized = false;

async function loadProfile(userId: string): Promise<UserProfile | null> {
  const [profile, priv] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('profile_private')
      .select('height_cm, weight_kg, gender')
      .eq('id', userId)
      .maybeSingle(),
  ]);
  if (profile.error || !profile.data) return null;
  // Kroppsdata er valgfrie: feil/manglende rad skal ikke stoppe innlogging
  return mapProfile(profile.data as ProfileRow, (priv.data as ProfilePrivateRow | null) ?? null);
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  session: null,
  user: null,
  status: 'loading',

  init: () => {
    if (initialized) return;
    initialized = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const session = data.session;
        if (!session) {
          set({ session: null, user: null, status: 'signedOut' });
          return;
        }
        const user = await loadProfile(session.user.id);
        set({ session, user, status: user ? 'ready' : 'needsOnboarding' });
      })
      .catch(() => set({ session: null, user: null, status: 'signedOut' }));

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ session: null, user: null, status: 'signedOut' });
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const current = get();
        // Unngå unødig profil-lasting ved ren token-refresh
        if (current.user && current.session?.user.id === session.user.id) {
          set({ session });
          return;
        }
        const user = await loadProfile(session.user.id);
        set({ session, user, status: user ? 'ready' : 'needsOnboarding' });
      }
    });
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error: norskFeil(error) };
    // Uten aktiv sesjon krever prosjektet e-postbekreftelse
    if (!data.session) return { needsEmailConfirm: true };
    set({ session: data.session, status: 'needsOnboarding' });
    return {};
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { error: norskFeil(error) };
    const user = await loadProfile(data.session.user.id);
    set({ session: data.session, user, status: user ? 'ready' : 'needsOnboarding' });
    return {};
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, status: 'signedOut' });
  },

  completeOnboarding: async (profile) => {
    const session = get().session;
    if (!session) return { error: 'Ikke innlogget.' };
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: session.user.id,
        username: profile.username.trim().toLowerCase(),
        display_name: (profile.displayName.trim() || profile.username.trim()).slice(
          0,
          DISPLAY_NAME_MAX,
        ),
        avatar_color: profile.avatarColor,
        avatar_url: profile.avatarUri ?? null,
        goal: profile.goal ?? null,
      })
      .select()
      .single();
    if (error) return { error: norskFeil(error) };
    // Kroppsdata ligger i egen tabell som bare eieren kan lese
    let priv: ProfilePrivateRow | null = null;
    if (
      profile.heightCm !== undefined ||
      profile.weightKg !== undefined ||
      profile.gender !== undefined
    ) {
      const { data: privData, error: privError } = await supabase
        .from('profile_private')
        .upsert({
          id: session.user.id,
          height_cm: profile.heightCm ?? null,
          weight_kg: profile.weightKg ?? null,
          gender: profile.gender ?? null,
          updated_at: new Date().toISOString(),
        })
        .select('height_cm, weight_kg, gender')
        .single();
      if (privError) return { error: norskFeil(privError) };
      priv = privData as ProfilePrivateRow;
    }
    set({ user: mapProfile(data as ProfileRow, priv), status: 'ready' });
    return {};
  },

  updateProfile: async (patch) => {
    const user = get().user;
    if (!user) return { error: 'Ikke innlogget.' };
    const row: Record<string, unknown> = {};
    if (patch.username !== undefined) row.username = patch.username.trim().toLowerCase();
    // Visningsnavnet vises i varsler hos andre: trim og kutt til grensen i skjemaet
    if (patch.displayName !== undefined)
      row.display_name = patch.displayName.trim().slice(0, DISPLAY_NAME_MAX);
    if (patch.avatarColor !== undefined) row.avatar_color = patch.avatarColor;
    if (patch.avatarUri !== undefined) row.avatar_url = patch.avatarUri ?? null;
    if (patch.avatarIcon !== undefined) row.avatar_icon = patch.avatarIcon ?? null;
    if (patch.goal !== undefined) row.goal = patch.goal ?? null;
    if (patch.bio !== undefined) row.bio = patch.bio ?? null;
    if (patch.shareWorkouts !== undefined) row.share_workouts = patch.shareWorkouts;

    let profileRow: ProfileRow | null = null;
    if (Object.keys(row).length > 0) {
      const { data, error } = await supabase
        .from('profiles')
        .update(row)
        .eq('id', user.id)
        .select()
        .single();
      if (error) return { error: norskFeil(error) };
      profileRow = data as ProfileRow;
    }

    // Høyde/vekt/kjønn i egen privat tabell. null nullstiller kolonnen.
    let priv: ProfilePrivateRow | null = {
      height_cm: user.heightCm ?? null,
      weight_kg: user.weightKg ?? null,
      gender: user.gender ?? null,
    };
    if (
      patch.heightCm !== undefined ||
      patch.weightKg !== undefined ||
      patch.gender !== undefined
    ) {
      const { data, error } = await supabase
        .from('profile_private')
        .upsert({
          id: user.id,
          height_cm: patch.heightCm !== undefined ? patch.heightCm : (user.heightCm ?? null),
          weight_kg: patch.weightKg !== undefined ? patch.weightKg : (user.weightKg ?? null),
          gender: patch.gender !== undefined ? patch.gender : (user.gender ?? null),
          updated_at: new Date().toISOString(),
        })
        .select('height_cm, weight_kg, gender')
        .single();
      if (error) return { error: norskFeil(error) };
      priv = data as ProfilePrivateRow;
    }

    set({
      user: profileRow
        ? mapProfile(profileRow, priv)
        : {
            ...user,
            heightCm: priv.height_cm ?? undefined,
            weightKg: priv.weight_kg ?? undefined,
            gender: priv.gender ?? undefined,
          },
    });
    return {};
  },
}));
