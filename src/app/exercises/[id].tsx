import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MuscleChip } from '@/components/exercises/exercise-picker-sheet';
import { ExerciseTile } from '@/components/exercises/exercise-tile';
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
import { useLanguage, useT } from '@/i18n';
import { categoryLabel, equipmentLabel } from '@/i18n/labels';
import { exerciseDisplayName, getExerciseText } from '@/lib/data/exercise-i18n';
import { confirmDialog, infoDialog } from '@/lib/dialogs';
import { formatKg, formatNumber, formatRelativeDate, formatShortDate } from '@/lib/format';
import { firstParam } from '@/lib/params';
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
  const id = firstParam(useLocalSearchParams<{ id: string | string[] }>().id);
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const t = useT();
  const lang = useLanguage();

  const exercise = useExercise(id ?? '');
  const exercisesLoaded = useExerciseStore((s) => s.loaded);
  const deleteCustomExercise = useExerciseStore((s) => s.deleteCustomExercise);
  const pr = useWorkoutStore((s) => s.prs.find((p) => p.exerciseId === id));
  const workouts = useWorkoutStore((s) => s.workouts);
  const [deleting, setDeleting] = useState(false);

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
    // Dyplenke til en egendefinert øvelse: de lastes fra serveren
    if (!exercisesLoaded) {
      return (
        <Screen>
          <ScreenHeader title={t('exercises.screenTitle')} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        </Screen>
      );
    }
    return (
      <Screen>
        <ScreenHeader title={t('exercises.screenTitle')} />
        <EmptyState
          icon="barbell-outline"
          title={t('exercises.notFoundTitle')}
          message={t('exercises.notFoundMessage')}
        />
      </Screen>
    );
  }

  const text = getExerciseText(exercise, lang);
  const displayName = exerciseDisplayName(exercise, lang);
  // Navn på det andre språket som undertittel (når det finnes og er ulikt)
  const altName = lang === 'en' && exercise.englishName ? exercise.name : exercise.englishName;

  const confirmDelete = () => {
    confirmDialog({
      title: t('exercises.deleteTitle'),
      message: t('exercises.deleteMessage', { name: displayName }),
      confirmLabel: t('common.delete'),
      destructive: true,
      onConfirm: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setDeleting(true);
        try {
          await deleteCustomExercise(exercise.id);
          router.back();
        } catch (error) {
          setDeleting(false);
          infoDialog(
            t('exercises.deleteErrorTitle'),
            error instanceof Error && error.message ? error.message : t('error.generic'),
          );
        }
      },
    });
  };

  const chartPoints = (pr?.history ?? []).map((h) => ({
    x: formatShortDate(h.date),
    y: h.est1RM,
  }));

  return (
    <Screen scroll>
      <ScreenHeader title={t('exercises.screenTitle')} />

      {/* Topp: farget øvelsesflis, navn og nøkkelchips */}
      <Animated.View entering={FadeInDown.duration(250)} style={[styles.center, { gap: spacing.md }]}>
        <ExerciseTile exercise={exercise} size={96} />
        <View style={[styles.center, { gap: spacing.xs }]}>
          <AppText variant="title" style={{ textAlign: 'center' }}>
            {displayName}
          </AppText>
          {altName && altName !== displayName ? (
            <AppText variant="body" color="muted">
              {altName}
            </AppText>
          ) : null}
        </View>
        <View style={[styles.chipRow, { gap: spacing.sm }]}>
          <Chip label={equipmentLabel(exercise.equipment, lang)} icon="barbell-outline" />
          <Chip label={categoryLabel(exercise.category, lang)} icon="flash-outline" />
          {exercise.isCustom ? (
            <Chip label={t('exercises.customChip')} icon="person-outline" />
          ) : null}
        </View>
      </Animated.View>

      {/* Muskler: primær = fylt muskelfarge, sekundær = nøytral */}
      <Animated.View entering={FadeInDown.duration(250).delay(50)} style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <AppText variant="heading">{t('exercises.muscles')}</AppText>
        <View style={[styles.chipRow, { gap: spacing.sm, justifyContent: 'flex-start' }]}>
          {exercise.primaryMuscles.map((m) => (
            <MuscleChip key={`p-${m}`} muscle={m} selected />
          ))}
          {exercise.secondaryMuscles.map((m) => (
            <MuscleChip key={`s-${m}`} muscle={m} />
          ))}
        </View>
      </Animated.View>

      {/* Slik gjør du */}
      {text.instructions.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(250).delay(100)} style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <AppText variant="heading">{t('exercises.howTo')}</AppText>
          <Card style={{ gap: spacing.md }}>
            {text.instructions.map((step, index) => (
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
      {text.tips && text.tips.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(250).delay(150)} style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <AppText variant="heading">{t('exercises.tips')}</AppText>
          <Card style={{ gap: spacing.sm }}>
            {text.tips.map((tip, index) => (
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
          <AppText variant="heading">{t('exercises.myProgress')}</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <StatTile label={t('exercises.bestWeight')} value={formatKg(pr.bestWeightKg)} />
            </View>
            <View style={{ flex: 1 }}>
              <StatTile label={t('exercises.est1RM')} value={formatKg(pr.bestEst1RM)} />
            </View>
            <View style={{ flex: 1 }}>
              <StatTile label={t('exercises.bestReps')} value={formatNumber(pr.bestReps)} />
            </View>
          </View>
          {chartPoints.length >= 2 ? (
            <Card>
              <AppText variant="label" color="muted" style={{ marginBottom: spacing.sm }}>
                {t('exercises.est1RMOverTime')}
              </AppText>
              <LineChart
                series={[{ label: t('exercises.est1RM'), points: chartPoints }]}
                height={180}
                yFormatter={(v) => formatNumber(v)}
              />
            </Card>
          ) : null}
        </Animated.View>
      ) : null}

      {/* Historikk */}
      <Animated.View entering={FadeInDown.duration(250).delay(250)} style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <AppText variant="heading">{t('exercises.history')}</AppText>
        {history.length === 0 ? (
          <AppText variant="body" color="muted">
            {t('exercises.noHistory')}
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
                      {t('exercises.noSets')}
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
          <Button
            title={t('exercises.deleteTitle')}
            icon="trash-outline"
            variant="danger"
            fullWidth
            loading={deleting}
            onPress={confirmDelete}
          />
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
