import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Switch,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ExercisePickerSheet } from '@/components/exercises/exercise-picker-sheet';
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  Screen,
  ScreenHeader,
  SegmentedControl,
} from '@/components/ui';
import { t as tGlobal, useLanguage, useT } from '@/i18n';
import { distanceLabel } from '@/i18n/labels';
import { exerciseDisplayName } from '@/lib/data/exercise-i18n';
import { confirmDialog, infoDialog } from '@/lib/dialogs';
import { formatDuration, parseDurationInput } from '@/lib/format';
import { STANDARD_RUN_DISTANCES } from '@/lib/logic/leaderboard';
import { firstParam } from '@/lib/params';
import { useAuthStore } from '@/lib/store/auth';
import { getExerciseById } from '@/lib/store/exercises';
import { useRecordStore } from '@/lib/store/records';
import { useTheme } from '@/theme';
import type { ManualRecord, RunRecord } from '@/types';

function feilmelding(error: unknown): string {
  return error instanceof Error && error.message ? error.message : tGlobal('error.generic');
}

/** «82,5» -> 82.5, tomt/ugyldig -> undefined */
function parseWeight(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * ISO -> «28.07.2026». Leser UTC-komponentene fordi datoen lagres som midt på
 * dagen UTC — lokal tid ville forskjøvet dagen (og latt den drive ved hver
 * lagring) i tidssoner øst for UTC+11.
 */
function toDateInput(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getUTCFullYear()}`;
}

/** Dagens dato som «28.07.2026» (lokal kalenderdag — det brukeren mener med «i dag») */
function todayDateInput(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}

/**
 * «28.07.2026», «28/7/26» osv. -> ISO (midt på dagen UTC så datoen ikke
 * forskyves av tidssoner). Ugyldig eller fremtidig dato -> null.
 */
function parseDateInput(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!valid || year < 1900) return null;
  // En rekord kan ikke være satt i fremtiden (én dags slingring for tidssoner)
  if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) return null;
  return date.toISOString();
}

function RecordForm({
  existing,
  kindSelector,
}: {
  existing?: ManualRecord;
  /** Styrke/løping-velgeren — vises kun ved oppretting */
  kindSelector?: ReactNode;
}) {
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
  const { colors, spacing, radius } = useTheme();

  const user = useAuthStore((s) => s.user);
  const addRecord = useRecordStore((s) => s.addRecord);
  const updateRecord = useRecordStore((s) => s.updateRecord);
  const deleteRecord = useRecordStore((s) => s.deleteRecord);

  const [exerciseId, setExerciseId] = useState<string | undefined>(existing?.exerciseId);
  const [weight, setWeight] = useState(
    existing ? String(existing.weightKg).replace('.', ',') : '',
  );
  const [reps, setReps] = useState(existing ? String(existing.reps) : '1');
  const [sets, setSets] = useState(existing ? String(existing.sets) : '1');
  // Dato er valgfri: nye rekorder foreslår i dag, men feltet kan tømmes
  const [dateText, setDateText] = useState(
    existing ? (existing.date ? toDateInput(existing.date) : '') : todayDateInput(),
  );
  const [location, setLocation] = useState(existing?.location ?? '');
  // Kroppsvekt fylles inn fra profilen på nye rekorder — kan fjernes/endres
  const [bodyweight, setBodyweight] = useState(() => {
    const initial = existing ? existing.bodyweightKg : user?.weightKg;
    return initial ? String(initial).replace('.', ',') : '';
  });
  const [notes, setNotes] = useState(existing?.notes ?? '');
  // Nye rekorder deles med venner som standard — kan skrus av per rekord
  const [isShared, setIsShared] = useState(existing?.isShared ?? true);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const exercise = exerciseId ? getExerciseById(exerciseId) : undefined;

  const save = async () => {
    if (!exerciseId) {
      setError(t('profile.recordExerciseRequired'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    // Grensene speiler check-constraintene i manual_records (0003-migrasjonen)
    const weightKg = parseWeight(weight);
    if (!weightKg || weightKg > 1000) {
      setError(t('profile.recordWeightRequired'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const repsCount = Number.parseInt(reps, 10);
    if (!Number.isFinite(repsCount) || repsCount < 1 || repsCount > 100) {
      setError(t('profile.recordRepsInvalid'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    // Tomt sett-felt betyr enkeltløft — bare utfylte verdier valideres
    const setsCount = sets.trim() === '' ? 1 : Number.parseInt(sets, 10);
    if (!Number.isFinite(setsCount) || setsCount < 1 || setsCount > 20) {
      setError(t('profile.recordSetsInvalid'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    // Ikke-tomt felt som ikke gir en gyldig verdi skal gi feil, ikke forkastes stille
    const bodyweightKg = parseWeight(bodyweight);
    if (
      bodyweight.trim() !== '' &&
      (bodyweightKg === undefined || bodyweightKg < 20 || bodyweightKg > 400)
    ) {
      setError(t('profile.recordBodyweightInvalid'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    // Datoen er valgfri — tomt felt betyr ukjent, men utfylt må være gyldig
    const date = dateText.trim() === '' ? null : parseDateInput(dateText);
    if (dateText.trim() !== '' && !date) {
      setError(t('profile.recordDateInvalid'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      if (existing) {
        // Ved redigering sendes tømte felter som null slik at de nullstilles
        await updateRecord(existing.id, {
          exerciseId,
          weightKg,
          reps: repsCount,
          sets: setsCount,
          date,
          location: location.trim() || null,
          bodyweightKg: bodyweightKg ?? null,
          notes: notes.trim() || null,
          isShared,
        });
      } else {
        await addRecord({
          exerciseId,
          weightKg,
          reps: repsCount,
          sets: setsCount,
          date: date ?? undefined,
          location: location.trim() || undefined,
          bodyweightKg,
          notes: notes.trim() || undefined,
          isShared,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      setError(feilmelding(err));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!existing) return;
    confirmDialog({
      title: t('profile.recordDeleteTitle'),
      message: t('profile.recordDeleteMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
      onConfirm: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        try {
          await deleteRecord(existing.id);
          router.back();
        } catch (err) {
          infoDialog(t('profile.recordDeleteError'), feilmelding(err));
        }
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <ScreenHeader
          title={existing ? t('profile.recordEditTitle') : t('profile.recordNewTitle')}
        />
        {kindSelector}

        {/* Øvelse */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card style={{ gap: spacing.md }}>
            <AppText variant="label" color="muted">
              {t('profile.recordExercise')}
            </AppText>
            <Pressable
              onPress={() => setPickerVisible(true)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                backgroundColor: colors.surfaceElevated,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="barbell-outline" size={20} color={colors.accent} />
              <AppText
                variant="body"
                color={exercise ? 'primary' : 'muted'}
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {exercise ? exerciseDisplayName(exercise, lang) : t('profile.recordPickExercise')}
              </AppText>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </Card>
        </Animated.View>

        {/* Løft og dato */}
        <Animated.View entering={FadeInDown.delay(60).duration(300)}>
          <Card style={{ marginTop: spacing.lg, gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1.4 }}>
                <Input
                  label={t('profile.recordWeight')}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="140"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('profile.recordSetsLabel')}
                  value={sets}
                  onChangeText={setSets}
                  placeholder="1"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('profile.recordRepsLabel')}
                  value={reps}
                  onChangeText={setReps}
                  placeholder="1"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <Input
              label={t('profile.recordDate')}
              value={dateText}
              onChangeText={setDateText}
              placeholder={t('profile.recordDatePlaceholder')}
              autoCorrect={false}
            />
          </Card>
        </Animated.View>

        {/* Kontekst: sted og kroppsvekt */}
        <Animated.View entering={FadeInDown.delay(120).duration(300)}>
          <Card style={{ marginTop: spacing.lg, gap: spacing.lg }}>
            <Input
              label={t('profile.recordLocation')}
              value={location}
              onChangeText={setLocation}
              placeholder={t('profile.recordLocationPlaceholder')}
              maxLength={80}
            />
            <Input
              label={t('profile.recordBodyweight')}
              value={bodyweight}
              onChangeText={setBodyweight}
              placeholder="80"
              keyboardType="decimal-pad"
            />
            <Input
              label={t('profile.recordNotes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('profile.recordNotesPlaceholder')}
              maxLength={500}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </Card>
        </Animated.View>

        {/* Synlighet for venner */}
        <Animated.View entering={FadeInDown.delay(180).duration(300)}>
          <Card style={{ marginTop: spacing.lg }}>
            <Pressable
              disabled={saving}
              onPress={() => setIsShared((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyBold">{t('profile.recordShareTitle')}</AppText>
                <AppText variant="caption" color="muted">
                  {t('profile.recordShareSubtitle')}
                </AppText>
              </View>
              <Switch
                value={isShared}
                onValueChange={setIsShared}
                disabled={saving}
                trackColor={{ false: colors.border, true: colors.accent }}
                ios_backgroundColor={colors.border}
              />
            </Pressable>
          </Card>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(240).duration(300)}
          style={{ marginTop: spacing.xl, gap: spacing.md }}
        >
          {error ? (
            <AppText variant="body" style={{ color: colors.danger, textAlign: 'center' }}>
              {error}
            </AppText>
          ) : null}
          <Button
            title={t('common.save')}
            icon="checkmark"
            size="lg"
            fullWidth
            loading={saving}
            onPress={save}
          />
          {existing ? (
            <Button
              title={t('profile.recordDeleteTitle')}
              icon="trash-outline"
              variant="danger"
              fullWidth
              onPress={confirmDelete}
            />
          ) : null}
        </Animated.View>
      </Screen>

      <ExercisePickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(selected) => {
          setExerciseId(selected.id);
          if (error) setError(undefined);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function RunForm({
  existing,
  kindSelector,
}: {
  existing?: RunRecord;
  /** Styrke/løping-velgeren — vises kun ved oppretting */
  kindSelector?: ReactNode;
}) {
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
  const { colors, spacing } = useTheme();

  const addRun = useRecordStore((s) => s.addRun);
  const updateRun = useRecordStore((s) => s.updateRun);
  const deleteRun = useRecordStore((s) => s.deleteRun);

  // Distansen holdes som meter-tekst — standardknappene fyller den inn
  const [distanceText, setDistanceText] = useState(existing ? String(existing.distanceM) : '');
  const [timeText, setTimeText] = useState(existing ? formatDuration(existing.durationSec) : '');
  // Dato er valgfri: nye løp foreslår i dag, men feltet kan tømmes
  const [dateText, setDateText] = useState(
    existing ? (existing.date ? toDateInput(existing.date) : '') : todayDateInput(),
  );
  const [location, setLocation] = useState(existing?.location ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  // Nye rekorder deles med venner som standard — kan skrus av per rekord
  const [isShared, setIsShared] = useState(existing?.isShared ?? true);

  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    // Grensene speiler check-constraintene i run_records (0005-migrasjonen)
    const trimmedDistance = distanceText.trim();
    const distanceM = /^\d+$/.test(trimmedDistance)
      ? Number.parseInt(trimmedDistance, 10)
      : Number.NaN;
    if (!Number.isFinite(distanceM) || distanceM < 100 || distanceM > 1_000_000) {
      setError(t('profile.recordRunDistanceInvalid'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const durationSec = parseDurationInput(timeText);
    if (durationSec === null || durationSec < 10 || durationSec > 360_000) {
      setError(t('profile.recordRunTimeInvalid'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    // Datoen er valgfri — tomt felt betyr ukjent, men utfylt må være gyldig
    const date = dateText.trim() === '' ? null : parseDateInput(dateText);
    if (dateText.trim() !== '' && !date) {
      setError(t('profile.recordDateInvalid'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      if (existing) {
        // Ved redigering sendes tømte felter som null slik at de nullstilles
        await updateRun(existing.id, {
          distanceM,
          durationSec,
          date,
          location: location.trim() || null,
          notes: notes.trim() || null,
          isShared,
        });
      } else {
        await addRun({
          distanceM,
          durationSec,
          date: date ?? undefined,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
          isShared,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      setError(feilmelding(err));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!existing) return;
    confirmDialog({
      title: t('profile.recordDeleteTitle'),
      message: t('profile.recordDeleteMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
      onConfirm: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        try {
          await deleteRun(existing.id);
          router.back();
        } catch (err) {
          infoDialog(t('profile.recordDeleteError'), feilmelding(err));
        }
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <ScreenHeader
          title={existing ? t('profile.recordEditTitle') : t('profile.recordNewTitle')}
        />
        {kindSelector}

        {/* Distanse: standarddistanser + fritt antall meter */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card style={{ gap: spacing.md }}>
            <AppText variant="label" color="muted">
              {t('profile.recordRunDistance')}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {STANDARD_RUN_DISTANCES.map((meters) => (
                <Chip
                  key={meters}
                  label={distanceLabel(meters, lang)}
                  selected={distanceText.trim() === String(meters)}
                  onPress={() => {
                    setDistanceText(String(meters));
                    if (error) setError(undefined);
                  }}
                />
              ))}
            </View>
            <Input
              label={t('profile.recordRunCustomDistance')}
              value={distanceText}
              onChangeText={setDistanceText}
              placeholder="1500"
              keyboardType="number-pad"
            />
          </Card>
        </Animated.View>

        {/* Tid og dato */}
        <Animated.View entering={FadeInDown.delay(60).duration(300)}>
          <Card style={{ marginTop: spacing.lg, gap: spacing.lg }}>
            <Input
              label={t('profile.recordRunTime')}
              value={timeText}
              onChangeText={setTimeText}
              placeholder="22:31"
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              autoCorrect={false}
            />
            <Input
              label={t('profile.recordDate')}
              value={dateText}
              onChangeText={setDateText}
              placeholder={t('profile.recordDatePlaceholder')}
              autoCorrect={false}
            />
          </Card>
        </Animated.View>

        {/* Kontekst: sted og notater */}
        <Animated.View entering={FadeInDown.delay(120).duration(300)}>
          <Card style={{ marginTop: spacing.lg, gap: spacing.lg }}>
            <Input
              label={t('profile.recordLocation')}
              value={location}
              onChangeText={setLocation}
              placeholder={t('profile.recordLocationPlaceholder')}
              maxLength={80}
            />
            <Input
              label={t('profile.recordNotes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('profile.recordNotesPlaceholder')}
              maxLength={500}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </Card>
        </Animated.View>

        {/* Synlighet for venner */}
        <Animated.View entering={FadeInDown.delay(180).duration(300)}>
          <Card style={{ marginTop: spacing.lg }}>
            <Pressable
              disabled={saving}
              onPress={() => setIsShared((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyBold">{t('profile.recordShareTitle')}</AppText>
                <AppText variant="caption" color="muted">
                  {t('profile.recordShareSubtitle')}
                </AppText>
              </View>
              <Switch
                value={isShared}
                onValueChange={setIsShared}
                disabled={saving}
                trackColor={{ false: colors.border, true: colors.accent }}
                ios_backgroundColor={colors.border}
              />
            </Pressable>
          </Card>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(240).duration(300)}
          style={{ marginTop: spacing.xl, gap: spacing.md }}
        >
          {error ? (
            <AppText variant="body" style={{ color: colors.danger, textAlign: 'center' }}>
              {error}
            </AppText>
          ) : null}
          <Button
            title={t('common.save')}
            icon="checkmark"
            size="lg"
            fullWidth
            loading={saving}
            onPress={save}
          />
          {existing ? (
            <Button
              title={t('profile.recordDeleteTitle')}
              icon="trash-outline"
              variant="danger"
              fullWidth
              onPress={confirmDelete}
            />
          ) : null}
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export default function NewRecordScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; runId?: string | string[] }>();
  const id = firstParam(params.id);
  const runId = firstParam(params.runId);
  const t = useT();
  const { colors, spacing } = useTheme();

  const loaded = useRecordStore((s) => s.loaded);
  const loading = useRecordStore((s) => s.loading);
  const load = useRecordStore((s) => s.load);
  const existing = useRecordStore((s) => (id ? s.records.find((r) => r.id === id) : undefined));
  const existingRun = useRecordStore((s) => (runId ? s.runs.find((r) => r.id === runId) : undefined));

  // Ved oppretting velger brukeren type øverst; ved redigering er typen låst
  const [kind, setKind] = useState<'strength' | 'run'>('strength');
  const [loadError, setLoadError] = useState<string | null>(null);

  const editing = Boolean(id || runId);

  const loadOnce = () => {
    setLoadError(null);
    load().catch((error: unknown) => setLoadError(feilmelding(error)));
  };

  // Dyplenke/refresh på nett: skjermen kan mountes før storen er lastet — hent
  // selv, ellers ville redigering stille blitt til «ny rekord» (duplikat).
  useEffect(() => {
    if (editing && !loaded && !loading) {
      load().catch((error: unknown) => setLoadError(feilmelding(error)));
    }
  }, [editing, loaded, loading, load]);

  if (editing && !loaded) {
    return (
      <Screen>
        <ScreenHeader title={t('profile.recordEditTitle')} />
        {loadError ? (
          <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl }}>
            <AppText variant="body" color="danger" style={{ textAlign: 'center' }}>
              {loadError}
            </AppText>
            <Button title={t('common.retry')} variant="secondary" size="sm" onPress={loadOnce} />
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
      </Screen>
    );
  }

  if ((id && !existing) || (runId && !existingRun)) {
    return (
      <Screen>
        <ScreenHeader title={t('profile.recordEditTitle')} />
        <EmptyState
          icon="trophy-outline"
          title={t('profile.recordNotFoundTitle')}
          message={t('profile.recordNotFoundMessage')}
        />
      </Screen>
    );
  }

  // key sikrer at skjemaet re-initialiseres om man navigerer mellom rekorder
  if (runId && existingRun) return <RunForm key={existingRun.id} existing={existingRun} />;
  if (id && existing) return <RecordForm key={existing.id} existing={existing} />;

  const kindSelector = (
    <View style={{ marginBottom: spacing.lg }}>
      <SegmentedControl
        options={[
          { label: t('profile.recordKindStrength'), value: 'strength' },
          { label: t('profile.recordKindRun'), value: 'run' },
        ]}
        value={kind}
        onChange={(v) => setKind(v as 'strength' | 'run')}
      />
    </View>
  );
  return kind === 'run' ? (
    <RunForm kindSelector={kindSelector} />
  ) : (
    <RecordForm kindSelector={kindSelector} />
  );
}
