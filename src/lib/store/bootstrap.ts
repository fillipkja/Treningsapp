import { useEffect } from 'react';
import { useAuthStore } from './auth';
import { useChallengeStore } from './challenges';
import { useExerciseStore } from './exercises';
import { useNotificationStore } from './notifications';
import { useProgramStore } from './programs';
import { useWorkoutStore } from './workouts';

// Laster alle server-backede stores når brukeren er innlogget og klar.
// Feil svelges her (Promise.allSettled) og lastingen forsøkes ikke igjen —
// hver skjerm må derfor selv vise en feiltilstand med «Prøv igjen» som kaller
// sin egen store.load() (se f.eks. trening.tsx og statistikk.tsx).

/** Hvilken bruker dataene i storene tilhører (null = ingen lastet) */
let loadedForUserId: string | null = null;

function allStores() {
  return [
    useWorkoutStore,
    useProgramStore,
    useExerciseStore,
    useNotificationStore,
    useChallengeStore,
  ] as const;
}

/** Last alle stores på nytt fra serveren (pull-to-refresh) */
export async function refreshAll(): Promise<void> {
  await Promise.allSettled(allStores().map((store) => store.getState().load()));
}

function resetStores(): void {
  useWorkoutStore.setState({
    workouts: [],
    prs: [],
    earnedBadges: [],
    active: null,
    loaded: false,
    loading: false,
  });
  useProgramStore.setState({ programs: [], templates: [], loaded: false, loading: false });
  useExerciseStore.setState({ customExercises: [], loaded: false, loading: false });
  useNotificationStore.setState({ notifications: [], loaded: false, loading: false });
  useChallengeStore.setState({ items: [], loaded: false, loading: false });
}

/** Kalles fra (tabs)/_layout: laster alt når auth-status blir 'ready' */
export function useBootstrapData(): void {
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (status === 'signedOut' && loadedForUserId) {
      // Nullstill så neste innlogging (evt. annen bruker) ikke ser gamle data
      loadedForUserId = null;
      resetStores();
      return;
    }
    if (status !== 'ready' || !userId || loadedForUserId === userId) return;
    if (loadedForUserId && loadedForUserId !== userId) resetStores();
    loadedForUserId = userId;
    void Promise.allSettled(
      allStores()
        .map((store) => store.getState())
        .filter((s) => !s.loaded && !s.loading)
        .map((s) => s.load()),
    );
  }, [status, userId]);
}
