import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TemplateExerciseEditor } from '@/components/workout/template-exercise-editor';
import { AppText, Button, Card, Input, Screen, ScreenHeader } from '@/components/ui';
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
  const { colors, spacing } = useTheme();
  const addProgram = useProgramStore((s) => s.addProgram);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<DraftDay[]>([{ id: uid('day'), name: 'Dag 1', exercises: [] }]);
  const [nameError, setNameError] = useState<string | undefined>();

  const patchDay = (id: string, changes: Partial<DraftDay>) => {
    setDays((prev) => prev.map((d) => (d.id === id ? { ...d, ...changes } : d)));
  };

  const addDay = () => {
    Haptics.selectionAsync();
    setDays((prev) => [...prev, { id: uid('day'), name: `Dag ${prev.length + 1}`, exercises: [] }]);
  };

  const removeDay = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDays((prev) => prev.filter((d) => d.id !== id));
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Gi programmet et navn.');
      return;
    }
    const validDays = days
      .filter((d) => d.exercises.length > 0)
      .map((d) => ({
        id: d.id,
        name: d.name.trim() || 'Dag',
        exercises: d.exercises.map(sanitize),
      }));
    if (validDays.length === 0) {
      infoDialog('Mangler øvelser', 'Programmet må ha minst én dag med minst én øvelse.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addProgram({
      name: trimmed,
      description: description.trim() || undefined,
      days: validDays,
      isFavorite: false,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <ScreenHeader title="Nytt program" />

        <View style={{ gap: spacing.lg }}>
          <Input
            label="Navn"
            placeholder="F.eks. Push Pull Legs"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (nameError) setNameError(undefined);
            }}
            error={nameError}
          />
          <Input
            label="Beskrivelse (valgfritt)"
            placeholder="Hva går programmet ut på?"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <AppText variant="heading" style={{ marginTop: spacing.sm }}>
            Dager
          </AppText>

          {days.map((day, index) => (
            <Animated.View key={day.id} entering={FadeInDown.duration(250)}>
              <Card style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label={`Dag ${index + 1}`}
                      placeholder="F.eks. Push"
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

          <Button title="Legg til dag" icon="add" variant="secondary" fullWidth onPress={addDay} />

          <View style={{ marginTop: spacing.sm }}>
            <Button title="Lagre program" icon="checkmark" size="lg" fullWidth onPress={save} />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
