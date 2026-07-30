import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText, Button, Card, EmptyState, Screen, ScreenHeader } from '@/components/ui';
import { t as tGlobal, useLanguage, useT } from '@/i18n';
import { distanceLabel } from '@/i18n/labels';
import { exerciseDisplayName } from '@/lib/data/exercise-i18n';
import { formatDuration, formatKg, formatRecordDate } from '@/lib/format';
import { getExerciseById } from '@/lib/store/exercises';
import { useRecordStore } from '@/lib/store/records';
import { useTheme } from '@/theme';
import type { ManualRecord, RunRecord } from '@/types';

function feilmelding(error: unknown): string {
  return error instanceof Error && error.message ? error.message : tGlobal('error.generic');
}

function RecordCard({ record, onPress }: { record: ManualRecord; onPress: () => void }) {
  const t = useT();
  const lang = useLanguage();
  const { colors, spacing } = useTheme();

  const def = getExerciseById(record.exerciseId);
  const name = def ? exerciseDisplayName(def, lang) : t('stats.unknownExercise');

  const meta: string[] = [];
  if (record.date) meta.push(formatRecordDate(record.date));
  if (record.location) meta.push(record.location);
  if (record.bodyweightKg) {
    meta.push(t('profile.recordBodyweightShort', { weight: formatKg(record.bodyweightKg) }));
  }

  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.gold,
          }}
        >
          <Ionicons name="trophy" size={18} color={colors.gold} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {name}
          </AppText>
          {meta.length > 0 ? (
            <AppText variant="caption" color="muted" numberOfLines={1}>
              {meta.join(' · ')}
            </AppText>
          ) : null}
          {record.notes ? (
            <AppText variant="caption" color="secondary" numberOfLines={2}>
              {record.notes}
            </AppText>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <AppText variant="subheading" style={{ color: colors.gold }}>
            {formatKg(record.weightKg)}
          </AppText>
          <AppText variant="caption" color="muted">
            {record.sets > 1
              ? `${record.sets} × ${record.reps}`
              : record.reps === 1
                ? t('profile.recordOneRep')
                : t('profile.recordReps', { count: record.reps })}
          </AppText>
          {/* Skjulte rekorder markeres diskret — venner ser dem ikke */}
          {record.isShared ? null : (
            <Ionicons
              name="eye-off-outline"
              size={14}
              color={colors.textMuted}
              accessibilityLabel={t('profile.recordHidden')}
            />
          )}
        </View>
      </View>
    </Card>
  );
}

function RunCard({ run, onPress }: { run: RunRecord; onPress: () => void }) {
  const t = useT();
  const lang = useLanguage();
  const { colors, spacing } = useTheme();

  const meta: string[] = [];
  if (run.date) meta.push(formatRecordDate(run.date));
  if (run.location) meta.push(run.location);

  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.accentMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="footsteps-outline" size={18} color={colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {distanceLabel(run.distanceM, lang)}
          </AppText>
          {meta.length > 0 ? (
            <AppText variant="caption" color="muted" numberOfLines={1}>
              {meta.join(' · ')}
            </AppText>
          ) : null}
          {run.notes ? (
            <AppText variant="caption" color="secondary" numberOfLines={2}>
              {run.notes}
            </AppText>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <AppText variant="subheading" style={{ color: colors.accent }}>
            {formatDuration(run.durationSec)}
          </AppText>
          {/* Skjulte rekorder markeres diskret — venner ser dem ikke */}
          {run.isShared ? null : (
            <Ionicons
              name="eye-off-outline"
              size={14}
              color={colors.textMuted}
              accessibilityLabel={t('profile.recordHidden')}
            />
          )}
        </View>
      </View>
    </Card>
  );
}

export default function RecordsScreen() {
  const router = useRouter();
  const t = useT();
  const { colors, spacing } = useTheme();

  const records = useRecordStore((s) => s.records);
  const runs = useRecordStore((s) => s.runs);
  const loaded = useRecordStore((s) => s.loaded);
  const loading = useRecordStore((s) => s.loading);
  const load = useRecordStore((s) => s.load);

  const [loadError, setLoadError] = useState<string | null>(null);
  /** Bootstrap-lastingen svelger feil: prøv én gang selv, deretter kun manuelt */
  const attemptedLoad = useRef(false);

  const loadOnce = () => {
    setLoadError(null);
    load().catch((error: unknown) => setLoadError(feilmelding(error)));
  };

  useEffect(() => {
    if (loaded || loading || attemptedLoad.current) return;
    attemptedLoad.current = true;
    loadOnce();
    // loadOnce leser kun stabile referanser
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, loading]);

  const addButton = (
    <Pressable
      hitSlop={8}
      onPress={() => router.push('/records/new')}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons name="add" size={26} color={colors.accent} />
    </Pressable>
  );

  if (!loaded) {
    return (
      <Screen>
        <ScreenHeader title={t('profile.recordsTitle')} right={addButton} />
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

  return (
    <Screen scroll>
      <ScreenHeader title={t('profile.recordsTitle')} right={addButton} />

      {records.length === 0 && runs.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title={t('profile.recordsEmptyTitle')}
          message={t('profile.recordsEmptyMessage')}
          actionTitle={t('profile.recordAdd')}
          onAction={() => router.push('/records/new')}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          <AppText variant="caption" color="muted">
            {t('profile.recordsHint')}
          </AppText>
          {/* Underoverskrifter vises kun når begge rekordtypene finnes */}
          {runs.length > 0 && records.length > 0 ? (
            <AppText variant="label" color="muted">
              {t('profile.recordsStrengthSection')}
            </AppText>
          ) : null}
          {records.map((record, index) => (
            <Animated.View
              key={record.id}
              entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(300)}
            >
              <RecordCard
                record={record}
                onPress={() => router.push(`/records/new?id=${record.id}`)}
              />
            </Animated.View>
          ))}
          {runs.length > 0 && records.length > 0 ? (
            <AppText variant="label" color="muted" style={{ marginTop: spacing.sm }}>
              {t('profile.recordsRunSection')}
            </AppText>
          ) : null}
          {runs.map((run, index) => (
            <Animated.View
              key={run.id}
              entering={FadeInDown.delay(Math.min(records.length + index, 8) * 40).duration(300)}
            >
              <RunCard run={run} onPress={() => router.push(`/records/new?runId=${run.id}`)} />
            </Animated.View>
          ))}
        </View>
      )}
    </Screen>
  );
}
