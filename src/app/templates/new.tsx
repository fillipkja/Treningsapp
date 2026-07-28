import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { TemplateExerciseEditor } from '@/components/workout/template-exercise-editor';
import { AppText, Button, Input, Screen, ScreenHeader } from '@/components/ui';
import { useT } from '@/i18n';
import { infoDialog } from '@/lib/dialogs';
import { useProgramStore } from '@/lib/store/programs';
import { useTheme } from '@/theme';
import type { TemplateExercise } from '@/types';

/** Rens en øvelsesrad før lagring: minst 1 sett/rep, gyldig reps-område */
function sanitize(exercise: TemplateExercise): TemplateExercise {
  const repsMin = Math.max(1, exercise.repsMin);
  return {
    ...exercise,
    sets: Math.max(1, exercise.sets),
    repsMin,
    repsMax: exercise.repsMax !== undefined && exercise.repsMax >= repsMin ? exercise.repsMax : undefined,
  };
}

export default function NewTemplateScreen() {
  const router = useRouter();
  const t = useT();
  const { spacing } = useTheme();
  const addTemplate = useProgramStore((s) => s.addTemplate);

  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t('training.templateNameRequired'));
      return;
    }
    if (exercises.length === 0) {
      infoDialog(t('training.missingExercisesTitle'), t('training.addAtLeastOneExercise'));
      return;
    }
    setSaving(true);
    try {
      await addTemplate({
        name: trimmed,
        exercises: exercises.map(sanitize),
        isFavorite: true,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      setSaving(false);
      infoDialog(
        t('training.saveTemplateError'),
        error instanceof Error && error.message ? error.message : t('error.generic'),
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <ScreenHeader title={t('training.newTemplate')} />

        <View style={{ gap: spacing.lg }}>
          <Input
            label={t('training.nameLabel')}
            placeholder={t('training.templateNamePlaceholder')}
            value={name}
            maxLength={80}
            onChangeText={(text) => {
              setName(text);
              if (nameError) setNameError(undefined);
            }}
            error={nameError}
          />

          <AppText variant="heading" style={{ marginTop: spacing.sm }}>
            {t('training.exercisesSection')}
          </AppText>

          <TemplateExerciseEditor exercises={exercises} onChange={setExercises} />

          <View style={{ marginTop: spacing.sm }}>
            <Button
              title={t('training.saveTemplate')}
              icon="checkmark"
              size="lg"
              fullWidth
              loading={saving}
              onPress={() => void save()}
            />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
