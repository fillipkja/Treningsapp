import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
} from '@/components/exercises/exercise-picker-sheet';
import { LineChart, StatTile } from '@/components/charts';
import {
  AppText,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { confirmDialog } from '@/lib/dialogs';
import { formatKg, formatNumber, formatRelativeDate, formatShortDate } from '@/lib/format';
import { bestSet } from '@/lib/logic/workout-math';
import { useExercise, useExerciseStore } from '@/lib/store/exercises';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme } from '@/theme';
import type { Workout, WorkoutSet } from '@/types';

interface HistoryRow {
  workout: Workout;
  best: WorkoutSet | undefined;
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const exercise = useExercise(id ?? '');
  const deleteCustomExercise = useExerciseStore((s) => s.deleteCustomExercise);
  const pr = useWorkoutStore((s) => s.prs.find((p) => p.exerciseId === id));
  const workouts = useWorkoutStore((s) => s.workouts);

  const history = useMemo<HistoryRow[]>(() => {
    if (!id) return [];
    return workouts
      .filter((w) => w.exercises.some((e) => e.exerciseId === id))
      .slice(0, 5)
      .map((w) => {
        const we = w.exercises.find((e) => e.exerciseId === id);
        return { workout: w, best: we ? bestSet(we) : undefined };
      });
  }, [workouts, id]);

  if (!exercise) {
    return (
      <Screen>
        <ScreenHeader title="Øvelse" />
        <EmptyState
          icon="barbell-outline"
          title="Fant ikke øvelsen"
          message="Øvelsen kan være slettet."
        />
      </Screen>
    );
  }

  const confirmDelete = () => {
    confirmDialog({
      title: 'Slett øvelse',
      message: `Er du sikker på at du vil slette «${exercise.name}»?`,
      confirmLabel: 'Slett',
      destructive: true,
      onConfirm: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        deleteCustomExercise(exercise.id);
        router.back();
      },
    });
  };

  const chartPoints = (pr?.history ?? []).map((h) => ({
    x: formatShortDate(h.date),
    y: h.est1RM,
  }));

  return (
    <Screen scroll>
      <ScreenHeader title="Øvelse" />

      {/* Topp: emoji-plakat, navn og nøkkelchips */}
      <Animated.View entering={FadeInDown.duration(250)} style={[styles.center, { gap: spacing.md }]}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: radius.xl,
            backgroundColor: colors.surfaceElevated,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontSize: 52, lineHeight: 62 }}>{exercise.mediaEmoji}</AppText>
        </View>
        <View style={[styles.center, { gap: spacing.xs }]}>
          <AppText variant="title" style={{ textAlign: 'center' }}>
            {exercise.name}
          </AppText>
          {exercise.englishName ? (
            <AppText variant="body" color="muted">
              {exercise.englishName}
            </AppText>
          ) : null}
        </View>
        <View style={[styles.chipRow, { gap: spacing.sm }]}>
          <Chip label={EQUIPMENT_LABELS[exercise.equipment]} icon="barbell-outline" />
          <Chip label={CATEGORY_LABELS[exercise.category]} icon="flash-outline" />
          {exercise.isCustom ? <Chip label="Egen øvelse" icon="person-outline" /> : null}
        </View>
      </Animated.View>

      {/* Muskler */}
      <Animated.View entering={FadeInDown.duration(250).delay(50)} style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <AppText variant="heading">Muskler</AppText>
        <View style={[styles.chipRow, { gap: spacing.sm, justifyContent: 'flex-start' }]}>
          {exercise.primaryMuscles.map((m) => (
            <Chip key={`p-${m}`} label={MUSCLE_LABELS[m]} selected />
          ))}
          {exercise.secondaryMuscles.map((m) => (
            <Chip key={`s-${m}`} label={MUSCLE_LABELS[m]} />
          ))}
        </View>
      </Animated.View>

      {/* Slik gjør du */}
      {exercise.instructions.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(250).delay(100)} style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <AppText variant="heading">Slik gjør du</AppText>
          <Card style={{ gap: spacing.md }}>
            {exercise.instructions.map((step, index) => (
              <View key={index} style={[styles.stepRow, { gap: spacing.md }]}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: radius.full,
                    backgroundColor: colors.accentMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText variant="caption" color="accent" style={{ fontWeight: '700' }}>
                    {index + 1}
                  </AppText>
                </View>
                <AppText variant="body" color="secondary" style={{ flex: 1 }}>
                  {step}
                </AppText>
              </View>
            ))}
          </Card>
        </Animated.View>
      ) : null}

      {/* Tips */}
      {exercise.tips && exercise.tips.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(250).delay(150)} style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <AppText variant="heading">Tips</AppText>
          <Card style={{ gap: spacing.sm }}>
            {exercise.tips.map((tip, index) => (
              <View key={index} style={[styles.stepRow, { gap: spacing.sm }]}>
                <AppText variant="body" color="accent">
                  •
                </AppText>
                <AppText variant="body" color="secondary" style={{ flex: 1 }}>
                  {tip}
                </AppText>
              </View>
            ))}
          </Card>
        </Animated.View>
      ) : null}

      {/* Min utvikling */}
      {pr ? (
        <Animated.View entering={FadeInDown.duration(250).delay(200)} style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <AppText variant="heading">Min utvikling</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <StatTile label="Beste vekt" value={formatKg(pr.bestWeightKg)} />
            </View>
            <View style={{ flex: 1 }}>
              <StatTile label="Est. 1RM" value={formatKg(pr.bestEst1RM)} />
            </View>
            <View style={{ flex: 1 }}>
              <StatTile label="Beste reps" value={formatNumber(pr.bestReps)} />
            </View>
          </View>
          {chartPoints.length >= 2 ? (
            <Card>
              <AppText variant="label" color="muted" style={{ marginBottom: spacing.sm }}>
                Est. 1RM over tid (kg)
              </AppText>
              <LineChart
                series={[{ label: 'Est. 1RM', points: chartPoints }]}
                height={180}
                yFormatter={(v) => formatNumber(v)}
              />
            </Card>
          ) : null}
        </Animated.View>
      ) : null}

      {/* Historikk */}
      <Animated.View entering={FadeInDown.duration(250).delay(250)} style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <AppText variant="heading">Historikk</AppText>
        {history.length === 0 ? (
          <AppText variant="body" color="muted">
            Ingen økter med denne øvelsen ennå.
          </AppText>
        ) : (
          <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
            {history.map(({ workout, best }, index) => (
              <View key={workout.id}>
                {index > 0 ? <Divider /> : null}
                <View style={[styles.historyRow, { paddingVertical: spacing.md, gap: spacing.md }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="bodyBold" numberOfLines={1}>
                      {workout.name}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {formatRelativeDate(workout.date)}
                    </AppText>
                  </View>
                  {best ? (
                    <AppText variant="bodyBold" color="accent">
                      {`${formatKg(best.weightKg)} × ${best.reps}`}
                    </AppText>
                  ) : (
                    <AppText variant="caption" color="muted">
                      Ingen sett
                    </AppText>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}
      </Animated.View>

      {/* Slett egen øvelse */}
      {exercise.isCustom ? (
        <View style={{ marginTop: spacing.xl }}>
          <Button title="Slett øvelse" icon="trash-outline" variant="danger" fullWidth onPress={confirmDelete} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
