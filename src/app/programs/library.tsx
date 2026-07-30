import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText, Button, Card, Screen, ScreenHeader } from '@/components/ui';
import { t as tGlobal, useLanguage, useT } from '@/i18n';
import { exerciseDisplayName } from '@/lib/data/exercise-i18n';
import {
  libraryPrograms,
  toProgramDraft,
  type LibraryProgram,
} from '@/lib/data/program-library';
import { infoDialog } from '@/lib/dialogs';
import { getExerciseById } from '@/lib/store/exercises';
import { useProgramStore } from '@/lib/store/programs';
import { useTheme } from '@/theme';
import type { TemplateExercise } from '@/types';

function feilmelding(error: unknown): string {
  return error instanceof Error && error.message ? error.message : tGlobal('error.generic');
}

/** «4 × 5–8» eller «3 × 10» — samme format som programdetaljen */
function formatSetsReps(exercise: TemplateExercise): string {
  const reps =
    exercise.repsMax && exercise.repsMax !== exercise.repsMin
      ? `${exercise.repsMin}–${exercise.repsMax}`
      : `${exercise.repsMin}`;
  return `${exercise.sets} × ${reps}`;
}

export default function ProgramLibraryScreen() {
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
  const { colors, spacing } = useTheme();

  const addProgram = useProgramStore((s) => s.addProgram);
  const ownedPrograms = useProgramStore((s) => s.programs);

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);

  // Navn/beskrivelser bygges med t() inni libraryPrograms — gjenoppbygg ved språkbytte
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const library = useMemo(() => libraryPrograms(), [lang]);

  // «Lagt til» utledes fra brukerens programmer (navnematch fanger også de
  // seedede starterne) — da overlever statusen navigasjon og gjenåpning.
  const ownedNames = useMemo(
    () => new Set(ownedPrograms.map((program) => program.name)),
    [ownedPrograms],
  );

  const add = async (program: LibraryProgram) => {
    setAddingKey(program.key);
    try {
      const created = await addProgram(toProgramDraft(program));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/programs/${created.id}`);
    } catch (error) {
      infoDialog(t('training.libraryAddError'), feilmelding(error));
    } finally {
      setAddingKey(null);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('training.library')} />
      <AppText variant="body" color="secondary" style={{ marginBottom: spacing.lg }}>
        {t('training.libraryIntro')}
      </AppText>

      <View style={{ gap: spacing.md }}>
        {library.map((program, index) => {
          const expanded = expandedKey === program.key;
          const added = ownedNames.has(program.name);
          const exerciseCount = program.days.reduce((n, day) => n + day.exercises.length, 0);
          return (
            <Animated.View key={program.key} entering={FadeInDown.delay(index * 40).duration(300)}>
              <Card style={{ gap: spacing.md }}>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setExpandedKey(expanded ? null : program.key);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: spacing.md,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <AppText variant="bodyBold" numberOfLines={1}>
                      {program.name}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {program.description}
                    </AppText>
                    <AppText variant="caption" color="secondary">
                      {program.days.length}{' '}
                      {program.days.length === 1 ? t('common.day') : t('common.days')} ·{' '}
                      {t('training.exercisesCount', { count: exerciseCount })}
                    </AppText>
                  </View>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>

                {expanded ? (
                  <View style={{ gap: spacing.md }}>
                    {program.days.map((day) => (
                      <View key={day.id} style={{ gap: spacing.sm }}>
                        <AppText variant="label" color="muted">
                          {day.name}
                        </AppText>
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
                    ))}
                  </View>
                ) : null}

                <Button
                  title={added ? t('training.libraryAdded') : t('training.libraryAdd')}
                  icon={added ? 'checkmark' : 'add'}
                  variant={added ? 'secondary' : 'primary'}
                  fullWidth
                  // Én innlegging om gangen — ellers kan et etterslep re-aktivere
                  // en annen knapp midt i dens egen innlegging
                  disabled={added || (addingKey !== null && addingKey !== program.key)}
                  loading={addingKey === program.key}
                  onPress={() => add(program)}
                />
              </Card>
            </Animated.View>
          );
        })}
      </View>
    </Screen>
  );
}
