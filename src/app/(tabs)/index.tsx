import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StatTile } from '@/components/charts';
import { WorkoutCard } from '@/components/workout/workout-card';
import { AppText, Avatar, CountBadge, EmptyState, Screen } from '@/components/ui';
import { formatFullDate, formatVolume } from '@/lib/format';
import { periodInterval, workoutsInInterval } from '@/lib/logic/leaderboard';
import { currentStreak } from '@/lib/logic/streaks';
import { useAuthStore } from '@/lib/store/auth';
import { useUnreadCount } from '@/lib/store/notifications';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const myWorkouts = useWorkoutStore((s) => s.workouts);
  const active = useWorkoutStore((s) => s.active);
  const unread = useUnreadCount();

  const weekStats = useMemo(() => {
    const now = new Date();
    const week = workoutsInInterval(myWorkouts, periodInterval('uke', now));
    return {
      count: week.length,
      volumeKg: week.reduce((sum, w) => sum + w.totalVolumeKg, 0),
      streak: currentStreak(myWorkouts.map((w) => w.date), now),
    };
  }, [myWorkouts]);

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
    </View>
  );

  return (
    <Screen padded={false}>
      <FlatList
        data={myWorkouts}
        keyExtractor={(workout) => workout.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.md }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            icon="barbell-outline"
            title="Start din første økt"
            message="Øktene dine dukker opp her når du har logget dem."
            actionTitle="Start økt"
            onAction={() => router.push('/(tabs)/trening')}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 6) * 50)}>
            <WorkoutCard workout={item} onPress={() => router.push(`/workout/${item.id}`)} />
          </Animated.View>
        )}
      />
    </Screen>
  );
}
