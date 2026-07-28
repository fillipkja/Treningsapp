// Strenger for home-domenet. en er typet mot nb — tsc håndhever synk.

const nb = {
  'home.title': 'Hjem',
  'home.greeting': 'Hei, {name}',
  'home.latestWorkouts': 'Siste økter',
  'home.activeWorkout': 'Økt pågår — fortsett',
  'home.activeWorkoutFallback': 'Treningsøkt',
  'home.likeFailed': 'Kunne ikke oppdatere like',
  'home.emptyTitle': 'Start din første økt',
  'home.emptyMessage': 'Øktene dine — og venners delte økter — dukker opp her.',
  'home.emptyAction': 'Start økt',
  'home.moreExercises': '+{count} til',
  'home.unknownExercise': 'Ukjent øvelse',
  // Opplasting av lokale data fra gammel versjon
  'home.legacyTitle': 'Økter lagret på denne enheten',
  'home.legacyMessage': 'Du har økter lagret lokalt fra før — vil du laste dem opp til kontoen din?',
  'home.legacyUpload': 'Last opp',
  'home.legacyDismiss': 'Avvis',
  'home.legacyDoneTitle': 'Opplasting fullført',
  'home.legacyDoneOne': '1 økt ble lastet opp til kontoen din.',
  'home.legacyDoneMany': '{count} økter ble lastet opp til kontoen din.',
  'home.legacyFailedTitle': 'Opplastingen feilet',
} as const;

const en: Record<keyof typeof nb, string> = {
  'home.title': 'Home',
  'home.greeting': 'Hi, {name}',
  'home.latestWorkouts': 'Recent workouts',
  'home.activeWorkout': 'Workout in progress — continue',
  'home.activeWorkoutFallback': 'Workout',
  'home.likeFailed': 'Could not update like',
  'home.emptyTitle': 'Start your first workout',
  'home.emptyMessage': 'Your workouts — and workouts shared by friends — show up here.',
  'home.emptyAction': 'Start workout',
  'home.moreExercises': '+{count} more',
  'home.unknownExercise': 'Unknown exercise',
  'home.legacyTitle': 'Workouts saved on this device',
  'home.legacyMessage': 'You have workouts saved locally from before — upload them to your account?',
  'home.legacyUpload': 'Upload',
  'home.legacyDismiss': 'Dismiss',
  'home.legacyDoneTitle': 'Upload complete',
  'home.legacyDoneOne': '1 workout was uploaded to your account.',
  'home.legacyDoneMany': '{count} workouts were uploaded to your account.',
  'home.legacyFailedTitle': 'Upload failed',
};

export const homeNb = nb;
export const homeEn = en;
