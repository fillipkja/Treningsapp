import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { uid } from '@/lib/ids';
import { avatarColors } from '@/theme';
import type { AuthProvider, UserProfile } from '@/types';

interface AuthState {
  user: UserProfile | null;
  /** Om profiloppsettet (brukernavn, mål osv.) er fullført */
  isOnboarded: boolean;
  provider: AuthProvider | null;
  /**
   * Demo-innlogging: oppretter/åpner lokal konto. I produksjon byttes dette
   * mot ekte auth (Supabase/Firebase) — resten av appen er uavhengig av det.
   */
  signIn: (provider: AuthProvider, email?: string) => void;
  completeOnboarding: (profile: Partial<UserProfile> & { username: string }) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isOnboarded: false,
      provider: null,
      signIn: (provider, email) => {
        if (get().user) {
          set({ provider });
          return;
        }
        const suggested = email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9._]/g, '') ?? '';
        set({
          provider,
          user: {
            id: uid('user'),
            username: suggested,
            displayName: '',
            avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
            shareWorkouts: true,
            createdAt: new Date().toISOString(),
          },
        });
      },
      completeOnboarding: (profile) => {
        const user = get().user;
        if (!user) return;
        set({
          isOnboarded: true,
          user: {
            ...user,
            ...profile,
            displayName: profile.displayName?.trim() || profile.username,
          },
        });
      },
      updateProfile: (patch) => {
        const user = get().user;
        if (!user) return;
        set({ user: { ...user, ...patch } });
      },
      signOut: () => set({ user: null, isOnboarded: false, provider: null }),
    }),
    { name: 'auth', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
