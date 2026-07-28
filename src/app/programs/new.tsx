import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TemplateExerciseEditor } from '@/components/workout/template-exercise-editor';
import { AppText, Button, Card, Input, Screen, ScreenHeader } from '@/components/ui';
import { useT } from '@/i18n';
import { infoDialog } from '@/lib/dialogs';
import { uid } from '@/lib/ids';
import { useProgramStore } from '@/lib/store/programs';
import { useTheme } from '@/theme';
import type { TemplateExercise } from '@/types';

interface DraftDay {
  id: string;
  name: string;
  exercises: TemplateExercise[];
}

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

export default function NewProgramScreen() {
  const router = useRouter();
  const t = useT();
  const { colors, spacing } = useTheme();
  const addProgram = useProgramStore((s) => s.addProgram);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<DraftDay[]>(() => [
    { id: uid('day'), name: t('training.dayN', { n: 1 }), exercises: [] },
  ]);
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const patchDay = (id: string, changes: Partial<DraftDay>) => {
    setDays((prev) => prev.map((d) => (d.id === id ? { ...d, ...changes } : d)));
  };

  const addDay = () => {
    Haptics.selectionAsync();
    setDays((prev) => [
      ...prev,
      { id: uid('day'), name: t('training.dayN', { n: prev.length + 1 }), exercises: [] },
    ]);
  };

  const removeDay = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDays((prev) => prev.filter((d) => d.id !== id));
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t('training.programNameRequired'));
      return;
    }
    const validDays = days
      .filter((d) => d.exercises.length > 0)
      .map((d) => ({
        id: d.id,
        name: d.name.trim() || t('training.dayFallback'),
        exercises: d.exercises.map(sanitize),
      }));
    if (validDays.length === 0) {
      infoDialog(t('training.missingExercisesTitle'), t('training.programNeedsExercises'));
      return;
    }
    setSaving(true);
    try {
      await addProgram({
        name: trimmed,
        description: description.trim() || undefined,
        days: validDays,
        isFavorite: false,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      setSaving(false);
      infoDialog(
        t('training.saveProgramError'),
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
        <ScreenHeader title={t('training.newProgram')} />

        <View style={{ gap: spacing.lg }}>
          <Input
            label={t('training.nameLabel')}
            placeholder={t('training.programNamePlaceholder')}
            value={name}
            maxLength={80}
            onChangeText={(text) => {
              setName(text);
              if (nameError) setNameError(undefined);
            }}
            error={nameError}
          />
          <Input
            label={t('training.descriptionLabel')}
            placeholder={t('training.descriptionPlaceholder')}
            value={description}
            maxLength={2000}
            onChangeText={setDescription}
            multiline
          />

          <AppText variant="heading" style={{ marginTop: spacing.sm }}>
            {t('training.daysSection')}
          </AppText>

          {days.map((day, index) => (
            <Animated.View key={day.id} entering={FadeInDown.duration(250)}>
              <Card style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label={t('training.dayN', { n: index + 1 })}
                      placeholder={t('training.dayNamePlaceholder')}
                      value={day.name}
                      onChangeText={(text) => patchDay(day.id, { name: text })}
                    />
                  </View>
                  {days.length > 1 ? (
                    <Pressable
                      hitSlop={8}
                      onPress={() => removeDay(day.id)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingBottom: spacing.md })}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  ) : null}
                </View>
                <TemplateExerciseEditor
                  exercises={day.exercises}
                  onChange={(exercises) => patchDay(day.id, { exercises })}
                />
              </Card>
            </Animated.View>
          ))}

          <Button title={t('training.addDay')} icon="add" variant="secondary" fullWidth onPress={addDay} />

          <View style={{ marginTop: spacing.sm }}>
            <Button
              title={t('training.saveProgram')}
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
