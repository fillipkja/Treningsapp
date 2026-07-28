import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
import { t as translate, useLanguage, useT } from '@/i18n';
import { challengeTypeLabel } from '@/i18n/labels';
import { fetchStandings, type ChallengeStanding } from '@/lib/api/challenges';
import { fetchProfilesByIds } from '@/lib/api/profiles';
import { confirmDialog, infoDialog } from '@/lib/dialogs';
import { formatNumber, formatShortDate, formatVolume } from '@/lib/format';
import { firstParam } from '@/lib/params';
import { useAuthStore } from '@/lib/store/auth';
import { useChallengeStore } from '@/lib/store/challenges';
import { useProgramStore } from '@/lib/store/programs';
import { challengeTypeColors, tierColors, useTheme } from '@/theme';
import type { ChallengeType, UserProfile } from '@/types';

/** Ikon per utfordringstype — fast tilordning, farge følger typen */
const TYPE_ICON: Record<ChallengeType, keyof typeof Ionicons.glyphMap> = {
  økter: 'checkmark-done',
  volum: 'barbell',
  prs: 'star',
  program: 'map',
};

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

interface RankedStanding extends ChallengeStanding {
  score: number;
  rank: number;
}

export default function ChallengeDetailScreen() {
  const id = firstParam(useLocalSearchParams<{ id: string | string[] }>().id);
  const router = useRouter();
  const { colors, spacing, radius, isDark } = useTheme();
  const mode = isDark ? 'dark' : 'light';
  const t = useT();
  const lang = useLanguage();

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
      setStoreError(error instanceof Error ? error.message : translate('error.generic')),
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
        setStandingsError(error instanceof Error ? error.message : translate('error.generic'));
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
          <ScreenHeader title={t('compete.challengeTitle')} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        </Screen>
      );
    }
    return (
      <Screen>
        <ScreenHeader title={t('compete.challengeTitle')} />
        {storeError ? (
          <View style={{ alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl }}>
            <AppText variant="caption" color="danger" style={{ textAlign: 'center' }}>
              {storeError}
            </AppText>
            <Button
              title={t('common.retry')}
              size="sm"
              variant="secondary"
              onPress={() => {
                setStoreError(null);
                loadChallenges().catch((error) =>
                  setStoreError(error instanceof Error ? error.message : translate('error.generic')),
                );
              }}
            />
          </View>
        ) : (
          <EmptyState
            icon="trophy-outline"
            title={t('compete.notFoundTitle')}
            message={t('compete.notFoundBody')}
          />
        )}
      </Screen>
    );
  }

  const tint = challengeTypeColors[mode][challenge.type];
  const program = challenge.programId
    ? programs.find((p) => p.id === challenge.programId)
    : undefined;
  const target =
    challenge.target ?? (challenge.type === 'program' ? program?.days.length : undefined);

  const formatScore = (value: number): string => {
    if (challenge.type === 'volum') return formatVolume(value);
    return t(challenge.type === 'prs' ? 'compete.recordsCount' : 'compete.workoutsCount', {
      count: formatNumber(value),
    });
  };

  const start = parseISO(challenge.startDate);
  const end = parseISO(challenge.endDate);
  const nowMs = Date.now();
  const totalMs = end.getTime() - start.getTime();
  const timeProgress =
    totalMs > 0 ? Math.min(1, Math.max(0, (nowMs - start.getTime()) / totalMs)) : 1;
  const ended = nowMs > end.getTime();
  const daysLeft = Math.max(0, differenceInCalendarDays(end, new Date()));
  const daysLabel = ended
    ? t('compete.ended')
    : daysLeft <= 0
      ? t('compete.lastDay')
      : daysLeft === 1
        ? t('compete.oneDayLeft')
        : t('common.daysLeft', { count: daysLeft });

  const isCreator = me?.id === challenge.creatorId;

  const nameOf = (userId: string): string =>
    userId === me?.id
      ? t('common.you')
      : (profiles.get(userId)?.displayName ?? t('compete.unknownUser'));

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace('/(tabs)/konkurranser');

  const confirmDelete = () => {
    confirmDialog({
      title: t('compete.deleteChallenge'),
      message: t('compete.deleteConfirm', { name: challenge.name }),
      confirmLabel: t('common.delete'),
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
              t('compete.deleteError'),
              error instanceof Error ? error.message : t('error.generic'),
            );
          }
        })();
      },
    });
  };

  const confirmLeave = () => {
    confirmDialog({
      title: t('compete.leaveChallenge'),
      message: t('compete.leaveConfirm', { name: challenge.name }),
      confirmLabel: t('compete.leave'),
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
              t('compete.leaveError'),
              error instanceof Error ? error.message : t('error.generic'),
            );
          }
        })();
      },
    });
  };

  const renderRow = (row: RankedStanding) => {
    const profile = profiles.get(row.userId);
    const isMe = row.userId === me?.id;
    const medal =
      row.rank === 1
        ? tierColors[mode].gull
        : row.rank === 2
          ? tierColors[mode].sølv
          : row.rank === 3
            ? tierColors[mode].bronse
            : undefined;
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
            <AppText variant="bodyBold" style={{ color: reached ? colors.success : tint }}>
              {formatScore(row.score)}
            </AppText>
          </View>
          {target && target > 0 ? (
            <ProgressBar
              progress={row.score / target}
              color={reached ? colors.success : tint}
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
      <ScreenHeader title={t('compete.challengeTitle')} />

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
                  backgroundColor: `${tint}29`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={TYPE_ICON[challenge.type]} size={24} color={tint} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="heading" numberOfLines={2}>
                  {challenge.name}
                </AppText>
                <AppText variant="caption" color="muted">
                  {challengeTypeLabel(challenge.type, lang)}
                  {program ? ` · ${program.name}` : ''}
                  {target ? ` · ${t('compete.goalLabel', { value: formatScore(target) })}` : ''}
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
                color={ended ? 'muted' : undefined}
                style={ended ? { fontWeight: '600' } : { fontWeight: '600', color: tint }}
              >
                {daysLabel}
              </AppText>
            </View>
            <ProgressBar progress={timeProgress} color={ended ? undefined : tint} />
          </View>
        </Card>

        {/* Stillingen / resultat */}
        <View style={{ gap: spacing.md }}>
          <AppText variant="label" color="muted">
            {ended ? t('compete.result') : t('compete.standings')}
          </AppText>

          {standingsError ? (
            <Card>
              <View style={{ alignItems: 'center', gap: spacing.md }}>
                <AppText variant="caption" color="danger" style={{ textAlign: 'center' }}>
                  {standingsError}
                </AppText>
                <Button
                  title={t('common.retry')}
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
                  {t('compete.loadingStandings')}
                </AppText>
              </View>
            </Card>
          ) : ranked.length === 0 ? (
            <Card>
              <AppText variant="caption" color="muted">
                {t('compete.noParticipants')}
              </AppText>
            </Card>
          ) : (
            <>
              {/* Vinner øverst når utfordringen er avsluttet */}
              {winners.length > 0 ? (
                <Card>
                  <View style={{ alignItems: 'center', gap: spacing.sm }}>
                    <LinearGradient
                      colors={[...colors.gradientGold]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: radius.full,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="trophy" size={28} color={colors.onAccent} />
                    </LinearGradient>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      {winners.map((w) => {
                        const profile = profiles.get(w.userId);
                        return (
                          <View
                            key={w.userId}
                            style={{
                              padding: 3,
                              borderWidth: 3,
                              borderColor: tierColors[mode].gull,
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
                      {winners.map((w) => nameOf(w.userId)).join(t('compete.andSeparator'))}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {winners.length > 1
                        ? t('compete.sharedFirstWith', { score: formatScore(winners[0].score) })
                        : t('compete.wonWith', { score: formatScore(winners[0].score) })}
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
              title={t('compete.deleteChallenge')}
              icon="trash-outline"
              variant="danger"
              fullWidth
              loading={busy}
              onPress={confirmDelete}
            />
          ) : (
            <Button
              title={t('compete.leaveChallenge')}
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
