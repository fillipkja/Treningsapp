import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { CommentSheet } from '@/components/social/comment-sheet';
import { WorkoutCard } from '@/components/workout/workout-card';
import {
  AppText,
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { useLanguage, useT } from '@/i18n';
import { distanceLabel, goalLabel } from '@/i18n/labels';
import { fetchFriendState, removeFriendship } from '@/lib/api/friends';
import { fetchSharedRecordsByUser, fetchSharedRunsByUser } from '@/lib/api/personal';
import { fetchProfilesByIds } from '@/lib/api/profiles';
import { fetchSharedWorkoutsByUser, setLike } from '@/lib/api/workouts';
import { exerciseDisplayName } from '@/lib/data/exercise-i18n';
import { confirmDialog, infoDialog } from '@/lib/dialogs';
import { formatDuration, formatKg, formatRecordDate } from '@/lib/format';
import { firstParam } from '@/lib/params';
import { useAuthStore } from '@/lib/store/auth';
import { getExerciseById } from '@/lib/store/exercises';
import { useTheme } from '@/theme';
import type { FriendRecord, FriendRun, UserProfile, Workout, WorkoutComment } from '@/types';

export default function FriendProfileScreen() {
  const id = firstParam(useLocalSearchParams<{ id: string | string[] }>().id);
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
  const { colors, spacing } = useTheme();
  const myId = useAuthStore((s) => s.user?.id);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [records, setRecords] = useState<FriendRecord[]>([]);
  const [runs, setRuns] = useState<FriendRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  /** Økten kommentar-arket er åpent for (null = lukket) */
  const [commentWorkoutId, setCommentWorkoutId] = useState<string | null>(null);

  const load = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (!myId || !id) return;
      try {
        setError(null);
        const [profiles, friendState, shared, sharedRecords, sharedRuns] = await Promise.all([
          fetchProfilesByIds([id]),
          fetchFriendState(myId),
          // RLS gjør at kun vennens delte økter og rekorder er synlige for meg
          fetchSharedWorkoutsByUser(id),
          fetchSharedRecordsByUser(id),
          fetchSharedRunsByUser(id),
        ]);
        if (isCancelled()) return;
        setProfile(profiles.get(id) ?? null);
        setIsFriend(friendState.friends.some((f) => f.id === id));
        setWorkouts(shared);
        setRecords(sharedRecords);
        setRuns(sharedRuns);
      } catch (e) {
        if (isCancelled()) return;
        setError(e instanceof Error ? e.message : t('error.generic'));
      }
    },
    [myId, id, t],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load(() => cancelled).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const toggleLike = async (workout: Workout) => {
    if (!myId) return;
    const liked = workout.likes.includes(myId);
    const apply = (nextLiked: boolean) =>
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === workout.id
            ? {
                ...w,
                likes: nextLiked ? [...w.likes, myId] : w.likes.filter((u) => u !== myId),
              }
            : w,
        ),
      );
    apply(!liked); // optimistisk
    try {
      await setLike(workout.id, myId, !liked);
    } catch (e) {
      apply(liked); // rull tilbake
      infoDialog(t('profile.friendLikeFailed'), e instanceof Error ? e.message : t('error.generic'));
    }
  };

  const onCommentAdded = (workoutId: string, comment: WorkoutComment) => {
    setWorkouts((prev) =>
      prev.map((w) => (w.id === workoutId ? { ...w, comments: [...w.comments, comment] } : w)),
    );
  };

  const confirmRemove = () => {
    if (!myId || !id || !profile) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    confirmDialog({
      title: t('profile.friendRemove'),
      message: t('profile.friendRemoveConfirm', { name: profile.displayName || profile.username }),
      confirmLabel: t('profile.friendRemove'),
      destructive: true,
      onConfirm: async () => {
        setRemoving(true);
        try {
          await removeFriendship(myId, id);
          router.back();
        } catch (e) {
          infoDialog(t('profile.friendRemoveFailed'), e instanceof Error ? e.message : t('error.generic'));
        } finally {
          setRemoving(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title={t('profile.friendTitle')} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title={t('profile.friendTitle')} />
        <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
          <AppText variant="body" color="danger" style={{ textAlign: 'center' }}>
            {error}
          </AppText>
          <Button
            title={t('common.retry')}
            variant="secondary"
            size="sm"
            onPress={() => {
              setLoading(true);
              void load().finally(() => setLoading(false));
            }}
          />
        </View>
      </Screen>
    );
  }

  if (!profile || !isFriend) {
    return (
      <Screen>
        <ScreenHeader title={t('profile.friendTitle')} />
        <EmptyState
          icon="person-remove-outline"
          title={t('profile.friendNotFoundTitle')}
          message={t('profile.friendNotFoundMessage')}
          actionTitle={t('common.back')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const name = profile.displayName || profile.username;

  return (
    <Screen scroll>
      <ScreenHeader title={name} />

      {/* Profilkort */}
      <Card style={{ alignItems: 'center', gap: spacing.md }}>
        <Avatar
          name={name}
          color={profile.avatarColor}
          uri={profile.avatarUri}
          icon={profile.avatarIcon}
          size={96}
        />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <AppText variant="title" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="body" color="muted">
            @{profile.username}
          </AppText>
        </View>
        {profile.bio ? (
          <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
            {profile.bio}
          </AppText>
        ) : null}
        {profile.goal ? <Chip label={goalLabel(profile.goal, lang)} selected /> : null}
      </Card>

      {/* Delte økter */}
      <AppText variant="heading" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
        {t('profile.friendSharedWorkouts')}
      </AppText>
      {workouts.length === 0 ? (
        <EmptyState
          icon="barbell-outline"
          title={t('profile.friendNoSharedTitle')}
          message={t('profile.friendNoSharedMessage', { name })}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          {workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              myUserId={myId}
              onToggleLike={() => toggleLike(workout)}
              onPressComments={() => setCommentWorkoutId(workout.id)}
            />
          ))}
        </View>
      )}

      {/* Personlige rekorder — seksjonen utelates helt når vennen ikke deler noen */}
      {records.length > 0 || runs.length > 0 ? (
        <>
          <AppText variant="heading" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
            {t('profile.friendRecords')}
          </AppText>
          <View style={{ gap: spacing.md }}>
            {records.map((record) => {
              const def = getExerciseById(record.exerciseId);
              return (
                <Card key={record.id}>
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
                        {def ? exerciseDisplayName(def, lang) : t('stats.unknownExercise')}
                      </AppText>
                      {record.date ? (
                        <AppText variant="caption" color="muted" numberOfLines={1}>
                          {formatRecordDate(record.date)}
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
                    </View>
                  </View>
                </Card>
              );
            })}
            {/* Delte løperekorder etter styrkerekordene */}
            {runs.map((run) => (
              <Card key={run.id}>
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
                    {run.date ? (
                      <AppText variant="caption" color="muted" numberOfLines={1}>
                        {formatRecordDate(run.date)}
                      </AppText>
                    ) : null}
                  </View>
                  <AppText variant="subheading" style={{ color: colors.accent }}>
                    {formatDuration(run.durationSec)}
                  </AppText>
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {/* Fjern venn */}
      <View style={{ marginTop: spacing.xxl }}>
        <Button
          title={t('profile.friendRemove')}
          icon="person-remove-outline"
          variant="danger"
          fullWidth
          loading={removing}
          onPress={confirmRemove}
        />
      </View>

      <CommentSheet
        visible={commentWorkoutId !== null}
        onClose={() => setCommentWorkoutId(null)}
        workoutId={commentWorkoutId ?? ''}
        onCommentAdded={(comment) => {
          if (commentWorkoutId) onCommentAdded(commentWorkoutId, comment);
        }}
      />
    </Screen>
  );
}
