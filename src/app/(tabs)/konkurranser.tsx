import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays, isWithinInterval, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StatTile } from '@/components/charts';
import {
  AppText,
  Card,
  EmptyState,
  ProgressBar,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Sheet,
} from '@/components/ui';
import { formatNumber, formatVolume } from '@/lib/format';
import { BADGE_DEFS } from '@/lib/logic/badges';
import { periodInterval, workoutsInInterval } from '@/lib/logic/leaderboard';
import { POINTS, statsForWorkouts } from '@/lib/logic/points';
import { useChallengeStore } from '@/lib/store/challenges';
import { useProgramStore } from '@/lib/store/programs';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme } from '@/theme';
import type { Challenge, ChallengeType, Period, Program, Workout } from '@/types';

const CHALLENGE_META: Record<ChallengeType, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  økter: { label: 'Antall økter', icon: 'calendar' },
  volum: { label: 'Løftet volum', icon: 'barbell' },
  prs: { label: 'Personlige rekorder', icon: 'trophy' },
  program: { label: 'Fullfør program', icon: 'flag' },
};

/** Min fremdrift innenfor utfordringens tidsrom */
function challengeScore(challenge: Challenge, workouts: Workout[]): number {
  const interval = { start: parseISO(challenge.startDate), end: parseISO(challenge.endDate) };
  const inRange = workouts.filter((w) => isWithinInterval(parseISO(w.date), interval));
  switch (challenge.type) {
    case 'økter':
      return inRange.length;
    case 'volum':
      return inRange.reduce((sum, w) => sum + w.totalVolumeKg, 0);
    case 'prs':
      return inRange.reduce((sum, w) => sum + w.prCount, 0);
    case 'program':
      return inRange.filter((w) => w.programId === challenge.programId).length;
  }
}

/** Effektiv målverdi — programutfordringer faller tilbake til antall dager i programmet */
function challengeTarget(challenge: Challenge, programs: Program[]): number | undefined {
  if (challenge.target) return challenge.target;
  if (challenge.type === 'program') {
    return programs.find((p) => p.id === challenge.programId)?.days.length;
  }
  return undefined;
}

function progressLabel(type: ChallengeType, score: number, target?: number): string {
  const scoreText = type === 'volum' ? formatVolume(score) : formatNumber(score);
  if (!target) return scoreText;
  const targetText = type === 'volum' ? formatVolume(target) : formatNumber(target);
  return `${scoreText} av ${targetText}`;
}

function daysLeftLabel(endIso: string): string {
  const days = differenceInCalendarDays(parseISO(endIso), new Date());
  if (days <= 0) return 'Siste dag';
  if (days === 1) return '1 dag igjen';
  return `${days} dager igjen`;
}

export default function KonkurranserScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('uke');
  const [showPointsInfo, setShowPointsInfo] = useState(false);

  const myWorkouts = useWorkoutStore((s) => s.workouts);
  const earnedBadges = useWorkoutStore((s) => s.earnedBadges);
  const challenges = useChallengeStore((s) => s.challenges);
  const programs = useProgramStore((s) => s.programs);

  const periodStats = useMemo(() => {
    const interval = periodInterval(period, new Date());
    return statsForWorkouts(workoutsInInterval(myWorkouts, interval));
  }, [myWorkouts, period]);

  const activeSummaries = useMemo(() => {
    const nowMs = Date.now();
    return challenges
      .filter((c) => parseISO(c.endDate).getTime() >= nowMs)
      .map((challenge) => ({
        challenge,
        score: challengeScore(challenge, myWorkouts),
        target: challengeTarget(challenge, programs),
      }));
  }, [challenges, myWorkouts, programs]);

  /** Nylig avsluttede utfordringer (siste 30 dager) med resultat */
  const completedSummaries = useMemo(() => {
    const nowMs = Date.now();
    const cutoffMs = nowMs - 30 * 24 * 3_600_000;
    return challenges
      .filter((c) => {
        const endMs = parseISO(c.endDate).getTime();
        return endMs < nowMs && endMs >= cutoffMs;
      })
      .sort((a, b) => b.endDate.localeCompare(a.endDate))
      .map((challenge) => ({
        challenge,
        score: challengeScore(challenge, myWorkouts),
        target: challengeTarget(challenge, programs),
      }));
  }, [challenges, myWorkouts, programs]);

  const recentBadges = useMemo(() => {
    return [...earnedBadges]
      .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
      .map((eb) => BADGE_DEFS.find((d) => d.id === eb.badgeId))
      .filter((def): def is (typeof BADGE_DEFS)[number] => Boolean(def))
      .slice(0, 4);
  }, [earnedBadges]);

  return (
    <Screen scroll>
      <ScreenHeader title="Mål" hideBack />

      {/* Dine poeng */}
      <Animated.View entering={FadeInDown.duration(300)} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="label" color="muted">
            Dine poeng
          </AppText>
          <Pressable hitSlop={8} onPress={() => setShowPointsInfo(true)}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <SegmentedControl
          options={[
            { label: 'Uke', value: 'uke' },
            { label: 'Måned', value: 'måned' },
          ]}
          value={period}
          onChange={(v) => setPeriod(v as Period)}
        />

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <StatTile
              label="Poeng"
              value={formatNumber(periodStats.points)}
              icon="star-outline"
              onPress={() => setShowPointsInfo(true)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <StatTile
              label="Økter"
              value={formatNumber(periodStats.workouts)}
              icon="barbell-outline"
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <StatTile
              label="Volum"
              value={formatVolume(periodStats.volumeKg)}
              icon="trending-up-outline"
            />
          </View>
          <View style={{ flex: 1 }}>
            <StatTile label="Rekorder" value={formatNumber(periodStats.prs)} icon="trophy-outline" />
          </View>
        </View>
      </Animated.View>

      {/* Utfordringer */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(300)}
        style={{ marginTop: spacing.xl, gap: spacing.md }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="label" color="muted">
            Utfordringer
          </AppText>
          <Pressable
            hitSlop={8}
            onPress={() => router.push('/challenges/new')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="add" size={16} color={colors.accent} />
            <AppText variant="caption" color="accent" style={{ fontWeight: '600' }}>
              Ny utfordring
            </AppText>
          </Pressable>
        </View>

        {activeSummaries.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon="flash-outline"
              title="Ingen aktive utfordringer"
              message="Sett deg et mål — f.eks. 5 økter på én uke."
              actionTitle="Ny utfordring"
              onAction={() => router.push('/challenges/new')}
            />
          </Card>
        ) : (
          activeSummaries.map(({ challenge, score, target }) => {
            const meta = CHALLENGE_META[challenge.type];
            const progress = target && target > 0 ? Math.min(1, score / target) : 0;
            const reached = !!target && score >= target;
            return (
              <Card key={challenge.id} onPress={() => router.push(`/challenges/${challenge.id}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      backgroundColor: colors.accentMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={meta.icon} size={22} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <AppText variant="bodyBold" numberOfLines={1}>
                      {challenge.name}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {`${meta.label} · ${daysLeftLabel(challenge.endDate)}`}
                    </AppText>
                    <ProgressBar
                      progress={progress}
                      color={reached ? colors.success : undefined}
                      height={6}
                    />
                    <AppText variant="caption" color={reached ? 'success' : 'secondary'}>
                      {reached
                        ? `Målet nådd! 🎉 · ${progressLabel(challenge.type, score, target)}`
                        : progressLabel(challenge.type, score, target)}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </Card>
            );
          })
        )}

        {/* Nylig avsluttede utfordringer med resultat */}
        {completedSummaries.length > 0 ? (
          <>
            <AppText variant="label" color="muted" style={{ marginTop: spacing.sm }}>
              Fullførte
            </AppText>
            {completedSummaries.map(({ challenge, score, target }) => {
              const meta = CHALLENGE_META[challenge.type];
              const achieved = !!target && score >= target;
              return (
                <Card key={challenge.id} onPress={() => router.push(`/challenges/${challenge.id}`)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: radius.md,
                        backgroundColor: colors.surfaceElevated,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={meta.icon} size={22} color={colors.textMuted} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="bodyBold" numberOfLines={1}>
                        {challenge.name}
                      </AppText>
                      <AppText variant="caption" color="muted">
                        {`${meta.label} · Avsluttet`}
                      </AppText>
                      <AppText variant="caption" color={achieved ? 'success' : 'secondary'}>
                        {achieved
                          ? `🎉 Målet nådd · ${progressLabel(challenge.type, score, target)}`
                          : `Ikke nådd · ${progressLabel(challenge.type, score, target)}`}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                </Card>
              );
            })}
          </>
        ) : null}
      </Animated.View>

      {/* Merker */}
      <Animated.View
        entering={FadeInDown.delay(160).duration(300)}
        style={{ marginTop: spacing.xl, gap: spacing.md }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="label" color="muted">
            Merker
          </AppText>
          <Pressable
            hitSlop={8}
            onPress={() => router.push('/badges')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppText variant="caption" color="accent" style={{ fontWeight: '600' }}>
              {`Se alle (${earnedBadges.length}/${BADGE_DEFS.length})`}
            </AppText>
            <Ionicons name="chevron-forward" size={14} color={colors.accent} />
          </Pressable>
        </View>

        <Card>
          {recentBadges.length === 0 ? (
            <AppText variant="caption" color="muted">
              Ingen merker ennå — fullfør økter for å låse opp de første.
            </AppText>
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {recentBadges.map((def) => (
                <View key={def.id} style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: radius.full,
                      backgroundColor: colors.surfaceElevated,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText style={{ fontSize: 26 }}>{def.icon}</AppText>
                  </View>
                  <AppText variant="caption" numberOfLines={2} style={{ textAlign: 'center' }}>
                    {def.name}
                  </AppText>
                </View>
              ))}
            </View>
          )}
        </Card>
      </Animated.View>

      {/* Poengforklaring */}
      <Sheet
        visible={showPointsInfo}
        onClose={() => setShowPointsInfo(false)}
        title="Slik funker poengene"
      >
        <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
          {[
            {
              icon: 'barbell' as const,
              title: `${POINTS.perWorkout} poeng per økt`,
              body: 'Hver fullførte treningsøkt teller.',
            },
            {
              icon: 'trending-up' as const,
              title: `${POINTS.perVolumeChunk} poeng per ${POINTS.volumeChunkKg} kg`,
              body: 'Totalt løftet volum (vekt × reps) gir poeng.',
            },
            {
              icon: 'trophy' as const,
              title: `${POINTS.perPR} poeng per rekord`,
              body: 'Nye personlige rekorder belønnes ekstra.',
            },
          ].map((row) => (
            <View key={row.icon} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.md,
                  backgroundColor: colors.accentMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={row.icon} size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyBold">{row.title}</AppText>
                <AppText variant="caption" color="muted">
                  {row.body}
                </AppText>
              </View>
            </View>
          ))}
          <AppText variant="caption" color="muted">
            Poengene beregnes for valgt periode — uke eller måned.
          </AppText>
        </View>
      </Sheet>
    </Screen>
  );
}
