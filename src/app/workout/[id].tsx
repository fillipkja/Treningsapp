import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { StatTile } from '@/components/charts';
import { findExercise } from '@/lib/data/exercises';
import { confirmDialog } from '@/lib/dialogs';
import {
  dateKey,
  formatDuration,
  formatFullDate,
  formatKg,
  formatNumber,
  formatVolume,
} from '@/lib/format';
import { BADGE_DEFS } from '@/lib/logic/badges';
import { useExerciseStore } from '@/lib/store/exercises';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme } from '@/theme';
import type { WorkoutSet } from '@/types';

function formatRpe(rpe: number): string {
  return String(rpe).replace('.', ',');
}

function setLine(set: WorkoutSet): string {
  const base = `${formatKg(set.weightKg)} × ${set.reps}`;
  return set.rpe != null ? `${base}  @ RPE ${formatRpe(set.rpe)}` : base;
}

export default function WorkoutDetailScreen() {
  const params = useLocalSearchParams<{ id: string; celebrate?: string }>();
  const workoutId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const celebrate = params.celebrate === '1';

  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const myWorkouts = useWorkoutStore((s) => s.workouts);
  const earnedBadges = useWorkoutStore((s) => s.earnedBadges);
  const deleteWorkout = useWorkoutStore((s) => s.deleteWorkout);
  const customExercises = useExerciseStore((s) => s.customExercises);

  const workout = myWorkouts.find((w) => w.id === workoutId);

  const exerciseName = (id: string): string =>
    (findExercise(id) ?? customExercises.find((e) => e.id === id))?.name ?? 'Ukjent øvelse';

  if (!workout) {
    return (
      <Screen>
        <ScreenHeader title="Økt" />
        <EmptyState
          icon="barbell-outline"
          title="Fant ikke økten"
          message="Økten kan være slettet."
          actionTitle="Gå tilbake"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  // Feiring: PR-øvelser og merker tildelt i dag
  const prExerciseNames = workout.exercises
    .filter((we) => we.sets.some((s) => s.isPR))
    .map((we) => exerciseName(we.exerciseId));
  const todayKey = dateKey(new Date());
  const newBadges = earnedBadges
    .filter((b) => dateKey(new Date(b.earnedAt)) === todayKey)
    .map((b) => BADGE_DEFS.find((d) => d.id === b.badgeId))
    .filter((d) => d != null);

  const confirmDelete = () => {
    confirmDialog({
      title: 'Slett økt',
      message: 'Økten og alle sett slettes permanent.',
      confirmLabel: 'Slett',
      destructive: true,
      onConfirm: () => {
        deleteWorkout(workout.id);
        router.back();
      },
    });
  };

  return (
    <Screen scroll>
      <ScreenHeader title={workout.name} />

      <View style={{ gap: spacing.lg }}>
        <AppText variant="caption" color="muted">
          {formatFullDate(workout.date)}
        </AppText>

        {celebrate ? (
          <Animated.View entering={FadeInDown.duration(350)}>
            <Card
              style={{
                alignItems: 'center',
                gap: spacing.sm,
                borderColor: colors.success,
                backgroundColor: colors.successMuted,
              }}
            >
              <AppText style={{ fontSize: 44 }}>🎉</AppText>
              <AppText variant="title">Økt fullført!</AppText>
              <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
                {formatVolume(workout.totalVolumeKg)} løftet · {workout.totalSets} sett ·{' '}
                {formatDuration(workout.durationMin ?? 0)}
              </AppText>
              {prExerciseNames.length > 0 ? (
                <View style={{ alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
                  <AppText variant="label" style={{ color: colors.gold }}>
                    Nye rekorder
                  </AppText>
                  {prExerciseNames.map((name) => (
                    <AppText key={name} variant="bodyBold" style={{ color: colors.gold }}>
                      🏆 {name}
                    </AppText>
                  ))}
                </View>
              ) : null}
              {newBadges.length > 0 ? (
                <View style={{ alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
                  <AppText variant="label" color="muted">
                    Nye merker
                  </AppText>
                  {newBadges.map((badge) => (
                    <AppText key={badge.id} variant="bodyBold">
                      {badge.icon} {badge.name}
                    </AppText>
                  ))}
                </View>
              ) : null}
            </Card>
          </Animated.View>
        ) : null}

        {/* Statistikk */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <StatTile label="Volum" value={formatVolume(workout.totalVolumeKg)} />
          </View>
          <View style={{ flex: 1 }}>
            <StatTile label="Sett" value={formatNumber(workout.totalSets)} />
          </View>
          <View style={{ flex: 1 }}>
            <StatTile label="Varighet" value={formatDuration(workout.durationMin ?? 0)} />
          </View>
        </View>

        {workout.prCount > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              borderWidth: 1,
              borderColor: colors.gold,
              borderRadius: radius.lg,
              padding: spacing.md,
            }}
          >
            <Ionicons name="trophy" size={18} color={colors.gold} />
            <AppText variant="bodyBold" style={{ color: colors.gold }}>
              {workout.prCount === 1
                ? '1 personlig rekord'
                : `${workout.prCount} personlige rekorder`}
            </AppText>
          </View>
        ) : null}

        {/* Øvelser */}
        {workout.exercises.map((we) => {
          let workingIndex = 0;
          return (
            <Card key={we.id}>
              <Pressable onPress={() => router.push(`/exercises/${we.exerciseId}`)}>
                <AppText variant="subheading" color="accent" numberOfLines={1}>
                  {exerciseName(we.exerciseId)}
                </AppText>
              </Pressable>
              <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                {we.sets.map((set) => {
                  const label = set.isWarmup ? 'O' : String(++workingIndex);
                  return (
                    <View
                      key={set.id}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
                    >
                      <AppText
                        variant="bodyBold"
                        color={set.isWarmup ? 'muted' : 'secondary'}
                        style={{ width: 20, textAlign: 'center' }}
                      >
                        {label}
                      </AppText>
                      <AppText variant="body" style={{ flex: 1 }}>
                        {setLine(set)}
                      </AppText>
                      {set.isPR ? (
                        <View
                          style={{
                            borderWidth: 1,
                            borderColor: colors.gold,
                            borderRadius: radius.full,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 2,
                          }}
                        >
                          <AppText
                            variant="caption"
                            style={{ color: colors.gold, fontWeight: '700' }}
                          >
                            PR
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
              {we.notes ? (
                <AppText variant="caption" color="muted" style={{ marginTop: spacing.sm }}>
                  {we.notes}
                </AppText>
              ) : null}
            </Card>
          );
        })}

        {/* Notater */}
        {workout.notes ? (
          <Card>
            <AppText variant="label" color="muted" style={{ marginBottom: spacing.xs }}>
              Notater
            </AppText>
            <AppText variant="body" color="secondary">
              {workout.notes}
            </AppText>
          </Card>
        ) : null}

        {/* Sletting */}
        <Card>
          <Button
            title="Slett økt"
            icon="trash-outline"
            variant="danger"
            size="sm"
            onPress={confirmDelete}
          />
        </Card>
      </View>
    </Screen>
  );
}
