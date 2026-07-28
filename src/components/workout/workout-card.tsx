import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { AppText, Card } from '@/components/ui';
import { formatDuration, formatKg, formatTimeAgo, formatVolume } from '@/lib/format';
import { getExerciseById } from '@/lib/store/exercises';
import { useTheme } from '@/theme';
import type { Workout, WorkoutExercise } from '@/types';

interface WorkoutCardProps {
  workout: Workout;
  onPress?: () => void;
}

const MAX_EXERCISE_LINES = 3;

/** Tyngste fullførte arbeidssett i en øvelse (fallback: tyngste sett uansett) */
function heaviestSet(exercise: WorkoutExercise) {
  const working = exercise.sets.filter((s) => s.completed && !s.isWarmup);
  const pool = working.length > 0 ? working : exercise.sets;
  if (pool.length === 0) return undefined;
  return pool.reduce((best, s) => (s.weightKg > best.weightKg ? s : best), pool[0]);
}

function exerciseLine(exercise: WorkoutExercise): string {
  const name = getExerciseById(exercise.exerciseId)?.name ?? 'Øvelse';
  const top = heaviestSet(exercise);
  const weight = top && top.weightKg > 0 ? ` ${formatKg(top.weightKg)}` : '';
  return `${exercise.sets.length} × ${name}${weight}`;
}

/** Loggført økt — navn, nøkkeltall og øvelser */
export function WorkoutCard({ workout, onPress }: WorkoutCardProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const visibleExercises = workout.exercises.slice(0, MAX_EXERCISE_LINES);
  const hiddenCount = workout.exercises.length - visibleExercises.length;

  return (
    <Card onPress={onPress}>
      {/* Navn + tidspunkt */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <AppText variant="subheading" numberOfLines={1}>
            {workout.name}
          </AppText>
          <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
            {formatTimeAgo(workout.date)}
          </AppText>
        </View>
        {workout.prCount > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingHorizontal: spacing.sm + 2,
              paddingVertical: spacing.xs,
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: colors.gold,
              backgroundColor: colors.surfaceElevated,
            }}
          >
            <Ionicons name="trophy" size={13} color={colors.gold} />
            <AppText variant="caption" style={{ color: colors.gold, fontWeight: '700' }}>
              {workout.prCount > 1 ? `${workout.prCount} PR` : 'PR'}
            </AppText>
          </View>
        )}
      </View>

      {/* Statistikk-rad */}
      <View style={{ flexDirection: 'row', marginTop: spacing.md, gap: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color="muted">
            Volum
          </AppText>
          <AppText style={[typography.heading, { marginTop: 2 }]}>
            {formatVolume(workout.totalVolumeKg)}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color="muted">
            Sett
          </AppText>
          <AppText style={[typography.heading, { marginTop: 2 }]}>{workout.totalSets}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color="muted">
            Tid
          </AppText>
          <AppText style={[typography.heading, { marginTop: 2 }]} numberOfLines={1}>
            {workout.durationMin != null ? formatDuration(workout.durationMin) : '–'}
          </AppText>
        </View>
      </View>

      {/* Øvelseslinjer */}
      {visibleExercises.length > 0 && (
        <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
          {visibleExercises.map((exercise) => (
            <AppText key={exercise.id} variant="body" color="secondary" numberOfLines={1}>
              {exerciseLine(exercise)}
            </AppText>
          ))}
          {hiddenCount > 0 && (
            <AppText variant="caption" color="muted">
              +{hiddenCount} til
            </AppText>
          )}
        </View>
      )}
    </Card>
  );
}
