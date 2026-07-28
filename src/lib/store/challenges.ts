import { create } from 'zustand';
import {
  createChallenge as apiCreateChallenge,
  deleteChallenge as apiDeleteChallenge,
  fetchMyChallenges,
  leaveChallenge as apiLeaveChallenge,
} from '@/lib/api/challenges';
import { useAuthStore } from './auth';
import type { Challenge, ChallengeType, UserProfile } from '@/types';

export interface ChallengeItem {
  challenge: Challenge;
  participants: UserProfile[];
}

interface ChallengeState {
  items: ChallengeItem[];
  loaded: boolean;
  loading: boolean;

  /** Henter utfordringene mine (med deltakerprofiler) fra serveren */
  load: () => Promise<void>;
  createChallenge: (input: {
    name: string;
    type: ChallengeType;
    target?: number;
    durationDays: number;
    programId?: string;
    participantIds: string[];
  }) => Promise<Challenge>;
  leaveChallenge: (challengeId: string) => Promise<void>;
  deleteChallenge: (challengeId: string) => Promise<void>;
}

export const useChallengeStore = create<ChallengeState>()((set, get) => ({
  items: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const items = await fetchMyChallenges();
      set({ items, loaded: true, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  createChallenge: async (input) => {
    const challenge = await apiCreateChallenge(input);
    // Hent listen på nytt så deltakerprofilene er komplette
    try {
      const items = await fetchMyChallenges();
      set({ items, loaded: true });
    } catch {
      // Utfordringen er opprettet — vis den i det minste med min egen profil
      const me = useAuthStore.getState().user;
      set((s) => ({
        items: [{ challenge, participants: me ? [me] : [] }, ...s.items],
      }));
    }
    return challenge;
  },

  leaveChallenge: async (challengeId) => {
    const myId = useAuthStore.getState().user!.id;
    await apiLeaveChallenge(challengeId, myId);
    set((s) => ({ items: s.items.filter((it) => it.challenge.id !== challengeId) }));
  },

  deleteChallenge: async (challengeId) => {
    await apiDeleteChallenge(challengeId);
    set((s) => ({ items: s.items.filter((it) => it.challenge.id !== challengeId) }));
  },
}));
