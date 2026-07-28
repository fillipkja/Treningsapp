import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays, isWithinInterval, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  Button,
  Card,
  Divider,
  EmptyState,
  ProgressBar,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { confirmDialog } from '@/lib/dialogs';
import { formatNumber, formatShortDate, formatVolume } from '@/lib/format';
import { useChallengeStore } from '@/lib/store/challenges';
import { useProgramStore } from '@/lib/store/programs';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme } from '@/theme';
import type { Challenge, ChallengeType, Workout } from '@/types';

const TYPE_META: Record<ChallengeType, { label: string; icon: keyof typeof Ionicons.glyphMap; unit: string }> = {
  økter: { label: 'Antall økter', icon: 'calendar', unit: 'økter' },
  volum: { label: 'Løftet volum', icon: 'barbell', unit: 'kg' },
  prs: { label: 'Personlige rekorder', icon: 'trophy', unit: 'rekorder' },
  program: { label: 'Fullfør program', icon: 'flag', unit: 'økter' },
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

function formatScore(type: ChallengeType, value: number): string {
  return type === 'volum' ? formatVolume(value) : formatNumber(value);
}

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const myWorkouts = useWorkoutStore((s) => s.workouts);
  const challenges = useChallengeStore((s) => s.challenges);
  const deleteChallenge = useChallengeStore((s) => s.deleteChallenge);
  const programs = useProgramStore((s) => s.programs);

  const challenge = challenges.find((c) => c.id === id);
  const program = challenge?.programId
    ? programs.find((p) => p.id === challenge.programId)
    : undefined;
  const target =
    challenge?.target ?? (challenge?.type === 'program' ? program?.days.length : undefined);

  const score = useMemo(
    () => (challenge ? challengeScore(challenge, myWorkouts) : 0),
    [challenge, myWorkouts],
  );

  if (!challenge) {
    return (
      <Screen>
        <ScreenHeader title="Utfordring" />
        <EmptyState
          icon="trophy-outline"
          title="Fant ikke utfordringen"
          message="Den kan være slettet."
        />
      </Screen>
    );
  }

  const meta = TYPE_META[challenge.type];
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

  const goalProgress = target && target > 0 ? Math.min(1, score / target) : 0;
  const reached = !!target && score >= target;

  const confirmDelete = () => {
    confirmDialog({
      title: 'Slett utfordring',
      message: `Vil du slette «${challenge.name}»?`,
      confirmLabel: 'Slett',
      destructive: true,
      onConfirm: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        deleteChallenge(challenge.id);
        router.back();
      },
    });
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Utfordring" />

      <Animated.View entering={FadeInDown.duration(300)} style={{ gap: spacing.lg }}>
        {/* Toppkort */}
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

        {/* Fremdrift mot målet */}
        <View style={{ gap: spacing.md }}>
          <AppText variant="label" color="muted">
            {ended ? 'Resultat' : 'Din fremdrift'}
          </AppText>
          <Card>
            <View style={{ gap: spacing.md, alignItems: 'center' }}>
              {reached ? <AppText style={{ fontSize: 44 }}>🎉</AppText> : null}
              <AppText
                variant="heading"
                style={{
                  fontSize: 40,
                  lineHeight: 48,
                  textAlign: 'center',
                  color: reached ? colors.success : colors.textPrimary,
                }}
              >
                {target
                  ? `${formatScore(challenge.type, score)} av ${formatScore(challenge.type, target)}`
                  : formatScore(challenge.type, score)}
              </AppText>
              <AppText variant="caption" color="muted">
                {meta.unit}
              </AppText>
              <View style={{ alignSelf: 'stretch' }}>
                <ProgressBar
                  progress={goalProgress}
                  color={reached ? colors.success : undefined}
                  height={10}
                />
              </View>
              {ended ? (
                <AppText variant="bodyBold" color={reached ? 'success' : 'secondary'}>
                  {reached ? 'Målet nådd!' : 'Ikke nådd denne gangen'}
                </AppText>
              ) : reached ? (
                <AppText variant="bodyBold" color="success">
                  Målet nådd — sterkt jobba!
                </AppText>
              ) : (
                <AppText variant="caption" color="secondary">
                  {target
                    ? `${formatScore(challenge.type, Math.max(0, target - score))} ${meta.unit} igjen til målet.`
                    : 'Ingen målverdi satt for denne utfordringen.'}
                </AppText>
              )}
            </View>
          </Card>
        </View>

        {/* Handlinger */}
        <View style={{ marginTop: spacing.sm }}>
          <Button
            title="Slett utfordring"
            icon="trash-outline"
            variant="danger"
            fullWidth
            onPress={confirmDelete}
          />
        </View>
      </Animated.View>
    </Screen>
  );
}
