import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText, Card, ProgressBar, Screen, ScreenHeader } from '@/components/ui';
import { formatRelativeDate } from '@/lib/format';
import { BADGE_DEFS } from '@/lib/logic/badges';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme, type ThemeColors } from '@/theme';
import type { BadgeTier } from '@/types';

const TIER_LABEL: Record<BadgeTier, string> = {
  bronse: 'Bronse',
  sølv: 'Sølv',
  gull: 'Gull',
};

function tierColor(tier: BadgeTier, colors: ThemeColors): string {
  if (tier === 'gull') return colors.gold;
  if (tier === 'sølv') return colors.textSecondary;
  // Bronse finnes ikke i paletten — eneste tillatte unntak fra temafargene.
  return '#b08d57';
}

/** «Opptjent 12. mars» — med liten forbokstav for «i dag»/«i går» */
function earnedLabel(iso: string): string {
  const rel = formatRelativeDate(iso);
  const text = rel === 'I dag' || rel === 'I går' ? rel.toLowerCase() : rel;
  return `Opptjent ${text}`;
}

export default function BadgesScreen() {
  const { colors, spacing, radius } = useTheme();
  const earnedBadges = useWorkoutStore((s) => s.earnedBadges);

  const earnedAtById = useMemo(
    () => new Map(earnedBadges.map((b) => [b.badgeId, b.earnedAt])),
    [earnedBadges],
  );

  const sortedDefs = useMemo(
    () =>
      [...BADGE_DEFS].sort((a, b) => {
        const aEarned = earnedAtById.has(a.id);
        const bEarned = earnedAtById.has(b.id);
        if (aEarned === bEarned) return 0;
        return aEarned ? -1 : 1;
      }),
    [earnedAtById],
  );

  const earnedCount = earnedAtById.size;

  return (
    <Screen scroll>
      <ScreenHeader title="Merker" />

      <Animated.View
        entering={FadeInDown.duration(300)}
        style={{ gap: spacing.sm, marginBottom: spacing.lg }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <AppText variant="subheading">{`${earnedCount} av ${BADGE_DEFS.length} opptjent`}</AppText>
          <AppText variant="caption" color="muted">
            {`${Math.round((earnedCount / BADGE_DEFS.length) * 100)} %`}
          </AppText>
        </View>
        <ProgressBar progress={earnedCount / BADGE_DEFS.length} color={colors.gold} />
      </Animated.View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {sortedDefs.map((def, index) => {
          const earnedAt = earnedAtById.get(def.id);
          const locked = !earnedAt;
          const tint = tierColor(def.tier, colors);
          return (
            <Animated.View
              key={def.id}
              entering={FadeInDown.delay(Math.min(index, 10) * 40).duration(300)}
              style={{ flexBasis: '46%', flexGrow: 1 }}
            >
              <Card style={{ minHeight: 208 }}>
                <View style={{ alignItems: 'center', gap: spacing.sm, opacity: locked ? 0.45 : 1 }}>
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: radius.full,
                      backgroundColor: colors.surfaceElevated,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText style={{ fontSize: 30 }}>{def.icon}</AppText>
                  </View>
                  <AppText variant="bodyBold" numberOfLines={1} style={{ textAlign: 'center' }}>
                    {def.name}
                  </AppText>
                  <AppText
                    variant="caption"
                    color="muted"
                    numberOfLines={2}
                    style={{ textAlign: 'center', minHeight: 32 }}
                  >
                    {def.description}
                  </AppText>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: tint,
                      borderRadius: radius.full,
                      paddingHorizontal: spacing.md,
                      paddingVertical: 2,
                    }}
                  >
                    <AppText variant="caption" style={{ color: tint, fontWeight: '600' }}>
                      {TIER_LABEL[def.tier]}
                    </AppText>
                  </View>
                </View>
                <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
                  {locked ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                      <AppText variant="caption" color="muted">
                        Låst
                      </AppText>
                    </View>
                  ) : (
                    <AppText variant="caption" color="success" style={{ fontWeight: '600' }}>
                      {earnedLabel(earnedAt)}
                    </AppText>
                  )}
                </View>
              </Card>
            </Animated.View>
          );
        })}
      </View>
    </Screen>
  );
}
