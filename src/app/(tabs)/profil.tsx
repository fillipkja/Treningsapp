import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  ListItem,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { useLanguage, useT } from '@/i18n';
import { genderLabel, goalLabel } from '@/i18n/labels';
import { confirmDialog } from '@/lib/dialogs';
import { formatNumber } from '@/lib/format';
import { useAuthStore } from '@/lib/store/auth';
import { useRecordStore } from '@/lib/store/records';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme } from '@/theme';

function Stat({
  value,
  label,
  valueColor,
  icon,
  onPress,
}: {
  value: number;
  label: string;
  valueColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: 2,
        paddingVertical: spacing.xs,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {icon ? <Ionicons name={icon} size={16} color={valueColor ?? colors.accent} /> : null}
        <AppText variant="title" style={valueColor ? { color: valueColor } : undefined}>
          {formatNumber(value)}
        </AppText>
      </View>
      <AppText variant="caption" color="muted">
        {label}
      </AppText>
    </Pressable>
  );
}

export default function ProfilScreen() {
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
  const { colors, spacing, radius } = useTheme();

  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const workouts = useWorkoutStore((s) => s.workouts);
  const earnedBadges = useWorkoutStore((s) => s.earnedBadges);
  const prs = useWorkoutStore((s) => s.prs);
  const manualRecords = useRecordStore((s) => s.records);
  const runRecords = useRecordStore((s) => s.runs);

  if (!user) return null;

  const confirmSignOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    confirmDialog({
      title: t('profile.signOut'),
      message: t('profile.signOutConfirm'),
      confirmLabel: t('profile.signOut'),
      destructive: true,
      onConfirm: async () => {
        await signOut();
        router.replace('/(auth)/login');
      },
    });
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('profile.title')} hideBack />

      {/* Toppkort med identitet */}
      <Animated.View entering={FadeInDown.duration(300)}>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {/* Dekorativ banner — avataren overlapper halvveis */}
          <LinearGradient
            colors={[...colors.gradientAccent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: 80, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }}
          />
          <View
            style={{
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.lg,
              paddingTop: 0,
              marginTop: -48,
            }}
          >
            <Avatar
              name={user.displayName || user.username}
              color={user.avatarColor}
              uri={user.avatarUri}
              icon={user.avatarIcon}
              size={96}
            />
            <View style={{ alignItems: 'center', gap: spacing.xs }}>
              <AppText variant="title" numberOfLines={1}>
                {user.displayName || user.username}
              </AppText>
              <View
                style={{
                  backgroundColor: colors.accentMuted,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 4,
                }}
              >
                <AppText variant="bodyBold" style={{ color: colors.accent }}>
                  @{user.username}
                </AppText>
              </View>
              <AppText variant="caption" color="muted" style={{ textAlign: 'center' }}>
                {t('profile.shareUsernameHint')}
              </AppText>
            </View>
            {user.bio ? (
              <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
                {user.bio}
              </AppText>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: spacing.sm,
              }}
            >
              {user.heightCm ? <Chip label={`${formatNumber(user.heightCm)} cm`} icon="resize-outline" /> : null}
              {user.weightKg ? <Chip label={`${formatNumber(user.weightKg, Number.isInteger(user.weightKg) ? 0 : 1)} kg`} icon="scale-outline" /> : null}
              {user.gender ? <Chip label={genderLabel(user.gender, lang)} icon="person-outline" /> : null}
              {user.goal ? <Chip label={goalLabel(user.goal, lang)} selected /> : null}
            </View>
            <Button
              title={t('profile.editProfile')}
              variant="secondary"
              icon="create-outline"
              fullWidth
              onPress={() => router.push('/settings/edit-profile')}
            />
          </View>
        </Card>
      </Animated.View>

      {/* Statistikkrad */}
      <Animated.View entering={FadeInDown.delay(60).duration(300)}>
        <Card style={{ marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
          <Stat value={workouts.length} label={t('profile.totalWorkouts')} />
          <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
          <Stat
            value={prs.length}
            label={t('common.records')}
            valueColor={colors.gold}
            onPress={() => router.push('/(tabs)/statistikk')}
          />
          <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
          <Stat
            value={earnedBadges.length}
            label={t('common.badges')}
            icon="ribbon"
            onPress={() => router.push('/badges')}
          />
        </Card>
      </Animated.View>

      {/* Meny */}
      <Animated.View entering={FadeInDown.delay(120).duration(300)}>
        <Card style={{ marginTop: spacing.lg }} padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <ListItem
              title={t('common.friends')}
              subtitle={t('profile.friendsSubtitle')}
              icon="people-outline"
              chevron
              onPress={() => router.push('/friends')}
            />
            <Divider />
            <ListItem
              title={t('profile.recordsTitle')}
              subtitle={
                manualRecords.length + runRecords.length === 0
                  ? t('profile.recordsSubtitle')
                  : manualRecords.length + runRecords.length === 1
                    ? t('profile.recordsOne')
                    : t('profile.recordsCount', {
                        count: formatNumber(manualRecords.length + runRecords.length),
                      })
              }
              icon="trophy-outline"
              chevron
              onPress={() => router.push('/records')}
            />
            <Divider />
            <ListItem
              title={t('common.badges')}
              subtitle={t('profile.badgesEarned', { count: formatNumber(earnedBadges.length) })}
              icon="ribbon-outline"
              chevron
              onPress={() => router.push('/badges')}
            />
            <Divider />
            <ListItem
              title={t('profile.settingsTitle')}
              subtitle={t('profile.settingsSubtitle')}
              icon="settings-outline"
              chevron
              onPress={() => router.push('/settings')}
            />
            <Divider />
            <ListItem title={t('profile.signOut')} icon="log-out-outline" destructive onPress={confirmSignOut} />
          </View>
        </Card>
      </Animated.View>
    </Screen>
  );
}
