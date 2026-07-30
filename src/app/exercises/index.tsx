import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, View } from 'react-native';
import {
  ExerciseRow,
  filterExercises,
  MuscleFilterChips,
} from '@/components/exercises/exercise-picker-sheet';
import { AppText, Divider, EmptyState, Input, Screen, ScreenHeader } from '@/components/ui';
import { useLanguage, useT } from '@/i18n';
import { ALL_MUSCLES, muscleLabel } from '@/i18n/labels';
import { exerciseDisplayName } from '@/lib/data/exercise-i18n';
import { confirmDialog, infoDialog } from '@/lib/dialogs';
import { useAllExercises, useExerciseStore } from '@/lib/store/exercises';
import { useTheme } from '@/theme';
import type { Exercise, MuscleGroup } from '@/types';

interface ExerciseSection {
  title: string | null;
  data: Exercise[];
}

export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const t = useT();
  const lang = useLanguage();
  const exercises = useAllExercises();

  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const deleteCustomExercise = useExerciseStore((s) => s.deleteCustomExercise);

  const askDeleteCustom = (exercise: Exercise) => {
    confirmDialog({
      title: t('exercises.deleteTitle'),
      message: t('exercises.deleteMessage', { name: exerciseDisplayName(exercise, lang) }),
      confirmLabel: t('common.delete'),
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteCustomExercise(exercise.id);
        } catch (error) {
          infoDialog(
            t('exercises.deleteErrorTitle'),
            error instanceof Error && error.message ? error.message : t('error.generic'),
          );
        }
      },
    });
  };

  const isFiltering = query.trim().length > 0 || muscle !== null;

  const sections = useMemo<ExerciseSection[]>(() => {
    if (isFiltering) {
      return [{ title: null, data: filterExercises(exercises, query, muscle, lang) }];
    }
    // Grupper etter første primærmuskel i fast rekkefølge; sorter på visningsnavn
    const byMuscle = new Map<MuscleGroup, Exercise[]>();
    for (const e of exercises) {
      const key = e.primaryMuscles[0] ?? 'helkropp';
      const list = byMuscle.get(key);
      if (list) list.push(e);
      else byMuscle.set(key, [e]);
    }
    return ALL_MUSCLES.filter((m) => byMuscle.has(m)).map((m) => ({
      title: muscleLabel(m, lang),
      data: (byMuscle.get(m) ?? []).sort((a, b) =>
        exerciseDisplayName(a, lang).localeCompare(exerciseDisplayName(b, lang), lang),
      ),
    }));
  }, [exercises, isFiltering, query, muscle, lang]);

  return (
    <Screen>
      <ScreenHeader
        title={t('exercises.title')}
        right={
          <Pressable
            hitSlop={8}
            onPress={() => router.push('/exercises/new')}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceElevated,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="add" size={22} color={colors.textPrimary} />
          </Pressable>
        }
      />

      <View style={{ gap: spacing.sm }}>
        <Input
          placeholder={t('exercises.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        <MuscleFilterChips selected={muscle} onChange={setMuscle} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        style={{ flex: 1, marginTop: spacing.sm }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        renderItem={({ item }) => (
          <ExerciseRow
            exercise={item}
            // Egne øvelser slettes her — det er ingen egen detaljside
            right={
              item.isCustom ? (
                <Pressable
                  hitSlop={8}
                  accessibilityLabel={t('exercises.deleteTitle')}
                  onPress={() => askDeleteCustom(item)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              ) : undefined
            }
          />
        )}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View style={{ paddingTop: spacing.lg, paddingBottom: spacing.xs }}>
              <AppText variant="label" color="muted">
                {section.title}
              </AppText>
            </View>
          ) : null
        }
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title={t('exercises.noResultsTitle')}
            message={t('exercises.noResultsMessage')}
          />
        }
      />
    </Screen>
  );
}
