// Domenemodell for hele appen. Alle datoer er ISO-strenger (UTC).

export type MuscleGroup =
  | 'bryst'
  | 'rygg'
  | 'skuldre'
  | 'biceps'
  | 'triceps'
  | 'underarmer'
  | 'mage'
  | 'quads'
  | 'hamstrings'
  | 'setemuskler'
  | 'legger'
  | 'korsrygg'
  | 'helkropp';

export type Equipment =
  | 'stang'
  | 'manualer'
  | 'maskin'
  | 'kabel'
  | 'kroppsvekt'
  | 'kettlebell'
  | 'strikk'
  | 'annet';

export type ExerciseCategory = 'styrke' | 'kondisjon' | 'mobilitet';

export interface Exercise {
  id: string;
  name: string;
  englishName?: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  category: ExerciseCategory;
  instructions: string[];
  tips?: string[];
  /** @deprecated Erstattet av fargede øvelsesfliser (ExerciseTile). Beholdes for gamle egendefinerte øvelser i DB. */
  mediaEmoji?: string;
  isCustom?: boolean;
}

export interface WorkoutSet {
  id: string;
  reps: number;
  weightKg: number;
  /** RPE 6–10 i 0,5-steg */
  rpe?: number;
  isWarmup?: boolean;
  /** Settes ved fullføring av økt hvis settet ga ny personlig rekord */
  isPR?: boolean;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface WorkoutComment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface Workout {
  id: string;
  userId: string;
  name: string;
  /** Datoen økten gjelder for (ISO) */
  date: string;
  startedAt?: string;
  durationMin?: number;
  exercises: WorkoutExercise[];
  notes?: string;
  /** Om økten deles med venner i feeden */
  isShared: boolean;
  programId?: string;
  templateId?: string;
  totalVolumeKg: number;
  totalSets: number;
  prCount: number;
  likes: string[];
  comments: WorkoutComment[];
}

/** Pågående økt før den lagres som Workout */
export interface ActiveWorkout {
  name: string;
  startedAt: string;
  exercises: WorkoutExercise[];
  programId?: string;
  templateId?: string;
  notes?: string;
}

export interface PRHistoryPoint {
  date: string;
  weightKg: number;
  reps: number;
  est1RM: number;
}

/** Personlige rekorder per øvelse, med historikk for grafer */
export interface ExercisePR {
  exerciseId: string;
  bestWeightKg: number;
  bestEst1RM: number;
  bestReps: number;
  bestSetVolumeKg: number;
  updatedAt: string;
  history: PRHistoryPoint[];
}

export type TrainingGoal = 'styrke' | 'muskelvekst' | 'utholdenhet' | 'helse';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  /** Bakgrunnsfarge for initial-avatar når avatarUri mangler */
  avatarColor: string;
  avatarUri?: string;
  heightCm?: number;
  weightKg?: number;
  goal?: TrainingGoal;
  bio?: string;
  /** Om egne økter deles med venner */
  shareWorkouts: boolean;
  createdAt: string;
}

export type AuthProvider = 'epost' | 'google' | 'apple';

export interface TemplateExercise {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax?: number;
  note?: string;
}

/** Favorittøkt/mal som kan startes direkte */
export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  isFavorite: boolean;
  createdAt: string;
}

export interface ProgramDay {
  id: string;
  name: string;
  exercises: TemplateExercise[];
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  days: ProgramDay[];
  isFavorite: boolean;
  createdAt: string;
}

export type ChallengeType = 'økter' | 'volum' | 'prs' | 'program';

export interface Challenge {
  id: string;
  name: string;
  type: ChallengeType;
  startDate: string;
  endDate: string;
  creatorId: string;
  participants: string[];
  /** Målverdi for solo-utfordringer (antall økter, kg volum eller antall PR-er) */
  target?: number;
  /** Kun for type 'program' */
  programId?: string;
}

export type BadgeTier = 'bronse' | 'sølv' | 'gull';

export interface BadgeDef {
  id: string;
  /** Ionicons-navn (f.eks. 'trophy'). Navn/beskrivelse hentes fra i18n via badgeName/badgeDescription. */
  icon: string;
  tier: BadgeTier;
}

export interface EarnedBadge {
  badgeId: string;
  earnedAt: string;
}

export type NotificationType =
  | 'venn_pr'
  | 'venn_økt'
  | 'like'
  | 'kommentar'
  | 'venneforespørsel'
  | 'utfordring'
  | 'badge'
  | 'påminnelse';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** Ekstra kontekst for navigasjon, f.eks. workoutId eller userId */
  refId?: string;
}

export interface LeaderboardEntry {
  userId: string;
  points: number;
  workouts: number;
  volumeKg: number;
  prs: number;
  rank: number;
}

export type Period = 'uke' | 'måned';
