import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
} from '@/components/exercises/exercise-picker-sheet';
import { AppText, Button, Chip, Input, Screen, ScreenHeader } from '@/components/ui';
import { infoDialog } from '@/lib/dialogs';
import { useExerciseStore } from '@/lib/store/exercises';
import { useTheme } from '@/theme';
import type { Equipment, ExerciseCategory, MuscleGroup } from '@/types';

const EMOJIS = ['🏋️', '💪', '🦵', '🍑', '🏃', '🤸', '🧘', '⚡', '🔥', '🎯'];
const EQUIPMENT_VALUES: Equipment[] = [
  'stang',
  'manualer',
  'maskin',
  'kabel',
  'kroppsvekt',
  'kettlebell',
  'strikk',
  'annet',
];
const CATEGORY_VALUES: ExerciseCategory[] = ['styrke', 'kondisjon', 'mobilitet'];

/** Dynamisk liste med tekstfelt + fjern-knapp, brukt til steg og tips */
function DynamicTextList({
  items,
  onChange,
  placeholder,
  addLabel,
  numbered = false,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
  numbered?: boolean;
}) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      {items.map((text, index) => (
        <View key={index} style={[styles.listRow, { gap: spacing.sm }]}>
          {numbered ? (
            <AppText variant="bodyBold" color="muted" style={{ width: 22, textAlign: 'center' }}>
              {index + 1}.
            </AppText>
          ) : (
            <AppText variant="bodyBold" color="muted" style={{ width: 22, textAlign: 'center' }}>
              •
            </AppText>
          )}
          <View style={{ flex: 1 }}>
            <Input
              placeholder={placeholder}
              value={text}
              onChangeText={(next) =>
                onChange(items.map((t, i) => (i === index ? next : t)))
              }
              multiline
            />
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(items.filter((_, i) => i !== index));
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </View>
      ))}
      <Button
        title={addLabel}
        icon="add"
        variant="secondary"
        size="sm"
        onPress={() => {
          Haptics.selectionAsync();
          onChange([...items, '']);
        }}
      />
    </View>
  );
}

export default function NewExerciseScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const addCustomExercise = useExerciseStore((s) => s.addCustomExercise);

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [equipment, setEquipment] = useState<Equipment>('stang');
  const [category, setCategory] = useState<ExerciseCategory>('styrke');
  const [primary, setPrimary] = useState<MuscleGroup[]>([]);
  const [secondary, setSecondary] = useState<MuscleGroup[]>([]);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [tips, setTips] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const togglePrimary = (m: MuscleGroup) => {
    Haptics.selectionAsync();
    setPrimary((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
    setSecondary((prev) => prev.filter((x) => x !== m));
  };

  const toggleSecondary = (m: MuscleGroup) => {
    Haptics.selectionAsync();
    setSecondary((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
    setPrimary((prev) => prev.filter((x) => x !== m));
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Gi øvelsen et navn.');
      return;
    }
    if (primary.length === 0) {
      infoDialog('Mangler muskelgruppe', 'Velg minst én primærmuskel.');
      return;
    }
    setSaving(true);
    try {
      await addCustomExercise({
        name: trimmed,
        primaryMuscles: primary,
        secondaryMuscles: secondary,
        equipment,
        category,
        instructions: instructions.map((s) => s.trim()).filter((s) => s.length > 0),
        tips: (() => {
          const cleaned = tips.map((t) => t.trim()).filter((t) => t.length > 0);
          return cleaned.length > 0 ? cleaned : undefined;
        })(),
        mediaEmoji: emoji,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      setSaving(false);
      infoDialog(
        'Kunne ikke lagre øvelsen',
        error instanceof Error && error.message ? error.message : 'Noe gikk galt. Prøv igjen.',
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <ScreenHeader title="Ny øvelse" />

        <Animated.View entering={FadeInDown.duration(250)} style={{ gap: spacing.xl }}>
          <Input
            label="Navn"
            placeholder="F.eks. Bulgarsk utfall"
            value={name}
            maxLength={80}
            onChangeText={(text) => {
              setName(text);
              if (nameError) setNameError(undefined);
            }}
            error={nameError}
          />

          {/* Emoji */}
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="muted">
              Emoji
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {EMOJIS.map((e) => {
                const selected = e === emoji;
                return (
                  <Pressable
                    key={e}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setEmoji(e);
                    }}
                    style={({ pressed }) => ({
                      width: 48,
                      height: 48,
                      borderRadius: radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? colors.accentMuted : colors.surfaceElevated,
                      borderWidth: 1,
                      borderColor: selected ? colors.accent : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <AppText style={{ fontSize: 24, lineHeight: 30 }}>{e}</AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Utstyr */}
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="muted">
              Utstyr
            </AppText>
            <View style={[styles.wrapRow, { gap: spacing.sm }]}>
              {EQUIPMENT_VALUES.map((eq) => (
                <Chip
                  key={eq}
                  label={EQUIPMENT_LABELS[eq]}
                  selected={equipment === eq}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setEquipment(eq);
                  }}
                />
              ))}
            </View>
          </View>

          {/* Kategori */}
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="muted">
              Kategori
            </AppText>
            <View style={[styles.wrapRow, { gap: spacing.sm }]}>
              {CATEGORY_VALUES.map((c) => (
                <Chip
                  key={c}
                  label={CATEGORY_LABELS[c]}
                  selected={category === c}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCategory(c);
                  }}
                />
              ))}
            </View>
          </View>

          {/* Primærmuskler */}
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="muted">
              Primærmuskler (minst én)
            </AppText>
            <View style={[styles.wrapRow, { gap: spacing.sm }]}>
              {MUSCLE_GROUPS.map((m) => (
                <Chip
                  key={m}
                  label={MUSCLE_LABELS[m]}
                  selected={primary.includes(m)}
                  onPress={() => togglePrimary(m)}
                />
              ))}
            </View>
          </View>

          {/* Sekundærmuskler */}
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="muted">
              Sekundærmuskler (valgfritt)
            </AppText>
            <View style={[styles.wrapRow, { gap: spacing.sm }]}>
              {MUSCLE_GROUPS.map((m) => (
                <Chip
                  key={m}
                  label={MUSCLE_LABELS[m]}
                  selected={secondary.includes(m)}
                  onPress={() => toggleSecondary(m)}
                />
              ))}
            </View>
          </View>

          {/* Instruksjoner */}
          <View style={{ gap: spacing.sm }}>
            <AppText variant="heading">Slik gjør du</AppText>
            <DynamicTextList
              items={instructions}
              onChange={setInstructions}
              placeholder="Beskriv steget …"
              addLabel="Legg til steg"
              numbered
            />
          </View>

          {/* Tips */}
          <View style={{ gap: spacing.sm }}>
            <AppText variant="heading">Tips (valgfritt)</AppText>
            <DynamicTextList
              items={tips}
              onChange={setTips}
              placeholder="F.eks. hold ryggen rett …"
              addLabel="Legg til tips"
            />
          </View>

          <Button
            title="Lagre øvelse"
            icon="checkmark"
            size="lg"
            fullWidth
            loading={saving}
            onPress={() => void save()}
          />
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
