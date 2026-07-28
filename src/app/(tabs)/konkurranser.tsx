import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Sheet,
} from '@/components/ui';
import { t as translate, useLanguage, useT } from '@/i18n';
import { challengeTypeLabel } from '@/i18n/labels';
import { fetchFriendLeaderboard, type FriendLeaderboardResult } from '@/lib/api/leaderboard';
import { fetchProfilesByIds } from '@/lib/api/profiles';
import { formatNumber, formatVolume } from '@/lib/format';
import { BADGE_DEFS, badgeName } from '@/lib/logic/badges';
import { periodInterval } from '@/lib/logic/leaderboard';
import { POINTS } from '@/lib/logic/points';
import { useAuthStore } from '@/lib/store/auth';
import { useChallengeStore } from '@/lib/store/challenges';
import { useWorkoutStore } from '@/lib/store/workouts';
import { challengeTypeColors, tierColors, useTheme } from '@/theme';
import type { ChallengeType, Period, UserProfile } from '@/types';

/** Ikon per utfordringstype — fast tilordning, farge følger typen */
const TYPE_ICON: Record<ChallengeType, keyof typeof Ionicons.glyphMap> = {
  økter: 'checkmark-done',
  volum: 'barbell',
  prs: 'star',
  program: 'map',
};

interface BoardEntry {
  userId: string;
  points: number;
  workouts: number;
  volumeKg: number;
  prs: number;
  rank: number;
}

/** Poeng per bruker (økter, volum og rekorder), sortert med delt plassering ved likhet */
function toBoardEntries(rows: FriendLeaderboardResult[]): BoardEntry[] {
  const entries = rows.map((row) => ({
    userId: row.userId,
    points:
      row.workouts * POINTS.perWorkout +
      Math.floor(row.volumeKg / POINTS.volumeChunkKg) * POINTS.perVolumeChunk +
      row.prs * POINTS.perPR,
    workouts: row.workouts,
    volumeKg: row.volumeKg,
    prs: row.prs,
    rank: 0,
  }));
  entries.sort((a, b) => b.points - a.points);
  let prevPoints = Number.NaN;
  let prevRank = 0;
  entries.forEach((entry, i) => {
    entry.rank = entry.points === prevPoints ? prevRank : i + 1;
    prevPoints = entry.points;
    prevRank = entry.rank;
  });
  return entries;
}

export default function KonkurranserScreen() {
  const { colors, spacing, radius, isDark } = useTheme();
  const mode = isDark ? 'dark' : 'light';
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();

  const me = useAuthStore((s) => s.user);
  const earnedBadges = useWorkoutStore((s) => s.earnedBadges);
  const challengeItems = useChallengeStore((s) => s.items);
  const challengesLoaded = useChallengeStore((s) => s.loaded);
  const challengesLoading = useChallengeStore((s) => s.loading);
  const loadChallenges = useChallengeStore((s) => s.load);

  const [period, setPeriod] = useState<Period>('uke');
  const [showPointsInfo, setShowPointsInfo] = useState(false);
  const [board, setBoard] = useState<{
    period: Period;
    entries: BoardEntry[];
    profiles: Map<string, UserProfile>;
  } | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [challengesError, setChallengesError] = useState<string | null>(null);

  /** Gull/sølv/bronse til pallen */
  const medalColor = (rank: number): string | undefined => {
    if (rank === 1) return tierColors[mode].gull;
    if (rank === 2) return tierColors[mode].sølv;
    if (rank === 3) return tierColors[mode].bronse;
    return undefined;
  };

  const daysLeftLabel = (endIso: string): string => {
    const days = differenceInCalendarDays(parseISO(endIso), new Date());
    if (days <= 0) return t('compete.lastDay');
    if (days === 1) return t('compete.oneDayLeft');
    return t('common.daysLeft', { count: days });
  };

  const participantsLabel = (count: number): string =>
    count === 1 ? t('compete.participantsOne') : t('compete.participantsMany', { count });

  /** Perioden det pågår en henting for — hindrer at et tregt svar overskriver et nyere */
  const requestedPeriod = useRef<Period>(period);

  const loadBoard = useCallback(async () => {
    requestedPeriod.current = period;
    try {
      setBoardError(null);
      const { start, end } = periodInterval(period, new Date());
      const rows = await fetchFriendLeaderboard(start, end);
      const profiles = await fetchProfilesByIds(rows.map((r) => r.userId));
      if (requestedPeriod.current !== period) return; // utdatert svar
      setBoard({ period, entries: toBoardEntries(rows), profiles });
    } catch (error) {
      if (requestedPeriod.current !== period) return;
      setBoardError(error instanceof Error ? error.message : translate('error.generic'));
    }
  }, [period]);

  // Refetch ved fokus og ved bytte av periode
  useFocusEffect(
    useCallback(() => {
      void loadBoard();
    }, [loadBoard]),
  );

  // Fallback hvis bootstrap-lastingen av utfordringer feilet. challengesError må
  // være med: uten den kaller effekten load() på nytt hver gang loading går
  // true→false, og et feilende kall gjentas i det uendelige.
  useFocusEffect(
    useCallback(() => {
      if (challengesLoaded || challengesLoading || challengesError) return;
      loadChallenges().catch((error: unknown) =>
        setChallengesError(
          error instanceof Error && error.message ? error.message : translate('error.generic'),
        ),
      );
    }, [challengesLoaded, challengesLoading, challengesError, loadChallenges]),
  );

  const challengeCards = useMemo(() => {
    const nowMs = Date.now();
    const withEnd = challengeItems.map((it) => ({
      ...it,
      endMs: parseISO(it.challenge.endDate).getTime(),
    }));
    const active = withEnd.filter((it) => it.endMs >= nowMs).sort((a, b) => a.endMs - b.endMs);
    const ended = withEnd.filter((it) => it.endMs < nowMs).sort((a, b) => b.endMs - a.endMs);
    return [...active, ...ended];
  }, [challengeItems]);

  const recentBadges = useMemo(() => {
    return [...earnedBadges]
      .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
      .map((eb) => BADGE_DEFS.find((d) => d.id === eb.badgeId))
      .filter((def): def is (typeof BADGE_DEFS)[number] => Boolean(def))
      .slice(0, 4);
  }, [earnedBadges]);

  const boardLoading = !boardError && (!board || board.period !== period);
  const profiles = board?.profiles ?? new Map<string, UserProfile>();

  const nameOf = (userId: string): string =>
    userId === me?.id
      ? t('common.you')
      : (profiles.get(userId)?.displayName ?? t('compete.unknownUser'));

  const renderRow = (entry: BoardEntry) => {
    const profile = profiles.get(entry.userId);
    const isMe = entry.userId === me?.id;
    return (
      <Pressable
        key={entry.userId}
        disabled={isMe}
        onPress={() => router.push(`/friends/${entry.userId}`)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          backgroundColor: isMe ? colors.accentMuted : 'transparent',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <AppText variant="bodyBold" color="muted" style={{ width: 22, textAlign: 'center' }}>
          {entry.rank}
        </AppText>
        <Avatar
          name={profile?.displayName ?? '?'}
          color={profile?.avatarColor ?? colors.accent}
          uri={profile?.avatarUri}
          size={36}
        />
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {nameOf(entry.userId)}
          </AppText>
          <AppText variant="caption" color="muted">
            {`${t('compete.workoutsCount', { count: formatNumber(entry.workouts) })} · ${formatVolume(entry.volumeKg)}`}
          </AppText>
        </View>
        <AppText variant="bodyBold" color="accent">
          {t('compete.pointsShort', { points: formatNumber(entry.points) })}
        </AppText>
      </Pressable>
    );
  };

  const renderPodiumColumn = (entry: BoardEntry) => {
    const profile = profiles.get(entry.userId);
    const isMe = entry.userId === me?.id;
    const medal = medalColor(entry.rank) ?? colors.border;
    const size = entry.rank === 1 ? 72 : 54;
    return (
      <Pressable
        key={entry.userId}
        disabled={isMe}
        onPress={() => router.push(`/friends/${entry.userId}`)}
        style={({ pressed }) => ({
          alignItems: 'center',
          gap: spacing.xs,
          width: '30%',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ padding: 3, borderWidth: 3, borderColor: medal, borderRadius: radius.full }}>
          <Avatar
            name={profile?.displayName ?? '?'}
            color={profile?.avatarColor ?? colors.accent}
            uri={profile?.avatarUri}
            size={size}
          />
        </View>
        <View
          style={{
            borderWidth: 1.5,
            borderColor: medal,
            borderRadius: radius.full,
            paddingHorizontal: spacing.sm,
            paddingVertical: 1,
          }}
        >
          <AppText variant="caption" style={{ color: medal, fontWeight: '700' }}>
            {entry.rank}
          </AppText>
        </View>
        <AppText variant="caption" numberOfLines={1} style={{ fontWeight: '600', maxWidth: '100%' }}>
          {nameOf(entry.userId)}
        </AppText>
        <AppText variant="caption" color="muted">
          {t('compete.pointsShort', { points: formatNumber(entry.points) })}
        </AppText>
      </Pressable>
    );
  };

  const renderBoard = () => {
    if (boardError) {
      return (
        <Card>
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <AppText variant="caption" color="danger" style={{ textAlign: 'center' }}>
              {boardError}
            </AppText>
            <Button
              title={t('common.retry')}
              size="sm"
              variant="secondary"
              onPress={() => void loadBoard()}
            />
          </View>
        </Card>
      );
    }
    if (boardLoading || !board) {
      return (
        <Card>
          <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg }}>
            <ActivityIndicator color={colors.accent} />
            <AppText variant="caption" color="muted">
              {t('compete.loadingBoard')}
            </AppText>
          </View>
        </Card>
      );
    }

    const entries = board.entries;
    // Kun meg selv: min rad + oppfordring til å legge til venner
    if (entries.length <= 1) {
      return (
        <View style={{ gap: spacing.md }}>
          {entries.length === 1 ? <Card padded={false}>{renderRow(entries[0])}</Card> : null}
          <Card onPress={() => router.push('/friends/add')}>
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
                <Ionicons name="person-add" size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyBold">{t('compete.addFriendsTitle')}</AppText>
                <AppText variant="caption" color="muted">
                  {t('compete.addFriendsBody')}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Card>
        </View>
      );
    }

    const top = entries.slice(0, 3);
    const podium = [top[1], top[0], top[2]].filter((e): e is BoardEntry => Boolean(e));
    const rest = entries.slice(3);
    return (
      <Card>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-evenly',
            paddingVertical: spacing.sm,
          }}
        >
          {podium.map(renderPodiumColumn)}
        </View>
        {rest.length > 0 ? (
          <View style={{ marginTop: spacing.md, gap: spacing.xs }}>{rest.map(renderRow)}</View>
        ) : null}
      </Card>
    );
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('compete.title')} hideBack />

      {/* Rangering blant venner */}
      <Animated.View entering={FadeInDown.duration(300)} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="label" color="muted">
            {t('compete.leaderboard')}
          </AppText>
          <Pressable hitSlop={8} onPress={() => setShowPointsInfo(true)}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <SegmentedControl
          options={[
            { label: t('compete.week'), value: 'uke' },
            { label: t('compete.month'), value: 'måned' },
          ]}
          value={period}
          onChange={(v) => setPeriod(v as Period)}
        />

        {renderBoard()}
      </Animated.View>

      {/* Utfordringer */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(300)}
        style={{ marginTop: spacing.xl, gap: spacing.md }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="label" color="muted">
            {t('compete.challenges')}
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
              {t('compete.newChallenge')}
            </AppText>
          </Pressable>
        </View>

        {!challengesLoaded && challengesError ? (
          <Card>
            <View style={{ alignItems: 'center', gap: spacing.md }}>
              <AppText variant="caption" color="danger" style={{ textAlign: 'center' }}>
                {challengesError}
              </AppText>
              <Button
                title={t('common.retry')}
                size="sm"
                variant="secondary"
                onPress={() => {
                  setChallengesError(null);
                  loadChallenges().catch((error: unknown) =>
                    setChallengesError(
                      error instanceof Error && error.message
                        ? error.message
                        : translate('error.generic'),
                    ),
                  );
                }}
              />
            </View>
          </Card>
        ) : !challengesLoaded && challengesLoading ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          </Card>
        ) : challengeCards.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon="flash-outline"
              title={t('compete.noChallengesTitle')}
              message={t('compete.noChallengesBody')}
              actionTitle={t('compete.newChallenge')}
              onAction={() => router.push('/challenges/new')}
            />
          </Card>
        ) : (
          challengeCards.map(({ challenge, endMs }) => {
            const ended = endMs < Date.now();
            const tint = challengeTypeColors[mode][challenge.type];
            return (
              <Card key={challenge.id} onPress={() => router.push(`/challenges/${challenge.id}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      backgroundColor: ended ? colors.surfaceElevated : `${tint}29`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={TYPE_ICON[challenge.type]}
                      size={22}
                      color={ended ? colors.textMuted : tint}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="bodyBold" numberOfLines={1}>
                      {challenge.name}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {`${challengeTypeLabel(challenge.type, lang)} · ${ended ? t('compete.ended') : daysLeftLabel(challenge.endDate)} · ${participantsLabel(challenge.participants.length)}`}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </Card>
            );
          })
        )}
      </Animated.View>

      {/* Merker */}
      <Animated.View
        entering={FadeInDown.delay(160).duration(300)}
        style={{ marginTop: spacing.xl, gap: spacing.md }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="label" color="muted">
            {t('common.badges')}
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
              {t('compete.badgesSeeAll', {
                earned: earnedBadges.length,
                total: BADGE_DEFS.length,
              })}
            </AppText>
            <Ionicons name="chevron-forward" size={14} color={colors.accent} />
          </Pressable>
        </View>

        <Card>
          {recentBadges.length === 0 ? (
            <AppText variant="caption" color="muted">
              {t('compete.noBadgesYet')}
            </AppText>
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {recentBadges.map((def) => {
                const tint = tierColors[mode][def.tier];
                return (
                  <View key={def.id} style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: radius.full,
                        backgroundColor: `${tint}29`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons
                        name={def.icon as keyof typeof Ionicons.glyphMap}
                        size={26}
                        color={tint}
                      />
                    </View>
                    <AppText variant="caption" numberOfLines={2} style={{ textAlign: 'center' }}>
                      {badgeName(def.id, lang)}
                    </AppText>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </Animated.View>

      {/* Poengforklaring */}
      <Sheet
        visible={showPointsInfo}
        onClose={() => setShowPointsInfo(false)}
        title={t('compete.pointsInfoTitle')}
      >
        <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
          {[
            {
              icon: 'barbell' as const,
              title: t('compete.pointsPerWorkout', { points: POINTS.perWorkout }),
              body: t('compete.pointsPerWorkoutBody'),
            },
            {
              icon: 'trending-up' as const,
              title: t('compete.pointsPerVolume', {
                points: POINTS.perVolumeChunk,
                chunk: POINTS.volumeChunkKg,
              }),
              body: t('compete.pointsPerVolumeBody'),
            },
            {
              icon: 'trophy' as const,
              title: t('compete.pointsPerPr', { points: POINTS.perPR }),
              body: t('compete.pointsPerPrBody'),
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
            {t('compete.pointsInfoFooter')}
          </AppText>
        </View>
      </Sheet>
    </Screen>
  );
}
