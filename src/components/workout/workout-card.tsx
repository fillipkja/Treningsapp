import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Avatar, Card } from '@/components/ui';
import { PrBadge } from '@/components/workout/pr-badge';
import { useLanguage, useT, type AppLanguage } from '@/i18n';
import { exerciseDisplayName } from '@/lib/data/exercise-i18n';
import { formatDuration, formatKg, formatTimeAgo, formatVolume } from '@/lib/format';
import { getExerciseById } from '@/lib/store/exercises';
import { useTheme } from '@/theme';
import type { UserProfile, Workout, WorkoutExercise } from '@/types';

interface WorkoutCardProps {
  workout: Workout;
  /** Angitt -> forfatter-rad (avatar + navn + tid) øverst i stedet for navn/tid-raden */
  author?: UserProfile;
  /** Min bruker-id — brukes til å avgjøre om hjertet er fylt */
  myUserId?: string;
  /** Angitt -> like/kommentar-rad nederst */
  onToggleLike?: () => void;
  onPress?: () => void;
  onPressComments?: () => void;
}

const MAX_EXERCISE_LINES = 3;

/** Tyngste fullførte arbeidssett i en øvelse (fallback: tyngste sett uansett) */
function heaviestSet(exercise: WorkoutExercise) {
  const working = exercise.sets.filter((s) => s.completed && !s.isWarmup);
  const pool = working.length > 0 ? working : exercise.sets;
  if (pool.length === 0) return undefined;
  return pool.reduce((best, s) => (s.weightKg > best.weightKg ? s : best), pool[0]);
}

function exerciseLine(exercise: WorkoutExercise, lang: AppLanguage, fallbackName: string): string {
  const found = getExerciseById(exercise.exerciseId);
  const name = found ? exerciseDisplayName(found, lang) : fallbackName;
  const top = heaviestSet(exercise);
  const weight = top && top.weightKg > 0 ? ` ${formatKg(top.weightKg)}` : '';
  return `${exercise.sets.length} × ${name}${weight}`;
}

/** Loggført økt — navn, nøkkeltall og øvelser. Med author/onToggleLike blir den et sosialt feed-kort. */
export function WorkoutCard({
  workout,
  author,
  myUserId,
  onToggleLike,
  onPress,
  onPressComments,
}: WorkoutCardProps) {
  const { colors, spacing, typography } = useTheme();
  const t = useT();
  const lang = useLanguage();
  const heartScale = useRef(new Animated.Value(1)).current;

  const visibleExercises = workout.exercises.slice(0, MAX_EXERCISE_LINES);
  const hiddenCount = workout.exercises.length - visibleExercises.length;

  const liked = !!myUserId && workout.likes.includes(myUserId);

  const handleToggleLike = () => {
    if (!onToggleLike) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    heartScale.setValue(0.6);
    Animated.spring(heartScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 14,
    }).start();
    onToggleLike();
  };

  const prBadge =
    workout.prCount > 0 ? (
      <PrBadge label={workout.prCount > 1 ? `${workout.prCount} PR` : 'PR'} />
    ) : null;

  return (
    <Card onPress={onPress}>
      {author ? (
        // Forfatter-rad (sosial visning)
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar
            name={author.displayName || author.username}
            color={author.avatarColor}
            uri={author.avatarUri}
            size={40}
          />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyBold" numberOfLines={1}>
              {author.displayName || author.username}
            </AppText>
            <AppText variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 2 }}>
              {workout.name} · {formatTimeAgo(workout.date)}
            </AppText>
          </View>
          {prBadge}
        </View>
      ) : (
        // Navn + tidspunkt (ren logg-visning)
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <AppText variant="subheading" numberOfLines={1}>
              {workout.name}
            </AppText>
            <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
              {formatTimeAgo(workout.date)}
            </AppText>
          </View>
          {prBadge}
        </View>
      )}

      {/* Statistikk-rad */}
      <View style={{ flexDirection: 'row', marginTop: spacing.md, gap: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color="muted">
            {t('common.volume')}
          </AppText>
          <AppText style={[typography.heading, { marginTop: 2 }]}>
            {formatVolume(workout.totalVolumeKg)}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color="muted">
            {t('common.sets')}
          </AppText>
          <AppText style={[typography.heading, { marginTop: 2 }]}>{workout.totalSets}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color="muted">
            {t('common.time')}
          </AppText>
          <AppText style={[typography.heading, { marginTop: 2 }]} numberOfLines={1}>
            {workout.durationMin != null ? formatDuration(workout.durationMin) : '–'}
          </AppText>
        </View>
      </View>

      {/* Øvelseslinjer */}
      {visibleExercises.length > 0 && (
        <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
          {visibleExercises.map((exercise) => (
            <AppText key={exercise.id} variant="body" color="secondary" numberOfLines={1}>
              {exerciseLine(exercise, lang, t('home.unknownExercise'))}
            </AppText>
          ))}
          {hiddenCount > 0 && (
            <AppText variant="caption" color="muted">
              {t('home.moreExercises', { count: hiddenCount })}
            </AppText>
          )}
        </View>
      )}

      {/* Like/kommentar-rad (kun sosial visning) */}
      {onToggleLike && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xl,
            marginTop: spacing.md,
            paddingTop: spacing.md,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          }}
        >
          <Pressable
            hitSlop={8}
            onPress={handleToggleLike}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={22}
                color={liked ? colors.danger : colors.textMuted}
              />
            </Animated.View>
            <AppText
              variant="caption"
              style={{ color: liked ? colors.danger : colors.textMuted, fontWeight: '600' }}
            >
              {workout.likes.length}
            </AppText>
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={onPressComments}
            disabled={!onPressComments}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
            <AppText variant="caption" color="muted" style={{ fontWeight: '600' }}>
              {workout.comments.length}
            </AppText>
          </Pressable>
        </View>
      )}
    </Card>
  );
}
