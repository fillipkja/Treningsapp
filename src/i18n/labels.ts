// Visningsetiketter for domeneverdier (typene er norske identifikatorer i data/DB).
import type { AppLanguage } from '@/lib/store/settings';
import type {
  BadgeTier,
  ChallengeType,
  Equipment,
  ExerciseCategory,
  MuscleGroup,
  TrainingGoal,
} from '@/types';

const MUSCLE: Record<MuscleGroup, { nb: string; en: string }> = {
  bryst: { nb: 'Bryst', en: 'Chest' },
  rygg: { nb: 'Rygg', en: 'Back' },
  skuldre: { nb: 'Skuldre', en: 'Shoulders' },
  biceps: { nb: 'Biceps', en: 'Biceps' },
  triceps: { nb: 'Triceps', en: 'Triceps' },
  underarmer: { nb: 'Underarmer', en: 'Forearms' },
  mage: { nb: 'Mage', en: 'Abs' },
  quads: { nb: 'Framside lår', en: 'Quads' },
  hamstrings: { nb: 'Bakside lår', en: 'Hamstrings' },
  setemuskler: { nb: 'Setemuskler', en: 'Glutes' },
  legger: { nb: 'Legger', en: 'Calves' },
  korsrygg: { nb: 'Korsrygg', en: 'Lower back' },
  helkropp: { nb: 'Helkropp', en: 'Full body' },
};

const EQUIPMENT: Record<Equipment, { nb: string; en: string }> = {
  stang: { nb: 'Stang', en: 'Barbell' },
  manualer: { nb: 'Manualer', en: 'Dumbbells' },
  maskin: { nb: 'Maskin', en: 'Machine' },
  kabel: { nb: 'Kabel', en: 'Cable' },
  kroppsvekt: { nb: 'Kroppsvekt', en: 'Bodyweight' },
  kettlebell: { nb: 'Kettlebell', en: 'Kettlebell' },
  strikk: { nb: 'Strikk', en: 'Bands' },
  annet: { nb: 'Annet', en: 'Other' },
};

const CATEGORY: Record<ExerciseCategory, { nb: string; en: string }> = {
  styrke: { nb: 'Styrke', en: 'Strength' },
  kondisjon: { nb: 'Kondisjon', en: 'Cardio' },
  mobilitet: { nb: 'Mobilitet', en: 'Mobility' },
};

const GOAL: Record<TrainingGoal, { nb: string; en: string }> = {
  styrke: { nb: 'Styrke', en: 'Strength' },
  muskelvekst: { nb: 'Muskelvekst', en: 'Muscle growth' },
  utholdenhet: { nb: 'Utholdenhet', en: 'Endurance' },
  helse: { nb: 'Helse', en: 'Health' },
};

const CHALLENGE_TYPE: Record<ChallengeType, { nb: string; en: string }> = {
  økter: { nb: 'Flest økter', en: 'Most workouts' },
  volum: { nb: 'Høyest volum', en: 'Highest volume' },
  prs: { nb: 'Flest rekorder', en: 'Most records' },
  program: { nb: 'Fullfør program', en: 'Complete a program' },
};

const TIER: Record<BadgeTier, { nb: string; en: string }> = {
  bronse: { nb: 'Bronse', en: 'Bronze' },
  sølv: { nb: 'Sølv', en: 'Silver' },
  gull: { nb: 'Gull', en: 'Gold' },
};

export const muscleLabel = (m: MuscleGroup, lang: AppLanguage) => MUSCLE[m][lang];
export const equipmentLabel = (e: Equipment, lang: AppLanguage) => EQUIPMENT[e][lang];
export const categoryLabel = (c: ExerciseCategory, lang: AppLanguage) => CATEGORY[c][lang];
export const goalLabel = (g: TrainingGoal, lang: AppLanguage) => GOAL[g][lang];
export const challengeTypeLabel = (c: ChallengeType, lang: AppLanguage) => CHALLENGE_TYPE[c][lang];
export const tierLabel = (t: BadgeTier, lang: AppLanguage) => TIER[t][lang];

export const ALL_MUSCLES = Object.keys(MUSCLE) as MuscleGroup[];
export const ALL_EQUIPMENT = Object.keys(EQUIPMENT) as Equipment[];
export const ALL_CATEGORIES = Object.keys(CATEGORY) as ExerciseCategory[];
