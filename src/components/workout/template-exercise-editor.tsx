import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { ExercisePickerSheet } from '@/components/exercises/exercise-picker-sheet';
import { AppText, Button, Card } from '@/components/ui';
import { useLanguage, useT } from '@/i18n';
import { exerciseDisplayName } from '@/lib/data/exercise-i18n';
import { getExerciseById } from '@/lib/store/exercises';
import { useTheme } from '@/theme';
import type { Exercise, TemplateExercise } from '@/types';

interface TemplateExerciseEditorProps {
  exercises: TemplateExercise[];
  onChange: (next: TemplateExercise[]) => void;
  /** Tekst på legg-til-knappen (default «Legg til øvelse») */
  addLabel?: string;
}

interface NumFieldProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
}

function NumField({ label, value, onChange, placeholder }: NumFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <AppText variant="label" color="muted">
        {label}
      </AppText>
      <TextInput
        keyboardType="number-pad"
        value={value === undefined || value === 0 ? '' : String(value)}
        placeholder={placeholder ?? '0'}
        placeholderTextColor={colors.textMuted}
        onChangeText={(text) => {
          const digits = text.replace(/[^0-9]/g, '');
          onChange(digits.length === 0 ? undefined : Math.min(999, parseInt(digits, 10)));
        }}
        style={{
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          color: colors.textPrimary,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: typography.body.fontSize,
          fontWeight: '600',
          textAlign: 'center',
        }}
      />
    </View>
  );
}

/**
 * Gjenbrukbar byggeflate for en liste av mal-øvelser (favorittøkter og programdager):
 * velg øvelser via ExercisePickerSheet og juster sett + reps-område per øvelse.
 */
export function TemplateExerciseEditor({ exercises, onChange, addLabel }: TemplateExerciseEditorProps) {
  const t = useT();
  const lang = useLanguage();
  const { colors, spacing } = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);

  const patch = (index: number, changes: Partial<TemplateExercise>) => {
    onChange(exercises.map((e, i) => (i === index ? { ...e, ...changes } : e)));
  };

  const remove = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(exercises.filter((_, i) => i !== index));
  };

  const handleSelect = (exercise: Exercise) => {
    Haptics.selectionAsync();
    onChange([...exercises, { exerciseId: exercise.id, sets: 3, repsMin: 8, repsMax: 12 }]);
    setPickerVisible(false);
  };

  return (
    <View style={{ gap: spacing.md }}>
      {exercises.length === 0 ? (
        <AppText variant="caption" color="muted">
          {t('training.noExercisesYet')}
        </AppText>
      ) : (
        exercises.map((exercise, index) => {
          const def = getExerciseById(exercise.exerciseId);
          return (
            <Card key={`${exercise.exerciseId}-${index}`} style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <AppText variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
                  {def ? exerciseDisplayName(def, lang) : exercise.exerciseId}
                </AppText>
                <Pressable
                  hitSlop={8}
                  onPress={() => remove(index)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Ionicons name="trash-outline" size={19} color={colors.danger} />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <NumField
                  label={t('common.sets')}
                  value={exercise.sets}
                  onChange={(v) => patch(index, { sets: v ?? 0 })}
                />
                <NumField
                  label={t('training.repsFrom')}
                  value={exercise.repsMin}
                  onChange={(v) => patch(index, { repsMin: v ?? 0 })}
                />
                <NumField
                  label={t('training.repsTo')}
                  value={exercise.repsMax}
                  onChange={(v) => patch(index, { repsMax: v })}
                  placeholder="–"
                />
              </View>
            </Card>
          );
        })
      )}

      <Button
        title={addLabel ?? t('training.addExercise')}
        icon="add"
        variant="secondary"
        size="sm"
        onPress={() => setPickerVisible(true)}
      />

      <ExercisePickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelect}
      />
    </View>
  );
}
