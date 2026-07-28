import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MuscleChip } from '@/components/exercises/exercise-picker-sheet';
import { AppText, Button, Chip, Input, Screen, ScreenHeader } from '@/components/ui';
import { useLanguage, useT } from '@/i18n';
import {
  ALL_CATEGORIES,
  ALL_EQUIPMENT,
  ALL_MUSCLES,
  categoryLabel,
  equipmentLabel,
} from '@/i18n/labels';
import { infoDialog } from '@/lib/dialogs';
import { useExerciseStore } from '@/lib/store/exercises';
import { useTheme } from '@/theme';
import type { Equipment, ExerciseCategory, MuscleGroup } from '@/types';

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
  const { spacing } = useTheme();
  const t = useT();
  const lang = useLanguage();
  const addCustomExercise = useExerciseStore((s) => s.addCustomExercise);

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
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
      setNameError(t('exercises.nameRequired'));
      return;
    }
    if (primary.length === 0) {
      infoDialog(t('exercises.missingMuscleTitle'), t('exercises.missingMuscleMessage'));
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
          const cleaned = tips.map((tip) => tip.trim()).filter((tip) => tip.length > 0);
          return cleaned.length > 0 ? cleaned : undefined;
        })(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      setSaving(false);
      infoDialog(
        t('exercises.saveErrorTitle'),
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
        <ScreenHeader title={t('exercises.newTitle')} />

        <Animated.View entering={FadeInDown.duration(250)} style={{ gap: spacing.xl }}>
          <Input
            label={t('exercises.nameLabel')}
            placeholder={t('exercises.namePlaceholder')}
            value={name}
            maxLength={80}
            onChangeText={(text) => {
              setName(text);
              if (nameError) setNameError(undefined);
            }}
            error={nameError}
          />

          {/* Utstyr */}
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="muted">
              {t('exercises.equipment')}
            </AppText>
            <View style={[styles.wrapRow, { gap: spacing.sm }]}>
              {ALL_EQUIPMENT.map((eq) => (
                <Chip
                  key={eq}
                  label={equipmentLabel(eq, lang)}
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
              {t('exercises.category')}
            </AppText>
            <View style={[styles.wrapRow, { gap: spacing.sm }]}>
              {ALL_CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  label={categoryLabel(c, lang)}
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
              {t('exercises.primaryMuscles')}
            </AppText>
            <View style={[styles.wrapRow, { gap: spacing.sm }]}>
              {ALL_MUSCLES.map((m) => (
                <MuscleChip
                  key={m}
                  muscle={m}
                  selected={primary.includes(m)}
                  onPress={() => togglePrimary(m)}
                />
              ))}
            </View>
          </View>

          {/* Sekundærmuskler */}
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="muted">
              {t('exercises.secondaryMuscles')}
            </AppText>
            <View style={[styles.wrapRow, { gap: spacing.sm }]}>
              {ALL_MUSCLES.map((m) => (
                <MuscleChip
                  key={m}
                  muscle={m}
                  selected={secondary.includes(m)}
                  onPress={() => toggleSecondary(m)}
                />
              ))}
            </View>
          </View>

          {/* Instruksjoner */}
          <View style={{ gap: spacing.sm }}>
            <AppText variant="heading">{t('exercises.howTo')}</AppText>
            <DynamicTextList
              items={instructions}
              onChange={setInstructions}
              placeholder={t('exercises.stepPlaceholder')}
              addLabel={t('exercises.addStep')}
              numbered
            />
          </View>

          {/* Tips */}
          <View style={{ gap: spacing.sm }}>
            <AppText variant="heading">{t('exercises.tipsOptional')}</AppText>
            <DynamicTextList
              items={tips}
              onChange={setTips}
              placeholder={t('exercises.tipPlaceholder')}
              addLabel={t('exercises.addTip')}
            />
          </View>

          <Button
            title={t('exercises.saveExercise')}
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
