import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ExercisePickerSheet } from '@/components/exercises/exercise-picker-sheet';
import { RestTimer, type RestTimerHandle } from '@/components/workout/rest-timer';
import { AppText, Button, Card, Input, Screen, Sheet } from '@/components/ui';
import { useLanguage, useT } from '@/i18n';
import { exerciseDisplayName } from '@/lib/data/exercise-i18n';
import { findExercise } from '@/lib/data/exercises';
import { confirmDialog, infoDialog } from '@/lib/dialogs';
import { formatDuration, formatKg, formatVolume } from '@/lib/format';
import { completedSetCount, workoutVolume } from '@/lib/logic/workout-math';
import { useAuthStore } from '@/lib/store/auth';
import { useExerciseStore } from '@/lib/store/exercises';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme } from '@/theme';
import type { Exercise, WorkoutExercise, WorkoutSet } from '@/types';

/** Kolonnebredder i sett-tabellen (FORRIGE tar resten) */
const COL = { set: 30, kg: 56, reps: 46, rpe: 38, check: 28, remove: 20 } as const;
const ROW_GAP = 4;

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

function formatRpe(rpe: number): string {
  return String(rpe).replace('.', ',');
}

function numToText(n: number): string {
  return n > 0 ? String(n).replace('.', ',') : '';
}

function parseDecimal(text: string): number {
  const parsed = parseFloat(text.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function elapsedSeconds(startedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

/** Live mm:ss-timer fra øktstart — egen komponent så bare den re-rendres hvert sekund */
function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() => elapsedSeconds(startedAt));

  useEffect(() => {
    const timer = setInterval(() => setElapsed(elapsedSeconds(startedAt)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const text =
    h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <AppText variant="caption" color="secondary" style={{ fontVariant: ['tabular-nums'] }}>
      {text}
    </AppText>
  );
}

interface SetRowProps {
  weId: string;
  set: WorkoutSet;
  index: number;
  prev?: WorkoutSet;
  onOpenRpe: (weId: string, set: WorkoutSet) => void;
  onToggleCompleted: (weId: string, set: WorkoutSet) => void;
}

function SetRow({ weId, set, index, prev, onOpenRpe, onToggleCompleted }: SetRowProps) {
  const { colors, radius, spacing } = useTheme();
  const t = useT();
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const removeSet = useWorkoutStore((s) => s.removeSet);

  const inputStyle = {
    paddingVertical: 6,
    paddingHorizontal: 2,
    textAlign: 'center' as const,
    fontSize: 14,
    borderRadius: radius.sm,
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: ROW_GAP,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.xs,
        borderRadius: radius.sm,
        backgroundColor: set.completed ? colors.successMuted : 'transparent',
      }}
    >
      <Pressable
        hitSlop={6}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          updateSet(weId, set.id, { isWarmup: !set.isWarmup });
        }}
        style={{ width: COL.set, alignItems: 'center' }}
      >
        {set.isWarmup ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: colors.warning,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="caption" style={{ color: colors.warning, fontWeight: '700' }}>
              {t('workout.warmupShort')}
            </AppText>
          </View>
        ) : (
          <AppText variant="bodyBold" color="secondary">
            {index + 1}
          </AppText>
        )}
      </Pressable>

      <View style={{ flex: 1 }}>
        <AppText variant="caption" color="muted" numberOfLines={1} style={{ fontSize: 11 }}>
          {prev && prev.weightKg > 0 ? `${formatKg(prev.weightKg)} × ${prev.reps}` : '—'}
        </AppText>
      </View>

      <View style={{ width: COL.kg }}>
        <Input
          defaultValue={numToText(set.weightKg)}
          onChangeText={(t) => updateSet(weId, set.id, { weightKg: parseDecimal(t) })}
          keyboardType="decimal-pad"
          selectTextOnFocus
          placeholder="0"
          style={inputStyle}
        />
      </View>

      <View style={{ width: COL.reps }}>
        <Input
          defaultValue={set.reps > 0 ? String(set.reps) : ''}
          onChangeText={(t) => updateSet(weId, set.id, { reps: Math.round(parseDecimal(t)) })}
          keyboardType="number-pad"
          selectTextOnFocus
          placeholder="0"
          style={inputStyle}
        />
      </View>

      <Pressable
        hitSlop={6}
        onPress={() => onOpenRpe(weId, set)}
        style={{ width: COL.rpe, alignItems: 'center' }}
      >
        <AppText variant="caption" color={set.rpe != null ? 'primary' : 'muted'} style={{ fontWeight: '600' }}>
          {set.rpe != null ? formatRpe(set.rpe) : '—'}
        </AppText>
      </Pressable>

      <Pressable
        hitSlop={6}
        onPress={() => onToggleCompleted(weId, set)}
        style={{ width: COL.check, alignItems: 'center' }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.sm,
            borderWidth: set.completed ? 0 : 1.5,
            borderColor: colors.border,
            backgroundColor: set.completed ? colors.success : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {set.completed ? (
            <Ionicons name="checkmark" size={16} color={colors.onAccent} />
          ) : null}
        </View>
      </Pressable>

      <Pressable
        hitSlop={8}
        onPress={() => removeSet(weId, set.id)}
        style={{ width: COL.remove, alignItems: 'center' }}
      >
        <Ionicons name="close" size={14} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

interface ExerciseCardProps {
  we: WorkoutExercise;
  index: number;
  onOpenRpe: (weId: string, set: WorkoutSet) => void;
  onToggleCompleted: (weId: string, set: WorkoutSet) => void;
}

function ExerciseCard({ we, index, onOpenRpe, onToggleCompleted }: ExerciseCardProps) {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
  const addSet = useWorkoutStore((s) => s.addSet);
  const removeExerciseFromActive = useWorkoutStore((s) => s.removeExerciseFromActive);
  const lastSetsFor = useWorkoutStore((s) => s.lastSetsFor);
  const customExercises = useExerciseStore((s) => s.customExercises);

  const exercise =
    findExercise(we.exerciseId) ?? customExercises.find((e) => e.id === we.exerciseId);
  const name = exercise ? exerciseDisplayName(exercise, lang) : t('workout.unknownExercise');
  const lastSets = lastSetsFor(we.exerciseId);

  const confirmRemove = () => {
    confirmDialog({
      title: t('workout.removeExerciseTitle'),
      message: t('workout.removeExerciseMessage', { name }),
      confirmLabel: t('common.remove'),
      destructive: true,
      onConfirm: () => removeExerciseFromActive(we.id),
    });
  };

  const labelStyle = { fontSize: 10 } as const;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(250)}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => router.push(`/exercises/${we.exerciseId}`)}
          >
            <AppText variant="subheading" color="accent" numberOfLines={1}>
              {name}
            </AppText>
          </Pressable>
          <Pressable hitSlop={8} onPress={confirmRemove}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: ROW_GAP,
            paddingHorizontal: spacing.xs,
            marginTop: spacing.md,
            marginBottom: spacing.xs,
          }}
        >
          <AppText variant="label" color="muted" style={[labelStyle, { width: COL.set, textAlign: 'center' }]}>
            {t('workout.colSet')}
          </AppText>
          <AppText variant="label" color="muted" style={[labelStyle, { flex: 1 }]}>
            {t('workout.colPrevious')}
          </AppText>
          <AppText variant="label" color="muted" style={[labelStyle, { width: COL.kg, textAlign: 'center' }]}>
            {t('workout.colKg')}
          </AppText>
          <AppText variant="label" color="muted" style={[labelStyle, { width: COL.reps, textAlign: 'center' }]}>
            {t('workout.colReps')}
          </AppText>
          <AppText variant="label" color="muted" style={[labelStyle, { width: COL.rpe, textAlign: 'center' }]}>
            {t('workout.colRpe')}
          </AppText>
          <View style={{ width: COL.check, alignItems: 'center' }}>
            <Ionicons name="checkmark" size={13} color={colors.textMuted} />
          </View>
          <View style={{ width: COL.remove }} />
        </View>

        {we.sets.map((set, i) => (
          <SetRow
            key={set.id}
            weId={we.id}
            set={set}
            index={i}
            prev={lastSets?.[i]}
            onOpenRpe={onOpenRpe}
            onToggleCompleted={onToggleCompleted}
          />
        ))}

        <View style={{ marginTop: spacing.sm, alignItems: 'flex-start' }}>
          <Button
            title={t('workout.addSet')}
            icon="add"
            variant="ghost"
            size="sm"
            onPress={() => addSet(we.id)}
          />
        </View>
      </Card>
    </Animated.View>
  );
}

export default function ActiveWorkoutScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const t = useT();

  const active = useWorkoutStore((s) => s.active);
  const cancelActive = useWorkoutStore((s) => s.cancelActive);
  const finishActive = useWorkoutStore((s) => s.finishActive);
  const updateActive = useWorkoutStore((s) => s.updateActive);
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const addExerciseToActive = useWorkoutStore((s) => s.addExerciseToActive);
  const user = useAuthStore((s) => s.user);

  const [editingName, setEditingName] = useState(false);
  const nameDraft = useRef('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [rpeTarget, setRpeTarget] = useState<{ weId: string; set: WorkoutSet } | null>(null);
  const [finishVisible, setFinishVisible] = useState(false);
  const [share, setShare] = useState(user?.shareWorkouts ?? true);
  const [saving, setSaving] = useState(false);
  const [autoRest, setAutoRest] = useState(true);
  const restTimerRef = useRef<RestTimerHandle>(null);

  if (!active) {
    // Skjer kort idet økten lagres/avbrytes før navigasjonen fullføres
    return <Screen padded={false}>{null}</Screen>;
  }

  const completedCount = active.exercises.reduce(
    (sum, e) => sum + e.sets.filter((s) => s.completed).length,
    0,
  );

  const confirmCancel = () => {
    confirmDialog({
      title: t('workout.cancelTitle'),
      message: t('workout.cancelMessage'),
      confirmLabel: t('workout.cancelConfirm'),
      destructive: true,
      onConfirm: () => {
        cancelActive();
        router.back();
      },
    });
  };

  const commitName = () => {
    const next = nameDraft.current.trim();
    if (next) updateActive({ name: next });
    setEditingName(false);
  };

  const onToggleCompleted = (weId: string, set: WorkoutSet) => {
    const next = !set.completed;
    updateSet(weId, set.id, { completed: next });
    if (next) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (autoRest && !set.isWarmup) restTimerRef.current?.start();
    } else {
      Haptics.selectionAsync();
    }
  };

  const onPressFinish = () => {
    if (completedCount === 0) {
      infoDialog(t('workout.noCompletedSetsTitle'), t('workout.noCompletedSetsMessage'));
      return;
    }
    setShare(user?.shareWorkouts ?? true);
    setFinishVisible(true);
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const workout = await finishActive(share);
      setSaving(false);
      setFinishVisible(false);
      if (!workout) {
        router.back();
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/workout/${workout.id}?celebrate=1`);
    } catch (error) {
      // finishActive kaster kun hvis selve lagringen feilet — økten beholdes
      // da som aktiv, så brukeren kan prøve igjen (PR/merke-synk kaster ikke)
      setSaving(false);
      infoDialog(
        t('workout.saveFailedTitle'),
        error instanceof Error ? error.message : t('error.generic'),
      );
    }
  };

  const durationMin = Math.max(
    1,
    Math.round((Date.now() - new Date(active.startedAt).getTime()) / 60_000),
  );

  return (
    <Screen padded={false}>
      {/* Topplinje: avbryt, navn + timer, fullfør */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.screen,
          paddingVertical: spacing.md,
        }}
      >
        <Pressable
          hitSlop={8}
          onPress={confirmCancel}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: radius.full,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          {editingName ? (
            <Input
              autoFocus
              defaultValue={active.name}
              maxLength={80}
              onChangeText={(t) => {
                nameDraft.current = t;
              }}
              onSubmitEditing={commitName}
              onBlur={commitName}
              returnKeyType="done"
              style={{ paddingVertical: 6, textAlign: 'center', minWidth: 180 }}
            />
          ) : (
            <Pressable
              onPress={() => {
                nameDraft.current = active.name;
                setEditingName(true);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
            >
              <AppText variant="subheading" numberOfLines={1}>
                {active.name}
              </AppText>
              <Ionicons name="pencil" size={13} color={colors.textMuted} />
            </Pressable>
          )}
          <LiveTimer startedAt={active.startedAt} />
        </View>

        <Pressable
          onPress={onPressFinish}
          style={({ pressed }) => ({
            height: 36,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.full,
            backgroundColor: colors.success,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <AppText variant="bodyBold" color="onAccent">
            {t('workout.finish')}
          </AppText>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: spacing.screen,
            paddingBottom: 160,
            gap: spacing.lg,
          }}
        >
          {active.exercises.length === 0 ? (
            <Card style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl }}>
              <Ionicons name="barbell-outline" size={32} color={colors.textMuted} />
              <AppText variant="subheading">{t('workout.emptyTitle')}</AppText>
              <AppText variant="caption" color="muted" style={{ textAlign: 'center' }}>
                {t('workout.emptyMessage')}
              </AppText>
            </Card>
          ) : (
            active.exercises.map((we, i) => (
              <ExerciseCard
                key={we.id}
                we={we}
                index={i}
                onOpenRpe={(weId, set) => setRpeTarget({ weId, set })}
                onToggleCompleted={onToggleCompleted}
              />
            ))
          )}

          <Button
            title={t('workout.addExercise')}
            icon="add"
            variant="secondary"
            fullWidth
            onPress={() => setPickerVisible(true)}
          />

          <Input
            label={t('workout.notesLabel')}
            placeholder={t('workout.notesPlaceholder')}
            defaultValue={active.notes}
            maxLength={2000}
            onChangeText={(t) => updateActive({ notes: t })}
            multiline
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />

          <AppText variant="caption" color="muted" style={{ textAlign: 'center' }}>
            {t('workout.warmupTip')}
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>

      <RestTimer
        ref={restTimerRef}
        autoStart={autoRest}
        onToggleAutoStart={() => setAutoRest((v) => !v)}
      />

      <ExercisePickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(exercise: Exercise) => {
          addExerciseToActive(exercise.id);
          setPickerVisible(false);
        }}
      />

      {/* RPE-velger */}
      <Sheet visible={rpeTarget !== null} onClose={() => setRpeTarget(null)} title={t('workout.rpeTitle')}>
        <AppText variant="caption" color="muted" style={{ marginBottom: spacing.md }}>
          {t('workout.rpeHelp')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {RPE_VALUES.map((value) => {
            const selected = rpeTarget?.set.rpe === value;
            return (
              <Pressable
                key={value}
                onPress={() => {
                  if (rpeTarget) {
                    Haptics.selectionAsync();
                    updateSet(rpeTarget.weId, rpeTarget.set.id, { rpe: value });
                  }
                  setRpeTarget(null);
                }}
                style={({ pressed }) => ({
                  width: 52,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? colors.accentMuted : colors.surface,
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <AppText variant="bodyBold" color={selected ? 'accent' : 'primary'}>
                  {formatRpe(value)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
          <Button
            title={t('workout.rpeClear')}
            variant="ghost"
            size="sm"
            onPress={() => {
              if (rpeTarget) updateSet(rpeTarget.weId, rpeTarget.set.id, { rpe: undefined });
              setRpeTarget(null);
            }}
          />
        </View>
      </Sheet>

      {/* Fullfør-oppsummering */}
      <Sheet
        visible={finishVisible}
        onClose={() => {
          if (!saving) setFinishVisible(false);
        }}
        title={t('workout.finishTitle')}
      >
        <View style={{ gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[
              { label: t('workout.duration'), value: formatDuration(durationMin) },
              { label: t('common.volume'), value: formatVolume(workoutVolume(active.exercises)) },
              { label: t('common.sets'), value: String(completedSetCount(active.exercises)) },
            ].map((stat) => (
              <View
                key={stat.label}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.md,
                  gap: 2,
                }}
              >
                <AppText variant="label" color="muted">
                  {stat.label}
                </AppText>
                <AppText variant="subheading">{stat.value}</AppText>
              </View>
            ))}
          </View>

          <Pressable
            disabled={saving}
            onPress={() => setShare((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="bodyBold">{t('workout.shareTitle')}</AppText>
              <AppText variant="caption" color="muted">
                {t('workout.shareDescription')}
              </AppText>
            </View>
            <Switch
              value={share}
              onValueChange={setShare}
              disabled={saving}
              trackColor={{ false: colors.border, true: colors.accent }}
              ios_backgroundColor={colors.border}
            />
          </Pressable>

          <Button title={t('workout.saveWorkout')} fullWidth size="lg" loading={saving} onPress={onSave} />
        </View>
      </Sheet>
    </Screen>
  );
}
