import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, View } from 'react-native';
import {
  ExerciseRow,
  filterExercises,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  MuscleFilterChips,
} from '@/components/exercises/exercise-picker-sheet';
import { AppText, Divider, EmptyState, Input, Screen, ScreenHeader } from '@/components/ui';
import { useAllExercises } from '@/lib/store/exercises';
import { useTheme } from '@/theme';
import type { Exercise, MuscleGroup } from '@/types';

interface ExerciseSection {
  title: string | null;
  data: Exercise[];
}

export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const exercises = useAllExercises();

  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  const isFiltering = query.trim().length > 0 || muscle !== null;

  const sections = useMemo<ExerciseSection[]>(() => {
    if (isFiltering) {
      return [{ title: null, data: filterExercises(exercises, query, muscle) }];
    }
    // Grupper etter første primærmuskel i fast rekkefølge
    const byMuscle = new Map<MuscleGroup, Exercise[]>();
    for (const e of exercises) {
      const key = e.primaryMuscles[0] ?? 'helkropp';
      const list = byMuscle.get(key);
      if (list) list.push(e);
      else byMuscle.set(key, [e]);
    }
    return MUSCLE_GROUPS.filter((m) => byMuscle.has(m)).map((m) => ({
      title: MUSCLE_LABELS[m],
      data: byMuscle.get(m) ?? [],
    }));
  }, [exercises, isFiltering, query, muscle]);

  return (
    <Screen>
      <ScreenHeader
        title="Øvelser"
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
          placeholder="Søk etter øvelse …"
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
            chevron
            onPress={() => router.push(`/exercises/${item.id}`)}
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
            title="Ingen treff"
            message="Prøv et annet søkeord eller fjern filteret."
          />
        }
      />
    </Screen>
  );
}
