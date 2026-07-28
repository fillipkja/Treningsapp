import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StatTile } from '@/components/charts';
import { CommentSheet } from '@/components/social/comment-sheet';
import { WorkoutCard } from '@/components/workout/workout-card';
import { AppText, Avatar, Button, Card, CountBadge, EmptyState, Screen } from '@/components/ui';
import { fetchFeed, setLike } from '@/lib/api/workouts';
import { infoDialog } from '@/lib/dialogs';
import { formatFullDate, formatVolume } from '@/lib/format';
import { hasLegacyData, migrateLegacyData } from '@/lib/legacy-migration';
import { periodInterval, workoutsInInterval } from '@/lib/logic/leaderboard';
import { currentStreak } from '@/lib/logic/streaks';
import { useAuthStore } from '@/lib/store/auth';
import { refreshAll } from '@/lib/store/bootstrap';
import { useUnreadCount } from '@/lib/store/notifications';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme } from '@/theme';
import type { UserProfile, Workout, WorkoutComment } from '@/types';

interface FeedItem {
  workout: Workout;
  author: UserProfile;
}

/** AsyncStorage-flagg: brukeren har avvist (eller fullført) legacy-opplasting */
const LEGACY_PROMPT_DISMISSED_KEY = 'legacy-prompt-dismissed';

function feilmelding(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Noe gikk galt. Prøv igjen.';
}

export default function HomeScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const myWorkouts = useWorkoutStore((s) => s.workouts);
  const active = useWorkoutStore((s) => s.active);
  const unread = useUnreadCount();

  // Feed: egne + venners delte økter, hentet direkte fra API-laget
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoaded, setFeedLoaded] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [commentWorkoutId, setCommentWorkoutId] = useState<string | null>(null);

  // Migrering av lokale data fra den gamle versjonen
  const [showLegacyPrompt, setShowLegacyPrompt] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const weekStats = useMemo(() => {
    const now = new Date();
    const week = workoutsInInterval(myWorkouts, periodInterval('uke', now));
    return {
      count: week.length,
      volumeKg: week.reduce((sum, w) => sum + w.totalVolumeKg, 0),
      streak: currentStreak(myWorkouts.map((w) => w.date), now),
    };
  }, [myWorkouts]);

  const loadFeed = useCallback(async () => {
    try {
      const items = await fetchFeed();
      setFeed(items);
      setFeedError(null);
    } catch (error) {
      setFeedError(feilmelding(error));
    } finally {
      setFeedLoaded(true);
    }
  }, []);

  // Hent feeden på nytt hver gang skjermen får fokus
  useFocusEffect(
    useCallback(() => {
      void loadFeed();
    }, [loadFeed]),
  );

  // Vis legacy-kortet én gang: hvis lokale data finnes og det ikke er avvist
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (await AsyncStorage.getItem(LEGACY_PROMPT_DISMISSED_KEY)) return;
        if ((await hasLegacyData()) && !cancelled) setShowLegacyPrompt(true);
      } catch {
        // Klarte ikke å sjekke lokale data — ikke kritisk
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }, [loadFeed]);

  /** Optimistisk like: oppdater lokalt først, angre hvis serveren feiler */
  const toggleLike = (workoutId: string) => {
    if (!user) return;
    const myId = user.id;
    const item = feed.find((f) => f.workout.id === workoutId);
    if (!item) return;
    const liked = !item.workout.likes.includes(myId);
    const applyLikes = (likes: string[]) =>
      setFeed((prev) =>
        prev.map((f) =>
          f.workout.id === workoutId ? { ...f, workout: { ...f.workout, likes } } : f,
        ),
      );
    const before = item.workout.likes;
    applyLikes(liked ? [...before, myId] : before.filter((id) => id !== myId));
    setLike(workoutId, myId, liked).catch((error: unknown) => {
      applyLikes(before);
      infoDialog('Kunne ikke oppdatere like', feilmelding(error));
    });
  };

  /** Ny kommentar sendt fra arket — oppdater kommentartallet på kortet */
  const handleCommentAdded = (comment: WorkoutComment) => {
    const workoutId = commentWorkoutId;
    if (!workoutId) return;
    setFeed((prev) =>
      prev.map((f) =>
        f.workout.id === workoutId
          ? { ...f, workout: { ...f.workout, comments: [...f.workout.comments, comment] } }
          : f,
      ),
    );
  };

  const uploadLegacy = async () => {
    setMigrating(true);
    try {
      const result = await migrateLegacyData();
      setShowLegacyPrompt(false);
      await AsyncStorage.setItem(LEGACY_PROMPT_DISMISSED_KEY, '1');
      infoDialog(
        'Opplasting fullført',
        result.workouts === 1
          ? '1 økt ble lastet opp til kontoen din.'
          : `${result.workouts} økter ble lastet opp til kontoen din.`,
      );
      // Hent alt på nytt så de opplastede dataene vises med en gang
      await Promise.all([refreshAll(), loadFeed()]);
    } catch (error) {
      infoDialog('Opplastingen feilet', feilmelding(error));
    } finally {
      setMigrating(false);
    }
  };

  const dismissLegacy = () => {
    setShowLegacyPrompt(false);
    AsyncStorage.setItem(LEGACY_PROMPT_DISMISSED_KEY, '1').catch(() => {});
  };

  if (!user) return null;

  const firstName = (user.displayName || user.username).split(' ')[0];
  const todayRaw = formatFullDate(new Date().toISOString());
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  const header = (
    <View style={{ gap: spacing.lg, marginBottom: spacing.sm }}>
      {/* Toppseksjon */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <AppText variant="title" numberOfLines={1}>
            Hei, {firstName} 👋
          </AppText>
          <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
            {today}
          </AppText>
        </View>
        <Pressable
          hitSlop={6}
          onPress={() => router.push('/notifications')}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: radius.full,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          {unread > 0 && (
            <View style={{ position: 'absolute', top: -4, right: -4 }}>
              <CountBadge count={unread} />
            </View>
          )}
        </Pressable>
        <Pressable hitSlop={6} onPress={() => router.push('/(tabs)/profil')}>
          <Avatar name={user.displayName} color={user.avatarColor} uri={user.avatarUri} size={42} />
        </Pressable>
      </View>

      {/* Lokale data fra gammel versjon */}
      {showLegacyPrompt && (
        <Animated.View entering={FadeInDown.duration(250)}>
          <Card style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.accent} />
              <AppText variant="bodyBold" style={{ flex: 1 }}>
                Økter lagret på denne enheten
              </AppText>
            </View>
            <AppText variant="caption" color="secondary">
              Du har økter lagret lokalt fra før — vil du laste dem opp til kontoen din?
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Last opp"
                size="sm"
                icon="cloud-upload-outline"
                loading={migrating}
                onPress={() => void uploadLegacy()}
              />
              <Button
                title="Avvis"
                size="sm"
                variant="ghost"
                disabled={migrating}
                onPress={dismissLegacy}
              />
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Pågående økt */}
      {active && (
        <Animated.View entering={FadeInDown.duration(250)}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/workout/active');
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              backgroundColor: colors.accent,
              borderRadius: radius.lg,
              padding: spacing.lg,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Ionicons name="play-circle" size={28} color={colors.onAccent} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyBold" color="onAccent">
                Økt pågår — fortsett
              </AppText>
              <AppText variant="caption" color="onAccent" numberOfLines={1} style={{ opacity: 0.85 }}>
                {active.name || 'Treningsøkt'}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.onAccent} />
          </Pressable>
        </Animated.View>
      )}

      {/* Ukesoversikt */}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <StatTile label="Økter" value={`${weekStats.count}`} icon="barbell-outline" />
        </View>
        <View style={{ flex: 1 }}>
          <StatTile label="Volum" value={formatVolume(weekStats.volumeKg)} icon="trending-up" />
        </View>
        <View style={{ flex: 1 }}>
          <StatTile label="Streak" value={`${weekStats.streak} 🔥`} />
        </View>
      </View>

      <AppText variant="heading">Siste økter</AppText>

      {/* Feeden feilet, men vi har gamle data å vise */}
      {feedError && feed.length > 0 ? (
        <AppText variant="caption" color="danger">
          {feedError}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <Screen padded={false}>
      <FlatList
        data={feed}
        keyExtractor={(item) => item.workout.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.md }}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          !feedLoaded ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : feedError ? (
            <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
              <AppText variant="body" color="danger" style={{ textAlign: 'center' }}>
                {feedError}
              </AppText>
              <Button
                title="Prøv igjen"
                variant="secondary"
                size="sm"
                icon="refresh"
                onPress={() => void loadFeed()}
              />
            </View>
          ) : (
            <EmptyState
              icon="barbell-outline"
              title="Start din første økt"
              message="Øktene dine — og venners delte økter — dukker opp her."
              actionTitle="Start økt"
              onAction={() => router.push('/(tabs)/trening')}
            />
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 6) * 50)}>
            <WorkoutCard
              workout={item.workout}
              author={item.author}
              myUserId={user.id}
              onToggleLike={() => toggleLike(item.workout.id)}
              onPressComments={() => setCommentWorkoutId(item.workout.id)}
              onPress={() => router.push(`/workout/${item.workout.id}`)}
            />
          </Animated.View>
        )}
      />

      <CommentSheet
        visible={commentWorkoutId != null}
        workoutId={commentWorkoutId ?? ''}
        onClose={() => setCommentWorkoutId(null)}
        onCommentAdded={handleCommentAdded}
      />
    </Screen>
  );
}
