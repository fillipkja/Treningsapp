// Statistikk-taben: appens grafsenter. Totaler, volumtrend, økter per uke,
// aktivitetskalender, styrkeutvikling per øvelse, favorittøvelser og rekorder.

import { Ionicons } from '@expo/vector-icons';
import {
  addMonths,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  getISOWeek,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { enUS, nb as nbLocale } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BarChart, CalendarHeatmap, LineChart, StatTile } from '@/components/charts';
import {
  AppText,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  ListItem,
  Screen,
  ScreenHeader,
  SegmentedControl,
} from '@/components/ui';
import { useLanguage, useT } from '@/i18n';
import { exerciseDisplayName } from '@/lib/data/exercise-i18n';
import { findExercise } from '@/lib/data/exercises';
import {
  dateKey,
  formatCompact,
  formatKg,
  formatNumber,
  formatRelativeDate,
  formatShortDate,
  formatVolume,
} from '@/lib/format';
import { currentStreak } from '@/lib/logic/streaks';
import { volumeByDate } from '@/lib/logic/workout-math';
import { useExerciseStore } from '@/lib/store/exercises';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme } from '@/theme';
import type { Workout } from '@/types';

type Resolution = 'uker' | 'mnd';

const WEEK_OPTS = { weekStartsOn: 1 } as const;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Seksjon med tittel og innslidende innhold */
function Section({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: ReactNode;
}) {
  const { spacing } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(350)}
      style={{ gap: spacing.md, marginTop: spacing.xl }}
    >
      <AppText variant="subheading">{title}</AppText>
      {children}
    </Animated.View>
  );
}

// Ukedagsheader i aktivitetskalenderen, mandag først
const HEATMAP_DAY_LABELS = {
  nb: ['M', 'T', 'O', 'T', 'F', 'L', 'S'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
} as const;

export default function StatistikkScreen() {
  const { colors, spacing, radius } = useTheme();
  const t = useT();
  const lang = useLanguage();
  const dateLocale = lang === 'en' ? enUS : nbLocale;
  const router = useRouter();

  const workouts = useWorkoutStore((s) => s.workouts);
  const prs = useWorkoutStore((s) => s.prs);
  const loaded = useWorkoutStore((s) => s.loaded);
  const loading = useWorkoutStore((s) => s.loading);
  const loadWorkouts = useWorkoutStore((s) => s.load);
  const customExercises = useExerciseStore((s) => s.customExercises);

  const [loadError, setLoadError] = useState<string | null>(null);
  /** Bootstrap-lastingen svelger feil: prøv én gang selv, deretter kun manuelt */
  const attemptedLoad = useRef(false);

  const loadOnce = () => {
    setLoadError(null);
    loadWorkouts().catch((error: unknown) =>
      setLoadError(error instanceof Error && error.message ? error.message : t('error.generic')),
    );
  };

  useEffect(() => {
    if (loaded || loading || attemptedLoad.current) return;
    attemptedLoad.current = true;
    loadOnce();
    // loadOnce leser kun stabile referanser
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, loading]);

  const [resolution, setResolution] = useState<Resolution>('uker');
  const [heatMonth, setHeatMonth] = useState(() => startOfMonth(new Date()));
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);

  const exerciseName = (id: string): string => {
    const exercise = findExercise(id) ?? customExercises.find((e) => e.id === id);
    return exercise ? exerciseDisplayName(exercise, lang) : t('stats.unknownExercise');
  };

  // --- Totaler ---
  const totals = useMemo(() => {
    return {
      count: workouts.length,
      volume: workouts.reduce((sum, w) => sum + w.totalVolumeKg, 0),
      streak: currentStreak(
        workouts.map((w) => w.date),
        new Date(),
      ),
      prCount: workouts.reduce((sum, w) => sum + w.prCount, 0),
    };
  }, [workouts]);

  // --- Treningsvolum per uke (12 uker) eller måned (6 mnd) ---
  const volumePoints = useMemo(() => {
    const now = new Date();
    if (resolution === 'uker') {
      const start = startOfWeek(subWeeks(now, 11), WEEK_OPTS);
      const weeks = eachWeekOfInterval({ start, end: now }, WEEK_OPTS);
      const byWeek = new Map<string, number>();
      for (const w of workouts) {
        const key = dateKey(startOfWeek(parseISO(w.date), WEEK_OPTS));
        byWeek.set(key, (byWeek.get(key) ?? 0) + w.totalVolumeKg);
      }
      return weeks.map((ws) => ({
        x: formatShortDate(ws.toISOString()),
        y: byWeek.get(dateKey(ws)) ?? 0,
      }));
    }
    const start = startOfMonth(subMonths(now, 5));
    const months = eachMonthOfInterval({ start, end: now });
    const byMonth = new Map<string, number>();
    for (const w of workouts) {
      const key = format(parseISO(w.date), 'yyyy-MM');
      byMonth.set(key, (byMonth.get(key) ?? 0) + w.totalVolumeKg);
    }
    return months.map((m) => ({
      x: capitalize(format(m, 'MMM', { locale: dateLocale })),
      y: byMonth.get(format(m, 'yyyy-MM')) ?? 0,
    }));
  }, [workouts, resolution, dateLocale]);

  // --- Økter per uke (siste 8 uker) ---
  const weeklySessions = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(subWeeks(now, 7), WEEK_OPTS);
    const weeks = eachWeekOfInterval({ start, end: now }, WEEK_OPTS);
    const counts = new Map<string, number>();
    for (const w of workouts) {
      const key = dateKey(startOfWeek(parseISO(w.date), WEEK_OPTS));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return weeks.map((ws) => ({
      label: t('stats.weekLabel', { num: getISOWeek(ws) }),
      value: counts.get(dateKey(ws)) ?? 0,
    }));
  }, [workouts, t]);

  // --- Aktivitetskalender: intensitet 1–4 relativt til egen beste dag ---
  const dayVolumes = useMemo(() => volumeByDate(workouts), [workouts]);
  const heatValues = useMemo(() => {
    const maxDay = Math.max(0, ...dayVolumes.values());
    const out: Record<string, number> = {};
    for (const [key, vol] of dayVolumes) {
      out[key] = maxDay > 0 ? Math.min(4, Math.max(1, Math.ceil((vol / maxDay) * 4))) : 1;
    }
    return out;
  }, [dayVolumes]);

  const workoutsByDay = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of workouts) {
      const key = dateKey(parseISO(w.date));
      const existing = map.get(key);
      if (existing) existing.push(w);
      else map.set(key, [w]);
    }
    return map;
  }, [workouts]);

  const canGoForward = !isSameMonth(heatMonth, new Date());

  const shiftMonth = (direction: -1 | 1) => {
    Haptics.selectionAsync().catch(() => {});
    setHeatMonth((m) => (direction === -1 ? subMonths(m, 1) : addMonths(m, 1)));
  };

  const onHeatmapDayPress = (key: string) => {
    const dayWorkouts = workoutsByDay.get(key);
    if (dayWorkouts && dayWorkouts.length > 0) {
      router.push(`/workout/${dayWorkouts[0].id}`);
    }
  };

  // --- Styrkeutvikling: øvelser med PR-historikk, flest datapunkter først ---
  const prExercises = useMemo(
    () =>
      prs
        .filter((p) => p.history.length > 0)
        .sort((a, b) => b.history.length - a.history.length),
    [prs],
  );
  const selectedPr =
    prExercises.find((p) => p.exerciseId === selectedPrId) ?? prExercises[0];

  const strengthPoints = useMemo(() => {
    if (!selectedPr) return [];
    return selectedPr.history.map((h) => ({ x: formatShortDate(h.date), y: h.est1RM }));
    // lang: formatShortDate leser språket ikke-reaktivt — recompute ved språkbytte
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPr, lang]);

  const selectPrExercise = (exerciseId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedPrId(exerciseId);
  };

  // --- Favorittøvelser: topp 5 etter antall økter de forekommer i ---
  const favorites = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of workouts) {
      const unique = new Set(w.exercises.map((e) => e.exerciseId));
      for (const id of unique) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([exerciseId, count]) => ({
        exerciseId,
        count,
        bestWeightKg: prs.find((p) => p.exerciseId === exerciseId)?.bestWeightKg,
      }));
  }, [workouts, prs]);

  // --- Personlige rekorder sortert på beste est. 1RM ---
  const sortedPrs = useMemo(
    () => [...prs].sort((a, b) => b.bestEst1RM - a.bestEst1RM),
    [prs],
  );

  // Venter på første lasting fra serveren
  if (!loaded) {
    return (
      <Screen>
        <ScreenHeader title={t('stats.title')} hideBack />
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

  if (workouts.length === 0) {
    return (
      <Screen>
        <ScreenHeader title={t('stats.title')} hideBack />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="stats-chart-outline"
            title={t('stats.emptyTitle')}
            message={t('stats.emptyMessage')}
            actionTitle={t('stats.emptyAction')}
            onAction={() => router.push('/(tabs)/trening')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader title={t('stats.title')} hideBack />

      {/* Totaler i 2x2-grid */}
      <Animated.View entering={FadeInDown.duration(350)} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <StatTile
              label={t('stats.totalWorkouts')}
              value={formatNumber(totals.count)}
              icon="barbell-outline"
            />
          </View>
          <View style={{ flex: 1 }}>
            <StatTile
              label={t('stats.totalVolume')}
              value={formatVolume(totals.volume)}
              icon="trending-up-outline"
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <StatTile
              label={t('stats.currentStreak')}
              value={formatNumber(totals.streak)}
              icon="flame"
              tint={colors.accentWarm}
            />
          </View>
          <View style={{ flex: 1 }}>
            <StatTile
              label={t('common.records')}
              value={formatNumber(totals.prCount)}
              icon="trophy"
              tint={colors.gold}
            />
          </View>
        </View>
      </Animated.View>

      {/* Oppløsning for volumgrafen */}
      <View style={{ marginTop: spacing.xl }}>
        <SegmentedControl
          options={[
            { label: t('stats.seg12Weeks'), value: 'uker' },
            { label: t('stats.seg6Months'), value: 'mnd' },
          ]}
          value={resolution}
          onChange={(v) => setResolution(v as Resolution)}
        />
      </View>

      <Section title={t('stats.volumeSection')} delay={60}>
        <Card>
          <LineChart
            series={[{ label: t('common.volume'), points: volumePoints }]}
            yFormatter={(v) => formatCompact(v)}
          />
        </Card>
      </Section>

      <Section title={t('stats.sessionsPerWeek')} delay={120}>
        <Card>
          <BarChart
            data={weeklySessions}
            highlightIndex={weeklySessions.length - 1}
            yFormatter={(v) => (Number.isInteger(v) ? formatNumber(v) : '')}
          />
        </Card>
      </Section>

      <Section title={t('stats.activityCalendar')} delay={180}>
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}
          >
            <Pressable
              hitSlop={8}
              onPress={() => shiftMonth(-1)}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: radius.full,
                backgroundColor: colors.surfaceElevated,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
            </Pressable>
            <AppText variant="bodyBold">
              {capitalize(format(heatMonth, 'MMMM yyyy', { locale: dateLocale }))}
            </AppText>
            <Pressable
              hitSlop={8}
              disabled={!canGoForward}
              onPress={() => shiftMonth(1)}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: radius.full,
                backgroundColor: colors.surfaceElevated,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: !canGoForward ? 0.35 : pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
          <CalendarHeatmap
            month={heatMonth}
            values={heatValues}
            dayLabels={[...HEATMAP_DAY_LABELS[lang]]}
            onDayPress={onHeatmapDayPress}
          />
        </Card>
      </Section>

      <Section title={t('stats.strengthSection')} delay={240}>
        {prExercises.length === 0 || !selectedPr ? (
          <Card>
            <EmptyState
              icon="trending-up-outline"
              title={t('stats.strengthEmptyTitle')}
              message={t('stats.strengthEmptyMessage')}
            />
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
            >
              {prExercises.map((pr) => (
                <Chip
                  key={pr.exerciseId}
                  label={exerciseName(pr.exerciseId)}
                  selected={pr.exerciseId === selectedPr.exerciseId}
                  onPress={() => selectPrExercise(pr.exerciseId)}
                />
              ))}
            </ScrollView>
            <Card>
              <LineChart
                series={[{ label: t('stats.est1RM'), points: strengthPoints }]}
                yFormatter={(v) => formatKg(v)}
                showDots
              />
              <View style={{ marginTop: spacing.md }}>
                <AppText variant="caption" color="secondary">
                  {t('stats.bestLift', {
                    weight: formatKg(selectedPr.bestWeightKg),
                    reps: selectedPr.bestReps,
                    oneRm: formatKg(selectedPr.bestEst1RM),
                  })}
                </AppText>
              </View>
            </Card>
          </View>
        )}
      </Section>

      <Section title={t('stats.favoritesSection')} delay={300}>
        <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
          {favorites.map((fav, index) => (
            <View key={fav.exerciseId}>
              {index > 0 && <Divider />}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.md,
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: radius.full,
                    backgroundColor: index === 0 ? colors.accentMuted : colors.surfaceElevated,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText
                    variant="caption"
                    style={{
                      fontWeight: '700',
                      color: index === 0 ? colors.accent : colors.textSecondary,
                    }}
                  >
                    {index + 1}
                  </AppText>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyBold" numberOfLines={1}>
                    {exerciseName(fav.exerciseId)}
                  </AppText>
                  <AppText variant="caption" color="muted">
                    {fav.count === 1
                      ? t('stats.workoutCountOne')
                      : t('stats.workoutCountMany', { count: fav.count })}
                    {fav.bestWeightKg != null && fav.bestWeightKg > 0
                      ? ` · ${t('stats.bestWeight', { weight: formatKg(fav.bestWeightKg) })}`
                      : ''}
                  </AppText>
                </View>
              </View>
            </View>
          ))}
        </Card>
      </Section>

      {sortedPrs.length > 0 && (
        <Section title={t('stats.prSection')} delay={360}>
          <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
            {sortedPrs.map((pr, index) => (
              <View key={pr.exerciseId}>
                {index > 0 && <Divider />}
                <ListItem
                  title={exerciseName(pr.exerciseId)}
                  subtitle={t('stats.updatedAt', { date: formatRelativeDate(pr.updatedAt) })}
                  right={
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <AppText variant="bodyBold">{formatKg(pr.bestWeightKg)}</AppText>
                      <AppText variant="caption" color="muted">
                        {t('stats.est1RMValue', { value: formatKg(pr.bestEst1RM) })}
                      </AppText>
                    </View>
                  }
                  chevron
                  onPress={() => router.push(`/exercises/${pr.exerciseId}`)}
                />
              </View>
            ))}
          </Card>
        </Section>
      )}
    </Screen>
  );
}
