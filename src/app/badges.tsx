import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText, Card, ProgressBar, Screen, ScreenHeader } from '@/components/ui';
import { useLanguage, useT } from '@/i18n';
import { tierLabel } from '@/i18n/labels';
import { formatRelativeDate } from '@/lib/format';
import { BADGE_DEFS, badgeDescription, badgeName } from '@/lib/logic/badges';
import { useWorkoutStore } from '@/lib/store/workouts';
import { tierColors, useTheme } from '@/theme';

/** «I dag»/«Today» skal ha liten forbokstav midt i setningen; datoer beholdes som de er */
function relativeDateInline(iso: string): string {
  const rel = formatRelativeDate(iso);
  return rel === 'I dag' || rel === 'I går' || rel === 'Today' || rel === 'Yesterday'
    ? rel.toLowerCase()
    : rel;
}

export default function BadgesScreen() {
  const { colors, spacing, radius, isDark } = useTheme();
  const mode = isDark ? 'dark' : 'light';
  const t = useT();
  const lang = useLanguage();
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
      <ScreenHeader title={t('common.badges')} />

      <Animated.View
        entering={FadeInDown.duration(300)}
        style={{ gap: spacing.sm, marginBottom: spacing.lg }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <AppText variant="subheading">
            {t('compete.earnedOf', { earned: earnedCount, total: BADGE_DEFS.length })}
          </AppText>
          <AppText variant="caption" color="muted">
            {t('compete.percentValue', {
              value: Math.round((earnedCount / BADGE_DEFS.length) * 100),
            })}
          </AppText>
        </View>
        <ProgressBar progress={earnedCount / BADGE_DEFS.length} color={colors.gold} />
      </Animated.View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {sortedDefs.map((def, index) => {
          const earnedAt = earnedAtById.get(def.id);
          const locked = !earnedAt;
          const tint = tierColors[mode][def.tier];
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
                      backgroundColor: locked ? colors.surfaceElevated : `${tint}29`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={
                        locked ? 'lock-closed' : (def.icon as keyof typeof Ionicons.glyphMap)
                      }
                      size={30}
                      color={locked ? colors.textMuted : tint}
                    />
                  </View>
                  <AppText variant="bodyBold" numberOfLines={1} style={{ textAlign: 'center' }}>
                    {badgeName(def.id, lang)}
                  </AppText>
                  <AppText
                    variant="caption"
                    color="muted"
                    numberOfLines={2}
                    style={{ textAlign: 'center', minHeight: 32 }}
                  >
                    {badgeDescription(def.id, lang)}
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
                      {tierLabel(def.tier, lang)}
                    </AppText>
                  </View>
                </View>
                <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
                  {locked ? (
                    <AppText variant="caption" color="muted">
                      {t('compete.locked')}
                    </AppText>
                  ) : (
                    <AppText variant="caption" color="success" style={{ fontWeight: '600' }}>
                      {t('compete.earnedDate', { date: relativeDateInline(earnedAt) })}
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
