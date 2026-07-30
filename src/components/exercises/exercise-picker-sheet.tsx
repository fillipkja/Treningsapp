import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText, Button, Chip, Divider, EmptyState, Input, Sheet } from '@/components/ui';
import { ExerciseTile } from '@/components/exercises/exercise-tile';
import { useLanguage, useT } from '@/i18n';
import { ALL_MUSCLES, equipmentLabel, muscleLabel } from '@/i18n/labels';
import { exerciseDisplayName } from '@/lib/data/exercise-i18n';
import type { AppLanguage } from '@/lib/store/settings';
import { useAllExercises } from '@/lib/store/exercises';
import { muscleColors, useTheme } from '@/theme';
import type { Exercise, MuscleGroup } from '@/types';

/** Felles filter for picker og bibliotek: fritekst på norsk/engelsk navn + primærmuskel.
 *  Resultatet sorteres på visningsnavnet for aktivt språk. */
export function filterExercises(
  exercises: Exercise[],
  query: string,
  muscle: MuscleGroup | null,
  lang: AppLanguage,
): Exercise[] {
  const q = query.trim().toLowerCase();
  return exercises
    .filter((e) => {
      if (muscle && !e.primaryMuscles.includes(muscle)) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        (e.englishName?.toLowerCase().includes(q) ?? false)
      );
    })
    .sort((a, b) =>
      exerciseDisplayName(a, lang).localeCompare(exerciseDisplayName(b, lang), lang),
    );
}

/** Chip i muskelgruppens identitetsfarge: valgt = farget tekst/border på muted bakgrunn */
export function MuscleChip({
  muscle,
  selected = false,
  onPress,
}: {
  muscle: MuscleGroup;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { colors, radius, spacing, isDark } = useTheme();
  const lang = useLanguage();
  const color = muscleColors[isDark ? 'dark' : 'light'][muscle];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm - 1,
        borderRadius: radius.full,
        backgroundColor: selected ? color + '29' : colors.surfaceElevated,
        borderWidth: 1,
        borderColor: selected ? color : colors.border,
        opacity: pressed ? 0.8 : 1,
        alignSelf: 'flex-start',
      })}
    >
      <AppText
        variant="caption"
        style={{ color: selected ? color : colors.textSecondary, fontWeight: '600' }}
      >
        {muscleLabel(muscle, lang)}
      </AppText>
    </Pressable>
  );
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
  const t = useT();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
    >
      <Chip
        label={t('exercises.filterAll')}
        selected={selected === null}
        onPress={() => {
          Haptics.selectionAsync();
          onChange(null);
        }}
      />
      {ALL_MUSCLES.map((m) => (
        <MuscleChip
          key={m}
          muscle={m}
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

/** Rad i øvelseslister: farget flis, navn, muskler + utstyr, «Egen»-merke */
export function ExerciseRow({
  exercise,
  onPress,
  chevron = false,
  right,
}: {
  exercise: Exercise;
  /** Uten onPress er raden ren informasjon (ikke trykkbar) */
  onPress?: () => void;
  chevron?: boolean;
  /** Eget innhold ytterst til høyre, f.eks. slett-knapp for egne øvelser */
  right?: ReactNode;
}) {
  const { colors, spacing, radius } = useTheme();
  const t = useT();
  const lang = useLanguage();

  const subtitle = [
    exercise.primaryMuscles.map((m) => muscleLabel(m, lang)).join(', '),
    equipmentLabel(exercise.equipment, lang),
  ].join(' · ');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, { gap: spacing.md, paddingVertical: spacing.md, opacity: pressed ? 0.7 : 1 }]}
    >
      <ExerciseTile exercise={exercise} size={46} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyBold" numberOfLines={1}>
          {exerciseDisplayName(exercise, lang)}
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
            {t('exercises.customBadge')}
          </AppText>
        </View>
      ) : null}
      {right}
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
  const t = useT();
  const lang = useLanguage();
  const exercises = useAllExercises();

  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  const filtered = useMemo(
    () => filterExercises(exercises, query, muscle, lang),
    [exercises, query, muscle, lang],
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
    <Sheet visible={visible} onClose={onClose} title={t('exercises.pickerTitle')}>
      <View style={{ gap: spacing.sm }}>
        <Input
          placeholder={t('exercises.searchPlaceholder')}
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
              title={t('exercises.noResultsTitle')}
              message={t('exercises.noResultsMessage')}
            />
          }
        />
        <Button
          title={t('exercises.createCustom')}
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
