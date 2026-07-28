import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText, Button, Chip, Divider, EmptyState, Input, Sheet } from '@/components/ui';
import { useAllExercises } from '@/lib/store/exercises';
import { useTheme } from '@/theme';
import type { Equipment, Exercise, ExerciseCategory, MuscleGroup } from '@/types';

/** Alle muskelgrupper i visningsrekkefølge (brukes også av bibliotek-skjermen) */
export const MUSCLE_GROUPS: MuscleGroup[] = [
  'bryst',
  'rygg',
  'skuldre',
  'biceps',
  'triceps',
  'underarmer',
  'mage',
  'quads',
  'hamstrings',
  'setemuskler',
  'legger',
  'korsrygg',
  'helkropp',
];

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  bryst: 'Bryst',
  rygg: 'Rygg',
  skuldre: 'Skuldre',
  biceps: 'Biceps',
  triceps: 'Triceps',
  underarmer: 'Underarmer',
  mage: 'Mage',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  setemuskler: 'Setemuskler',
  legger: 'Legger',
  korsrygg: 'Korsrygg',
  helkropp: 'Helkropp',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  stang: 'Stang',
  manualer: 'Manualer',
  maskin: 'Maskin',
  kabel: 'Kabel',
  kroppsvekt: 'Kroppsvekt',
  kettlebell: 'Kettlebell',
  strikk: 'Strikk',
  annet: 'Annet',
};

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  styrke: 'Styrke',
  kondisjon: 'Kondisjon',
  mobilitet: 'Mobilitet',
};

/** Felles filter for picker og bibliotek: fritekst på norsk/engelsk navn + primærmuskel */
export function filterExercises(
  exercises: Exercise[],
  query: string,
  muscle: MuscleGroup | null,
): Exercise[] {
  const q = query.trim().toLowerCase();
  return exercises.filter((e) => {
    if (muscle && !e.primaryMuscles.includes(muscle)) return false;
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      (e.englishName?.toLowerCase().includes(q) ?? false)
    );
  });
}

/** Horisontal chip-rad med «Alle» + alle muskelgrupper */
export function MuscleFilterChips({
  selected,
  onChange,
}: {
  selected: MuscleGroup | null;
  onChange: (muscle: MuscleGroup | null) => void;
}) {
  const { spacing } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
    >
      <Chip
        label="Alle"
        selected={selected === null}
        onPress={() => {
          Haptics.selectionAsync();
          onChange(null);
        }}
      />
      {MUSCLE_GROUPS.map((m) => (
        <Chip
          key={m}
          label={MUSCLE_LABELS[m]}
          selected={selected === m}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(selected === m ? null : m);
          }}
        />
      ))}
    </ScrollView>
  );
}

/** Rad i øvelseslister: emoji-rute, navn, muskler + utstyr, «Egen»-merke */
export function ExerciseRow({
  exercise,
  onPress,
  chevron = false,
}: {
  exercise: Exercise;
  onPress: () => void;
  chevron?: boolean;
}) {
  const { colors, spacing, radius } = useTheme();

  const subtitle = [
    exercise.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', '),
    EQUIPMENT_LABELS[exercise.equipment],
  ].join(' · ');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { gap: spacing.md, paddingVertical: spacing.md, opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceElevated,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText style={{ fontSize: 24, lineHeight: 30 }}>{exercise.mediaEmoji}</AppText>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyBold" numberOfLines={1}>
          {exercise.name}
        </AppText>
        <AppText variant="caption" color="muted" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      {exercise.isCustom ? (
        <View
          style={{
            backgroundColor: colors.accentMuted,
            borderRadius: radius.full,
            paddingHorizontal: spacing.sm,
            paddingVertical: 3,
          }}
        >
          <AppText variant="caption" color="accent" style={{ fontWeight: '600' }}>
            Egen
          </AppText>
        </View>
      ) : null}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

interface ExercisePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export function ExercisePickerSheet({ visible, onClose, onSelect }: ExercisePickerSheetProps) {
  const router = useRouter();
  const { spacing } = useTheme();
  const { height } = useWindowDimensions();
  const exercises = useAllExercises();

  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  const filtered = useMemo(
    () => filterExercises(exercises, query, muscle),
    [exercises, query, muscle],
  );

  const handleSelect = (exercise: Exercise) => {
    Haptics.selectionAsync();
    onSelect(exercise);
    onClose();
  };

  const goToNewExercise = () => {
    onClose();
    router.push('/exercises/new');
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Velg øvelse">
      <View style={{ gap: spacing.sm }}>
        <Input
          placeholder="Søk etter øvelse …"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        <MuscleFilterChips selected={muscle} onChange={setMuscle} />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          style={{ height: Math.round(height * 0.45) }}
          renderItem={({ item }) => (
            <ExerciseRow exercise={item} onPress={() => handleSelect(item)} />
          )}
          ItemSeparatorComponent={Divider}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="Ingen treff"
              message="Prøv et annet søkeord eller fjern filteret."
            />
          }
        />
        <Button
          title="Lag egen øvelse"
          icon="add"
          variant="secondary"
          fullWidth
          onPress={goToNewExercise}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
