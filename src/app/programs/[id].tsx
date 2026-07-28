import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText, Button, Card, EmptyState, Screen, ScreenHeader } from '@/components/ui';
import { t as tGlobal, useLanguage, useT } from '@/i18n';
import { exerciseDisplayName } from '@/lib/data/exercise-i18n';
import { confirmDialog, infoDialog } from '@/lib/dialogs';
import { firstParam } from '@/lib/params';
import { getExerciseById } from '@/lib/store/exercises';
import { useProgramStore } from '@/lib/store/programs';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme } from '@/theme';
import type { ProgramDay, TemplateExercise } from '@/types';

function feilmelding(error: unknown): string {
  return error instanceof Error && error.message ? error.message : tGlobal('error.generic');
}

/** «4 × 5–8» eller «3 × 10» */
function formatSetsReps(exercise: TemplateExercise): string {
  const reps =
    exercise.repsMax && exercise.repsMax !== exercise.repsMin
      ? `${exercise.repsMin}–${exercise.repsMax}`
      : `${exercise.repsMin}`;
  return `${exercise.sets} × ${reps}`;
}

export default function ProgramDetailScreen() {
  const id = firstParam(useLocalSearchParams<{ id: string | string[] }>().id);
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
  const { colors, spacing } = useTheme();

  const program = useProgramStore((s) => s.programs.find((p) => p.id === id));
  const programsLoaded = useProgramStore((s) => s.loaded);
  const toggleProgramFavorite = useProgramStore((s) => s.toggleProgramFavorite);
  const deleteProgram = useProgramStore((s) => s.deleteProgram);
  const startFromExercises = useWorkoutStore((s) => s.startFromExercises);

  if (!program) {
    // Dyplenke: programmene kan fortsatt være på vei inn fra serveren
    if (!programsLoaded) {
      return (
        <Screen>
          <ScreenHeader title={t('training.programTitle')} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        </Screen>
      );
    }
    return (
      <Screen>
        <ScreenHeader title={t('training.programTitle')} />
        <EmptyState
          icon="calendar-outline"
          title={t('training.programNotFoundTitle')}
          message={t('training.programNotFoundMessage')}
        />
      </Screen>
    );
  }

  const confirmDelete = () => {
    confirmDialog({
      title: t('training.deleteProgramTitle'),
      message: t('training.deleteProgramMessage', { name: program.name }),
      confirmLabel: t('common.delete'),
      destructive: true,
      onConfirm: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        try {
          await deleteProgram(program.id);
          router.back();
        } catch (error) {
          infoDialog(t('training.deleteProgramError'), feilmelding(error));
        }
      },
    });
  };

  const startDay = (day: ProgramDay) => {
    const begin = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startFromExercises(`${program.name} — ${day.name}`, day.exercises, { programId: program.id });
      router.push('/workout/active');
    };
    if (useWorkoutStore.getState().active) {
      confirmDialog({
        title: t('training.activeWorkoutTitle'),
        message: t('training.activeWorkoutMessage'),
        confirmLabel: t('training.discardAndStartNew'),
        destructive: true,
        onConfirm: begin,
      });
      return;
    }
    begin();
  };

  return (
    <Screen scroll>
      <ScreenHeader
        title={program.name}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <Pressable
              hitSlop={8}
              onPress={() => {
                Haptics.selectionAsync();
                toggleProgramFavorite(program.id).catch((error: unknown) =>
                  infoDialog(t('training.favoriteUpdateError'), feilmelding(error)),
                );
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons
                name={program.isFavorite ? 'star' : 'star-outline'}
                size={22}
                color={program.isFavorite ? colors.gold : colors.textMuted}
              />
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={confirmDelete}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          </View>
        }
      />

      {program.description ? (
        <AppText variant="body" color="secondary" style={{ marginBottom: spacing.lg }}>
          {program.description}
        </AppText>
      ) : null}
      <AppText variant="label" color="muted" style={{ marginBottom: spacing.md }}>
        {program.days.length} {program.days.length === 1 ? t('common.day') : t('common.days')}
      </AppText>

      <View style={{ gap: spacing.lg }}>
        {program.days.map((day, index) => (
          <Animated.View key={day.id} entering={FadeInDown.delay(index * 60).duration(300)}>
            <Card style={{ gap: spacing.md }}>
              <AppText variant="subheading">{day.name}</AppText>
              <View style={{ gap: spacing.sm }}>
                {day.exercises.map((exercise, i) => {
                  const def = getExerciseById(exercise.exerciseId);
                  return (
                    <View
                      key={`${exercise.exerciseId}-${i}`}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: colors.accent,
                        }}
                      />
                      <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
                        {def ? exerciseDisplayName(def, lang) : exercise.exerciseId}
                      </AppText>
                      <AppText variant="bodyBold" color="secondary">
                        {formatSetsReps(exercise)}
                      </AppText>
                    </View>
                  );
                })}
              </View>
              <Button
                title={t('training.startThisWorkout')}
                icon="play"
                fullWidth
                onPress={() => startDay(day)}
              />
            </Card>
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}
