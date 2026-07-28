import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { uid } from '@/lib/ids';
import { useNotificationStore } from './notifications';
import type { Challenge, ChallengeType } from '@/types';

interface ChallengeState {
  challenges: Challenge[];
  createChallenge: (input: {
    name: string;
    type: ChallengeType;
    target?: number;
    durationDays: number;
    programId?: string;
    creatorId: string;
  }) => Challenge;
  leaveChallenge: (challengeId: string, userId: string) => void;
  deleteChallenge: (challengeId: string) => void;
}

export const useChallengeStore = create<ChallengeState>()(
  persist(
    (set) => ({
      challenges: [],
      createChallenge: ({ name, type, target, durationDays, programId, creatorId }) => {
        const start = new Date();
        const challenge: Challenge = {
          id: uid('ch'),
          name,
          type,
          startDate: start.toISOString(),
          endDate: addDays(start, durationDays).toISOString(),
          creatorId,
          participants: [creatorId],
          target,
          programId,
        };
        set((s) => ({ challenges: [challenge, ...s.challenges] }));
        useNotificationStore.getState().add({
          type: 'utfordring',
          title: 'Utfordring startet! 🎯',
          body: `«${name}» er i gang — lykke til!`,
          refId: challenge.id,
        });
        return challenge;
      },
      leaveChallenge: (challengeId, userId) =>
        set((s) => ({
          challenges: s.challenges.map((c) =>
            c.id === challengeId
              ? { ...c, participants: c.participants.filter((p) => p !== userId) }
              : c,
          ),
        })),
      deleteChallenge: (challengeId) =>
        set((s) => ({ challenges: s.challenges.filter((c) => c.id !== challengeId) })),
    }),
    { name: 'challenges', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
