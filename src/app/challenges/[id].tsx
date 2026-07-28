import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  Avatar,
  Button,
  Card,
  Divider,
  EmptyState,
  ProgressBar,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { fetchStandings, type ChallengeStanding } from '@/lib/api/challenges';
import { fetchProfilesByIds } from '@/lib/api/profiles';
import { confirmDialog, infoDialog } from '@/lib/dialogs';
import { formatNumber, formatShortDate, formatVolume } from '@/lib/format';
import { firstParam } from '@/lib/params';
import { useAuthStore } from '@/lib/store/auth';
import { useChallengeStore } from '@/lib/store/challenges';
import { useProgramStore } from '@/lib/store/programs';
import { useTheme, type ThemeColors } from '@/theme';
import type { ChallengeType, UserProfile } from '@/types';

const TYPE_META: Record<ChallengeType, { label: string; icon: keyof typeof Ionicons.glyphMap; unit: string }> = {
  økter: { label: 'Antall økter', icon: 'calendar', unit: 'økter' },
  volum: { label: 'Løftet volum', icon: 'barbell', unit: 'kg' },
  prs: { label: 'Personlige rekorder', icon: 'trophy', unit: 'rekorder' },
  program: { label: 'Fullfør program', icon: 'flag', unit: 'økter' },
};

/** Gull/sølv/bronse. Bronse finnes ikke i paletten — samme unntak som i badges. */
function medalColor(rank: number, colors: ThemeColors): string | undefined {
  if (rank === 1) return colors.gold;
  if (rank === 2) return colors.textSecondary;
  if (rank === 3) return '#b08d57';
  return undefined;
}

/** Score per deltaker etter utfordringstype */
function scoreOf(type: ChallengeType, standing: ChallengeStanding): number {
  switch (type) {
    case 'økter':
      return standing.workoutCount;
    case 'volum':
      return standing.volumeKg;
    case 'prs':
      return standing.prCount;
    case 'program':
      return standing.programCount;
  }
}

function formatScore(type: ChallengeType, value: number): string {
  if (type === 'volum') return formatVolume(value);
  return `${formatNumber(value)} ${TYPE_META[type].unit}`;
}

interface RankedStanding extends ChallengeStanding {
  score: number;
  rank: number;
}

export default function ChallengeDetailScreen() {
  const id = firstParam(useLocalSearchParams<{ id: string | string[] }>().id);
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const me = useAuthStore((s) => s.user);
  const items = useChallengeStore((s) => s.items);
  const storeLoaded = useChallengeStore((s) => s.loaded);
  const storeLoading = useChallengeStore((s) => s.loading);
  const loadChallenges = useChallengeStore((s) => s.load);
  const deleteChallengeAction = useChallengeStore((s) => s.deleteChallenge);
  const leaveChallengeAction = useChallengeStore((s) => s.leaveChallenge);
  const programs = useProgramStore((s) => s.programs);

  const item = useMemo(() => items.find((it) => it.challenge.id === id), [items, id]);
  const challenge = item?.challenge;

  // Last utfordringene ved dyplenke (hvis bootstrap ikke har kjørt ennå).
  // storeError må være med i betingelsen: uten den kjører effekten på nytt hver
  // gang loading går true→false, og et feilende kall gjentas i det uendelige.
  const [storeError, setStoreError] = useState<string | null>(null);
  useEffect(() => {
    if (storeLoaded || storeLoading || storeError) return;
    loadChallenges().catch((error) =>
      setStoreError(error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.'),
    );
  }, [storeLoaded, storeLoading, storeError, loadChallenges]);

  // Stillinger + profiler
  const [standings, setStandings] = useState<ChallengeStanding[] | null>(null);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [standingsError, setStandingsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStandings = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (!id) return;
      try {
        setStandingsError(null);
        const rows = await fetchStandings(id);
        const map = await fetchProfilesByIds(rows.map((r) => r.userId));
        if (isCancelled()) return;
        setStandings(rows);
        setProfiles(map);
      } catch (error) {
        if (isCancelled()) return;
        setStandingsError(error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.');
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      if (!challenge) return;
      let cancelled = false;
      void loadStandings(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [challenge, loadStandings]),
  );

  const ranked = useMemo<RankedStanding[] | null>(() => {
    if (!standings || !challenge) return null;
    const rows = standings.map((s) => ({ ...s, score: scoreOf(challenge.type, s), rank: 0 }));
    rows.sort((a, b) => b.score - a.score);
    let prevScore = Number.NaN;
    let prevRank = 0;
    rows.forEach((row, i) => {
      row.rank = row.score === prevScore ? prevRank : i + 1;
      prevScore = row.score;
      prevRank = row.rank;
    });
    return rows;
  }, [standings, challenge]);

  // Ukjent id / laster
  if (!challenge) {
    if (!storeLoaded && !storeError) {
      return (
        <Screen>
          <ScreenHeader title="Utfordring" />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        </Screen>
      );
    }
    return (
      <Screen>
        <ScreenHeader title="Utfordring" />
        {storeError ? (
          <View style={{ alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl }}>
            <AppText variant="caption" color="danger" style={{ textAlign: 'center' }}>
              {storeError}
            </AppText>
            <Button
              title="Prøv igjen"
              size="sm"
              variant="secondary"
              onPress={() => {
                setStoreError(null);
                loadChallenges().catch((error) =>
                  setStoreError(error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.'),
                );
              }}
            />
          </View>
        ) : (
          <EmptyState
            icon="trophy-outline"
            title="Fant ikke utfordringen"
            message="Den kan være slettet, eller du er ikke lenger deltaker."
          />
        )}
      </Screen>
    );
  }

  const meta = TYPE_META[challenge.type];
  const program = challenge.programId
    ? programs.find((p) => p.id === challenge.programId)
    : undefined;
  const target =
    challenge.target ?? (challenge.type === 'program' ? program?.days.length : undefined);

  const start = parseISO(challenge.startDate);
  const end = parseISO(challenge.endDate);
  const nowMs = Date.now();
  const totalMs = end.getTime() - start.getTime();
  const timeProgress =
    totalMs > 0 ? Math.min(1, Math.max(0, (nowMs - start.getTime()) / totalMs)) : 1;
  const ended = nowMs > end.getTime();
  const daysLeft = Math.max(0, differenceInCalendarDays(end, new Date()));
  const daysLabel = ended
    ? 'Avsluttet'
    : daysLeft <= 0
      ? 'Siste dag'
      : daysLeft === 1
        ? '1 dag igjen'
        : `${daysLeft} dager igjen`;

  const isCreator = me?.id === challenge.creatorId;

  const nameOf = (userId: string): string =>
    userId === me?.id ? 'Deg' : (profiles.get(userId)?.displayName ?? 'Ukjent');

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace('/(tabs)/konkurranser');

  const confirmDelete = () => {
    confirmDialog({
      title: 'Slett utfordring',
      message: `Vil du slette «${challenge.name}» for alle deltakerne?`,
      confirmLabel: 'Slett',
      destructive: true,
      onConfirm: () => {
        void (async () => {
          setBusy(true);
          try {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteChallengeAction(challenge.id);
            goBack();
          } catch (error) {
            setBusy(false);
            infoDialog(
              'Kunne ikke slette utfordringen',
              error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.',
            );
          }
        })();
      },
    });
  };

  const confirmLeave = () => {
    confirmDialog({
      title: 'Forlat utfordring',
      message: `Vil du forlate «${challenge.name}»? Du mister plassen din i stillingen.`,
      confirmLabel: 'Forlat',
      destructive: true,
      onConfirm: () => {
        void (async () => {
          setBusy(true);
          try {
            await leaveChallengeAction(challenge.id);
            goBack();
          } catch (error) {
            setBusy(false);
            infoDialog(
              'Kunne ikke forlate utfordringen',
              error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.',
            );
          }
        })();
      },
    });
  };

  const renderRow = (row: RankedStanding) => {
    const profile = profiles.get(row.userId);
    const isMe = row.userId === me?.id;
    const medal = medalColor(row.rank, colors);
    const reached = !!target && row.score >= target;
    return (
      <View
        key={row.userId}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          backgroundColor: isMe ? colors.accentMuted : 'transparent',
        }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: radius.full,
            borderWidth: medal ? 1.5 : 0,
            borderColor: medal ?? 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText
            variant="caption"
            style={{ fontWeight: '700', color: medal ?? colors.textMuted }}
          >
            {row.rank}
          </AppText>
        </View>
        <Avatar
          name={profile?.displayName ?? '?'}
          color={profile?.avatarColor ?? colors.accent}
          uri={profile?.avatarUri}
          size={36}
        />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.sm,
            }}
          >
            <AppText variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {nameOf(row.userId)}
            </AppText>
            <AppText variant="bodyBold" color={reached ? 'success' : 'accent'}>
              {formatScore(challenge.type, row.score)}
            </AppText>
          </View>
          {target && target > 0 ? (
            <ProgressBar
              progress={row.score / target}
              color={reached ? colors.success : undefined}
              height={5}
            />
          ) : null}
        </View>
      </View>
    );
  };

  const winners = ended && ranked && ranked.length > 0 ? ranked.filter((r) => r.rank === 1) : [];
  const listRows = ended && ranked ? ranked.filter((r) => r.rank !== 1) : (ranked ?? []);

  return (
    <Screen scroll>
      <ScreenHeader title="Utfordring" />

      <Animated.View entering={FadeInDown.duration(300)} style={{ gap: spacing.lg }}>
        {/* Toppkort med tidslinje */}
        <Card>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radius.md,
                  backgroundColor: colors.accentMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={meta.icon} size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="heading" numberOfLines={2}>
                  {challenge.name}
                </AppText>
                <AppText variant="caption" color="muted">
                  {meta.label}
                  {program ? ` · ${program.name}` : ''}
                  {target ? ` · Mål: ${formatScore(challenge.type, target)}` : ''}
                </AppText>
              </View>
            </View>
            <Divider />
            <View
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <AppText variant="caption" color="secondary">
                {`${formatShortDate(challenge.startDate)} – ${formatShortDate(challenge.endDate)}`}
              </AppText>
              <AppText
                variant="caption"
                color={ended ? 'muted' : 'accent'}
                style={{ fontWeight: '600' }}
              >
                {daysLabel}
              </AppText>
            </View>
            <ProgressBar progress={timeProgress} />
          </View>
        </Card>

        {/* Stillingen / resultat */}
        <View style={{ gap: spacing.md }}>
          <AppText variant="label" color="muted">
            {ended ? 'Resultat' : 'Stillingen'}
          </AppText>

          {standingsError ? (
            <Card>
              <View style={{ alignItems: 'center', gap: spacing.md }}>
                <AppText variant="caption" color="danger" style={{ textAlign: 'center' }}>
                  {standingsError}
                </AppText>
                <Button
                  title="Prøv igjen"
                  size="sm"
                  variant="secondary"
                  onPress={() => void loadStandings()}
                />
              </View>
            </Card>
          ) : !ranked ? (
            <Card>
              <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg }}>
                <ActivityIndicator color={colors.accent} />
                <AppText variant="caption" color="muted">
                  Henter stillingen …
                </AppText>
              </View>
            </Card>
          ) : ranked.length === 0 ? (
            <Card>
              <AppText variant="caption" color="muted">
                Ingen deltakere i utfordringen.
              </AppText>
            </Card>
          ) : (
            <>
              {/* Vinner øverst når utfordringen er avsluttet */}
              {winners.length > 0 ? (
                <Card>
                  <View style={{ alignItems: 'center', gap: spacing.sm }}>
                    <AppText style={{ fontSize: 40 }}>🏆</AppText>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      {winners.map((w) => {
                        const profile = profiles.get(w.userId);
                        return (
                          <View
                            key={w.userId}
                            style={{
                              padding: 3,
                              borderWidth: 3,
                              borderColor: colors.gold,
                              borderRadius: radius.full,
                            }}
                          >
                            <Avatar
                              name={profile?.displayName ?? '?'}
                              color={profile?.avatarColor ?? colors.accent}
                              uri={profile?.avatarUri}
                              size={56}
                            />
                          </View>
                        );
                      })}
                    </View>
                    <AppText variant="subheading" style={{ textAlign: 'center' }}>
                      {winners.map((w) => nameOf(w.userId)).join(' og ')}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {`${winners.length > 1 ? 'Delt førsteplass' : 'Vant'} med ${formatScore(challenge.type, winners[0].score)}`}
                    </AppText>
                  </View>
                </Card>
              ) : null}

              {listRows.length > 0 ? (
                <Card padded={false} style={{ paddingVertical: spacing.xs }}>
                  {listRows.map(renderRow)}
                </Card>
              ) : null}
            </>
          )}
        </View>

        {/* Handlinger */}
        <View style={{ marginTop: spacing.sm }}>
          {isCreator ? (
            <Button
              title="Slett utfordring"
              icon="trash-outline"
              variant="danger"
              fullWidth
              loading={busy}
              onPress={confirmDelete}
            />
          ) : (
            <Button
              title="Forlat utfordring"
              icon="exit-outline"
              variant="secondary"
              fullWidth
              loading={busy}
              onPress={confirmLeave}
            />
          )}
        </View>
      </Animated.View>
    </Screen>
  );
}
