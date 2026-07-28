import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CommentSheet } from '@/components/social/comment-sheet';
import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { StatTile } from '@/components/charts';
import {
  deleteWorkout as apiDeleteWorkout,
  fetchWorkoutById,
  setLike,
} from '@/lib/api/workouts';
import { findExercise } from '@/lib/data/exercises';
import { confirmDialog, infoDialog } from '@/lib/dialogs';
import {
  dateKey,
  formatDuration,
  formatFullDate,
  formatKg,
  formatNumber,
  formatTimeAgo,
  formatVolume,
} from '@/lib/format';
import { BADGE_DEFS } from '@/lib/logic/badges';
import { useAuthStore } from '@/lib/store/auth';
import { useExerciseStore } from '@/lib/store/exercises';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme } from '@/theme';
import type { UserProfile, Workout, WorkoutSet } from '@/types';

function formatRpe(rpe: number): string {
  return String(rpe).replace('.', ',');
}

function setLine(set: WorkoutSet): string {
  const base = `${formatKg(set.weightKg)} × ${set.reps}`;
  return set.rpe != null ? `${base}  @ RPE ${formatRpe(set.rpe)}` : base;
}

function feilmelding(error: unknown): string {
  return error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.';
}

type FetchStatus = 'idle' | 'loading' | 'done' | 'error';

export default function WorkoutDetailScreen() {
  const params = useLocalSearchParams<{ id: string; celebrate?: string }>();
  const workoutId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const celebrate = params.celebrate === '1';

  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const me = useAuthStore((s) => s.user);
  const myWorkouts = useWorkoutStore((s) => s.workouts);
  const earnedBadges = useWorkoutStore((s) => s.earnedBadges);
  const deleteWorkout = useWorkoutStore((s) => s.deleteWorkout);
  const setWorkoutShared = useWorkoutStore((s) => s.setWorkoutShared);
  const customExercises = useExerciseStore((s) => s.customExercises);

  // Min økt fra storen — venners økter finnes ikke der og hentes fra serveren
  const mine = myWorkouts.find((w) => w.id === workoutId);

  const [remote, setRemote] = useState<{ workout: Workout; author: UserProfile } | null>(null);
  const [status, setStatus] = useState<FetchStatus>(() => (mine ? 'idle' : 'loading'));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'loading' || !workoutId) return;
    let cancelled = false;
    fetchWorkoutById(workoutId)
      .then((result) => {
        if (cancelled) return;
        setRemote(result);
        setStatus('done');
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(feilmelding(error));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [status, workoutId]);

  const workout = mine ?? remote?.workout;
  const isMine = workout != null && me != null && workout.userId === me.id;
  const author = isMine ? me : remote?.author;

  // Likes og kommentartall holdes lokalt for optimistisk oppdatering
  const [likes, setLikes] = useState<string[]>(workout?.likes ?? []);
  const [commentCount, setCommentCount] = useState(workout?.comments.length ?? 0);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [sharePending, setSharePending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const workoutKey = workout?.id ?? null;
  useEffect(() => {
    if (workout) {
      setLikes(workout.likes);
      setCommentCount(workout.comments.length);
    }
    // Kun når økten (id) blir tilgjengelig/bytter — ikke ved hver re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutKey]);

  const exerciseName = (id: string): string =>
    (findExercise(id) ?? customExercises.find((e) => e.id === id))?.name ?? 'Ukjent øvelse';

  if (!workout) {
    if (status === 'loading') {
      return (
        <Screen>
          <ScreenHeader title="Økt" />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
            <ActivityIndicator color={colors.accent} />
            <AppText variant="caption" color="muted">
              Laster økt …
            </AppText>
          </View>
        </Screen>
      );
    }
    if (status === 'error') {
      return (
        <Screen>
          <ScreenHeader title="Økt" />
          <EmptyState
            icon="cloud-offline-outline"
            title="Kunne ikke laste økten"
            message={loadError ?? undefined}
            actionTitle="Prøv igjen"
            onAction={() => setStatus('loading')}
          />
        </Screen>
      );
    }
    return (
      <Screen>
        <ScreenHeader title="Økt" />
        <EmptyState
          icon="barbell-outline"
          title="Fant ikke økten"
          message="Økten kan være slettet, eller den er ikke delt med deg."
          actionTitle="Gå tilbake"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const likedByMe = me != null && likes.includes(me.id);
  const isShared = (mine ?? workout).isShared;

  const onToggleLike = async () => {
    if (!me) return;
    const nextLiked = !likedByMe;
    const before = likes;
    setLikes(nextLiked ? [...before, me.id] : before.filter((id) => id !== me.id));
    Haptics.selectionAsync();
    try {
      await setLike(workout.id, me.id, nextLiked);
    } catch (error) {
      setLikes(before);
      infoDialog('Kunne ikke oppdatere', feilmelding(error));
    }
  };

  const onToggleShare = async (next: boolean) => {
    if (sharePending) return;
    setSharePending(true);
    try {
      await setWorkoutShared(workout.id, next);
      // Egen økt hentet fra serveren (ikke i storen): oppdater lokal kopi
      setRemote((r) =>
        r && r.workout.id === workout.id ? { ...r, workout: { ...r.workout, isShared: next } } : r,
      );
    } catch (error) {
      infoDialog('Kunne ikke endre deling', feilmelding(error));
    } finally {
      setSharePending(false);
    }
  };

  const confirmDelete = () => {
    confirmDialog({
      title: 'Slett økt',
      message: 'Økten og alle sett slettes permanent.',
      confirmLabel: 'Slett',
      destructive: true,
      onConfirm: async () => {
        setDeleting(true);
        try {
          if (mine) {
            await deleteWorkout(workout.id);
          } else {
            await apiDeleteWorkout(workout.id);
          }
          router.back();
        } catch (error) {
          setDeleting(false);
          infoDialog('Kunne ikke slette økten', feilmelding(error));
        }
      },
    });
  };

  // Feiring: PR-øvelser og merker tildelt i dag
  const prExerciseNames = workout.exercises
    .filter((we) => we.sets.some((s) => s.isPR))
    .map((we) => exerciseName(we.exerciseId));
  const todayKey = dateKey(new Date());
  const newBadges = earnedBadges
    .filter((b) => dateKey(new Date(b.earnedAt)) === todayKey)
    .map((b) => BADGE_DEFS.find((d) => d.id === b.badgeId))
    .filter((d) => d != null);

  return (
    <Screen scroll>
      <ScreenHeader title={workout.name} />

      <View style={{ gap: spacing.lg }}>
        <AppText variant="caption" color="muted">
          {formatFullDate(workout.date)}
        </AppText>

        {/* Forfatter — vises når økten ikke er min */}
        {!isMine && author ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar
              name={author.displayName}
              color={author.avatarColor}
              uri={author.avatarUri}
              size={44}
            />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyBold" numberOfLines={1}>
                {author.displayName}
              </AppText>
              <AppText variant="caption" color="muted" numberOfLines={1}>
                @{author.username} · {formatTimeAgo(workout.date)}
              </AppText>
            </View>
          </View>
        ) : null}

        {celebrate && isMine ? (
          <Animated.View entering={FadeInDown.duration(350)}>
            <Card
              style={{
                alignItems: 'center',
                gap: spacing.sm,
                borderColor: colors.success,
                backgroundColor: colors.successMuted,
              }}
            >
              <AppText style={{ fontSize: 44 }}>🎉</AppText>
              <AppText variant="title">Økt fullført!</AppText>
              <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
                {formatVolume(workout.totalVolumeKg)} løftet · {workout.totalSets} sett ·{' '}
                {formatDuration(workout.durationMin ?? 0)}
              </AppText>
              {prExerciseNames.length > 0 ? (
                <View style={{ alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
                  <AppText variant="label" style={{ color: colors.gold }}>
                    Nye rekorder
                  </AppText>
                  {prExerciseNames.map((name) => (
                    <AppText key={name} variant="bodyBold" style={{ color: colors.gold }}>
                      🏆 {name}
                    </AppText>
                  ))}
                </View>
              ) : null}
              {newBadges.length > 0 ? (
                <View style={{ alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
                  <AppText variant="label" color="muted">
                    Nye merker
                  </AppText>
                  {newBadges.map((badge) => (
                    <AppText key={badge.id} variant="bodyBold">
                      {badge.icon} {badge.name}
                    </AppText>
                  ))}
                </View>
              ) : null}
            </Card>
          </Animated.View>
        ) : null}

        {/* Statistikk */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <StatTile label="Volum" value={formatVolume(workout.totalVolumeKg)} />
          </View>
          <View style={{ flex: 1 }}>
            <StatTile label="Sett" value={formatNumber(workout.totalSets)} />
          </View>
          <View style={{ flex: 1 }}>
            <StatTile label="Varighet" value={formatDuration(workout.durationMin ?? 0)} />
          </View>
        </View>

        {workout.prCount > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              borderWidth: 1,
              borderColor: colors.gold,
              borderRadius: radius.lg,
              padding: spacing.md,
            }}
          >
            <Ionicons name="trophy" size={18} color={colors.gold} />
            <AppText variant="bodyBold" style={{ color: colors.gold }}>
              {workout.prCount === 1
                ? '1 personlig rekord'
                : `${workout.prCount} personlige rekorder`}
            </AppText>
          </View>
        ) : null}

        {/* Liker og kommentarer */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xl }}>
            <Pressable
              hitSlop={8}
              onPress={onToggleLike}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
            >
              <Ionicons
                name={likedByMe ? 'heart' : 'heart-outline'}
                size={22}
                color={likedByMe ? colors.danger : colors.textSecondary}
              />
              <AppText variant="bodyBold" color="secondary">
                {formatNumber(likes.length)}
              </AppText>
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() => setCommentsVisible(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
              <AppText variant="bodyBold" color="secondary">
                {formatNumber(commentCount)}
              </AppText>
            </Pressable>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Button
                title="Kommenter"
                icon="chatbubble-ellipses-outline"
                variant="ghost"
                size="sm"
                onPress={() => setCommentsVisible(true)}
              />
            </View>
          </View>
        </Card>

        {/* Øvelser */}
        {workout.exercises.map((we) => {
          let workingIndex = 0;
          return (
            <Card key={we.id}>
              <Pressable onPress={() => router.push(`/exercises/${we.exerciseId}`)}>
                <AppText variant="subheading" color="accent" numberOfLines={1}>
                  {exerciseName(we.exerciseId)}
                </AppText>
              </Pressable>
              <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                {we.sets.map((set) => {
                  const label = set.isWarmup ? 'O' : String(++workingIndex);
                  return (
                    <View
                      key={set.id}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
                    >
                      <AppText
                        variant="bodyBold"
                        color={set.isWarmup ? 'muted' : 'secondary'}
                        style={{ width: 20, textAlign: 'center' }}
                      >
                        {label}
                      </AppText>
                      <AppText variant="body" style={{ flex: 1 }}>
                        {setLine(set)}
                      </AppText>
                      {set.isPR ? (
                        <View
                          style={{
                            borderWidth: 1,
                            borderColor: colors.gold,
                            borderRadius: radius.full,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 2,
                          }}
                        >
                          <AppText
                            variant="caption"
                            style={{ color: colors.gold, fontWeight: '700' }}
                          >
                            PR
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
              {we.notes ? (
                <AppText variant="caption" color="muted" style={{ marginTop: spacing.sm }}>
                  {we.notes}
                </AppText>
              ) : null}
            </Card>
          );
        })}

        {/* Notater */}
        {workout.notes ? (
          <Card>
            <AppText variant="label" color="muted" style={{ marginBottom: spacing.xs }}>
              Notater
            </AppText>
            <AppText variant="body" color="secondary">
              {workout.notes}
            </AppText>
          </Card>
        ) : null}

        {/* Deling og sletting — kun egen økt */}
        {isMine ? (
          <>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyBold">Del med venner</AppText>
                  <AppText variant="caption" color="muted">
                    Økten vises i feeden til vennene dine.
                  </AppText>
                </View>
                <Switch
                  value={isShared}
                  onValueChange={onToggleShare}
                  disabled={sharePending}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  ios_backgroundColor={colors.border}
                />
              </View>
            </Card>

            <Card>
              <Button
                title="Slett økt"
                icon="trash-outline"
                variant="danger"
                size="sm"
                loading={deleting}
                onPress={confirmDelete}
              />
            </Card>
          </>
        ) : null}
      </View>

      <CommentSheet
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        workoutId={workout.id}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
      />
    </Screen>
  );
}
