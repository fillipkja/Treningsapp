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
import { goalLabel } from '@/i18n/labels';
import { fetchFriendState, removeFriendship } from '@/lib/api/friends';
import { fetchProfilesByIds } from '@/lib/api/profiles';
import { fetchSharedWorkoutsByUser, setLike } from '@/lib/api/workouts';
import { confirmDialog, infoDialog } from '@/lib/dialogs';
import { firstParam } from '@/lib/params';
import { useAuthStore } from '@/lib/store/auth';
import { useTheme } from '@/theme';
import type { UserProfile, Workout, WorkoutComment } from '@/types';

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
        const [profiles, friendState, shared] = await Promise.all([
          fetchProfilesByIds([id]),
          fetchFriendState(myId),
          // RLS gjør at kun vennens delte økter er synlige for meg
          fetchSharedWorkoutsByUser(id),
        ]);
        if (isCancelled()) return;
        setProfile(profiles.get(id) ?? null);
        setIsFriend(friendState.friends.some((f) => f.id === id));
        setWorkouts(shared);
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
        <Avatar name={name} color={profile.avatarColor} uri={profile.avatarUri} size={96} />
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
