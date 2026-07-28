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
import { fetchFriendLeaderboard, type FriendLeaderboardResult } from '@/lib/api/leaderboard';
import { fetchProfilesByIds } from '@/lib/api/profiles';
import { formatNumber, formatVolume } from '@/lib/format';
import { BADGE_DEFS } from '@/lib/logic/badges';
import { periodInterval } from '@/lib/logic/leaderboard';
import { POINTS } from '@/lib/logic/points';
import { useAuthStore } from '@/lib/store/auth';
import { useChallengeStore } from '@/lib/store/challenges';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme, type ThemeColors } from '@/theme';
import type { ChallengeType, Period, UserProfile } from '@/types';

const CHALLENGE_META: Record<ChallengeType, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  økter: { label: 'Antall økter', icon: 'calendar' },
  volum: { label: 'Løftet volum', icon: 'barbell' },
  prs: { label: 'Personlige rekorder', icon: 'trophy' },
  program: { label: 'Fullfør program', icon: 'flag' },
};

/** Gull/sølv/bronse til pallen. Bronse finnes ikke i paletten — samme unntak som i badges. */
function medalColor(rank: number, colors: ThemeColors): string | undefined {
  if (rank === 1) return colors.gold;
  if (rank === 2) return colors.textSecondary;
  if (rank === 3) return '#b08d57';
  return undefined;
}

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

function daysLeftLabel(endIso: string): string {
  const days = differenceInCalendarDays(parseISO(endIso), new Date());
  if (days <= 0) return 'Siste dag';
  if (days === 1) return '1 dag igjen';
  return `${days} dager igjen`;
}

function participantsLabel(count: number): string {
  return count === 1 ? '1 deltaker' : `${count} deltakere`;
}

export default function KonkurranserScreen() {
  const { colors, spacing, radius } = useTheme();
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
      setBoardError(error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.');
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
          error instanceof Error && error.message ? error.message : 'Noe gikk galt. Prøv igjen.',
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
    userId === me?.id ? 'Deg' : (profiles.get(userId)?.displayName ?? 'Ukjent');

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
            {`${formatNumber(entry.workouts)} økter · ${formatVolume(entry.volumeKg)}`}
          </AppText>
        </View>
        <AppText variant="bodyBold" color="accent">{`${formatNumber(entry.points)} p`}</AppText>
      </Pressable>
    );
  };

  const renderPodiumColumn = (entry: BoardEntry) => {
    const profile = profiles.get(entry.userId);
    const isMe = entry.userId === me?.id;
    const medal = medalColor(entry.rank, colors) ?? colors.border;
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
        <AppText variant="caption" color="muted">{`${formatNumber(entry.points)} p`}</AppText>
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
            <Button title="Prøv igjen" size="sm" variant="secondary" onPress={() => void loadBoard()} />
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
              Henter rangering …
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
                <AppText variant="bodyBold">Legg til venner for å konkurrere</AppText>
                <AppText variant="caption" color="muted">
                  Rangeringen blir morsommere med flere på lista.
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
      <ScreenHeader title="Konkurrer" hideBack />

      {/* Rangering blant venner */}
      <Animated.View entering={FadeInDown.duration(300)} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="label" color="muted">
            Rangering blant venner
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

        {renderBoard()}
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

        {!challengesLoaded && challengesError ? (
          <Card>
            <View style={{ alignItems: 'center', gap: spacing.md }}>
              <AppText variant="caption" color="danger" style={{ textAlign: 'center' }}>
                {challengesError}
              </AppText>
              <Button
                title="Prøv igjen"
                size="sm"
                variant="secondary"
                onPress={() => {
                  setChallengesError(null);
                  loadChallenges().catch((error: unknown) =>
                    setChallengesError(
                      error instanceof Error && error.message
                        ? error.message
                        : 'Noe gikk galt. Prøv igjen.',
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
              title="Ingen utfordringer ennå"
              message="Utfordre deg selv eller vennene dine — f.eks. 5 økter på én uke."
              actionTitle="Ny utfordring"
              onAction={() => router.push('/challenges/new')}
            />
          </Card>
        ) : (
          challengeCards.map(({ challenge, endMs }) => {
            const meta = CHALLENGE_META[challenge.type];
            const ended = endMs < Date.now();
            return (
              <Card key={challenge.id} onPress={() => router.push(`/challenges/${challenge.id}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      backgroundColor: ended ? colors.surfaceElevated : colors.accentMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={meta.icon}
                      size={22}
                      color={ended ? colors.textMuted : colors.accent}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="bodyBold" numberOfLines={1}>
                      {challenge.name}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {`${meta.label} · ${ended ? 'Avsluttet' : daysLeftLabel(challenge.endDate)} · ${participantsLabel(challenge.participants.length)}`}
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
            Rangeringen sammenligner deg og vennene dine i valgt periode — uke eller måned.
          </AppText>
        </View>
      </Sheet>
    </Screen>
  );
}
