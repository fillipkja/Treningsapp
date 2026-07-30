// Strenger for exercises-domenet. en er typet mot nb — tsc håndhever synk.

const nb = {
  // Bibliotek og søk
  'exercises.title': 'Øvelser',
  'exercises.searchPlaceholder': 'Søk etter øvelse …',
  'exercises.filterAll': 'Alle',
  'exercises.noResultsTitle': 'Ingen treff',
  'exercises.noResultsMessage': 'Prøv et annet søkeord eller fjern filteret.',
  // Velger
  'exercises.pickerTitle': 'Velg øvelse',
  'exercises.createCustom': 'Lag egen øvelse',
  'exercises.customBadge': 'Egen',
  // Detaljskjerm
  'exercises.howTo': 'Slik gjør du',
  'exercises.deleteTitle': 'Slett øvelse',
  'exercises.deleteMessage': 'Er du sikker på at du vil slette «{name}»?',
  'exercises.deleteErrorTitle': 'Kunne ikke slette øvelsen',
  // Ny øvelse
  'exercises.newTitle': 'Ny øvelse',
  'exercises.nameLabel': 'Navn',
  'exercises.namePlaceholder': 'F.eks. Bulgarsk utfall',
  'exercises.nameRequired': 'Gi øvelsen et navn.',
  'exercises.equipment': 'Utstyr',
  'exercises.category': 'Kategori',
  'exercises.primaryMuscles': 'Primærmuskler (minst én)',
  'exercises.secondaryMuscles': 'Sekundærmuskler (valgfritt)',
  'exercises.missingMuscleTitle': 'Mangler muskelgruppe',
  'exercises.missingMuscleMessage': 'Velg minst én primærmuskel.',
  'exercises.stepPlaceholder': 'Beskriv steget …',
  'exercises.addStep': 'Legg til steg',
  'exercises.tipsOptional': 'Tips (valgfritt)',
  'exercises.tipPlaceholder': 'F.eks. hold ryggen rett …',
  'exercises.addTip': 'Legg til tips',
  'exercises.saveExercise': 'Lagre øvelse',
  'exercises.saveErrorTitle': 'Kunne ikke lagre øvelsen',
} as const;

const en: Record<keyof typeof nb, string> = {
  'exercises.title': 'Exercises',
  'exercises.searchPlaceholder': 'Search for an exercise …',
  'exercises.filterAll': 'All',
  'exercises.noResultsTitle': 'No results',
  'exercises.noResultsMessage': 'Try another search term or clear the filter.',
  'exercises.pickerTitle': 'Choose exercise',
  'exercises.createCustom': 'Create your own exercise',
  'exercises.customBadge': 'Custom',
  'exercises.howTo': 'How to do it',
  'exercises.deleteTitle': 'Delete exercise',
  'exercises.deleteMessage': 'Are you sure you want to delete “{name}”?',
  'exercises.deleteErrorTitle': 'Could not delete the exercise',
  'exercises.newTitle': 'New exercise',
  'exercises.nameLabel': 'Name',
  'exercises.namePlaceholder': 'E.g. Bulgarian split squat',
  'exercises.nameRequired': 'Give the exercise a name.',
  'exercises.equipment': 'Equipment',
  'exercises.category': 'Category',
  'exercises.primaryMuscles': 'Primary muscles (at least one)',
  'exercises.secondaryMuscles': 'Secondary muscles (optional)',
  'exercises.missingMuscleTitle': 'Missing muscle group',
  'exercises.missingMuscleMessage': 'Choose at least one primary muscle.',
  'exercises.stepPlaceholder': 'Describe the step …',
  'exercises.addStep': 'Add step',
  'exercises.tipsOptional': 'Tips (optional)',
  'exercises.tipPlaceholder': 'E.g. keep your back straight …',
  'exercises.addTip': 'Add tip',
  'exercises.saveExercise': 'Save exercise',
  'exercises.saveErrorTitle': 'Could not save the exercise',
};

export const exercisesNb = nb;
export const exercisesEn = en;
