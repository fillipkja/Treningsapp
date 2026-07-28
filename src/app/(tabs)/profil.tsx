import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
import { confirmDialog } from '@/lib/dialogs';
import { formatNumber } from '@/lib/format';
import { useAuthStore } from '@/lib/store/auth';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme } from '@/theme';
import type { TrainingGoal } from '@/types';

const GOAL_LABELS: Record<TrainingGoal, string> = {
  styrke: 'Styrke 🏋️',
  muskelvekst: 'Muskelvekst 💪',
  utholdenhet: 'Utholdenhet 🏃',
  helse: 'Helse 🌱',
};

function Stat({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  const { spacing } = useTheme();
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
      <AppText variant="title">{formatNumber(value)}</AppText>
      <AppText variant="caption" color="muted">
        {label}
      </AppText>
    </Pressable>
  );
}

export default function ProfilScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const workouts = useWorkoutStore((s) => s.workouts);
  const earnedBadges = useWorkoutStore((s) => s.earnedBadges);
  const prs = useWorkoutStore((s) => s.prs);

  if (!user) return null;

  const confirmSignOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    confirmDialog({
      title: 'Logg ut',
      message: 'Er du sikker på at du vil logge ut?',
      confirmLabel: 'Logg ut',
      destructive: true,
      onConfirm: () => {
        signOut();
        router.replace('/(auth)/login');
      },
    });
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Profil" hideBack />

      {/* Toppkort med identitet */}
      <Animated.View entering={FadeInDown.duration(300)}>
        <Card style={{ alignItems: 'center', gap: spacing.md }}>
          <Avatar name={user.displayName || user.username} color={user.avatarColor} uri={user.avatarUri} size={96} />
          <View style={{ alignItems: 'center', gap: 2 }}>
            <AppText variant="title" numberOfLines={1}>
              {user.displayName || user.username}
            </AppText>
            <AppText variant="body" color="muted">
              @{user.username}
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
            {user.goal ? <Chip label={GOAL_LABELS[user.goal]} selected /> : null}
          </View>
          <Button
            title="Rediger profil"
            variant="secondary"
            icon="create-outline"
            fullWidth
            onPress={() => router.push('/settings/edit-profile')}
          />
        </Card>
      </Animated.View>

      {/* Statistikkrad */}
      <Animated.View entering={FadeInDown.delay(60).duration(300)}>
        <Card style={{ marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
          <Stat value={workouts.length} label="Økter totalt" />
          <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
          <Stat value={prs.length} label="Rekorder" onPress={() => router.push('/(tabs)/statistikk')} />
          <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
          <Stat value={earnedBadges.length} label="Merker" onPress={() => router.push('/badges')} />
        </Card>
      </Animated.View>

      {/* Meny */}
      <Animated.View entering={FadeInDown.delay(120).duration(300)}>
        <Card style={{ marginTop: spacing.lg }} padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <ListItem
              title="Merker"
              subtitle={`${formatNumber(earnedBadges.length)} opptjent`}
              icon="ribbon-outline"
              chevron
              onPress={() => router.push('/badges')}
            />
            <Divider />
            <ListItem
              title="Innstillinger"
              subtitle="Tema og om appen"
              icon="settings-outline"
              chevron
              onPress={() => router.push('/settings')}
            />
            <Divider />
            <ListItem title="Logg ut" icon="log-out-outline" destructive onPress={confirmSignOut} />
          </View>
        </Card>
      </Animated.View>
    </Screen>
  );
}
