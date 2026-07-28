import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  Card,
  Divider,
  ListItem,
  Screen,
  ScreenHeader,
  SegmentedControl,
} from '@/components/ui';
import { confirmDialog, infoDialog } from '@/lib/dialogs';
import { useAuthStore } from '@/lib/store/auth';
import { useSettingsStore, type ThemeMode } from '@/lib/store/settings';
import { useTheme } from '@/theme';

function SectionLabel({ children }: { children: string }) {
  const { spacing } = useTheme();
  return (
    <AppText variant="label" color="muted" style={{ marginTop: spacing.xl, marginBottom: spacing.sm, marginLeft: spacing.xs }}>
      {children}
    </AppText>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);

  const session = useAuthStore((s) => s.session);
  const shareWorkouts = useAuthStore((s) => s.user?.shareWorkouts ?? true);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const signOut = useAuthStore((s) => s.signOut);

  // Optimistisk toggle: vis ny verdi med én gang, fall tilbake til
  // server-verdien hvis lagringen feiler.
  const [pendingShare, setPendingShare] = useState<boolean | null>(null);
  const shownShare = pendingShare ?? shareWorkouts;

  const toggleShare = async (value: boolean) => {
    Haptics.selectionAsync();
    setPendingShare(value);
    const result = await updateProfile({ shareWorkouts: value });
    setPendingShare(null);
    if (result.error) infoDialog('Kunne ikke lagre', result.error);
  };

  const confirmSignOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    confirmDialog({
      title: 'Logg ut',
      message: 'Er du sikker på at du vil logge ut?',
      confirmLabel: 'Logg ut',
      destructive: true,
      onConfirm: async () => {
        await signOut();
        router.replace('/(auth)/login');
      },
    });
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Innstillinger" />

      <Animated.View entering={FadeInDown.duration(300)}>
        <SectionLabel>Deling</SectionLabel>
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <ListItem
              title="Del nye økter med venner"
              subtitle="Venner ser delte økter i feeden sin"
              icon="share-social-outline"
              right={
                <Switch
                  value={shownShare}
                  onValueChange={toggleShare}
                  trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
                />
              }
            />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(300)}>
        <SectionLabel>Utseende</SectionLabel>
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="moon-outline" size={19} color={colors.accent} />
            <AppText variant="bodyBold">Tema</AppText>
          </View>
          <SegmentedControl
            options={[
              { label: 'Mørk', value: 'dark' },
              { label: 'Lys', value: 'light' },
              { label: 'System', value: 'system' },
            ]}
            value={themeMode}
            onChange={(v) => {
              Haptics.selectionAsync();
              setThemeMode(v as ThemeMode);
            }}
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(300)}>
        <SectionLabel>Konto</SectionLabel>
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <ListItem
              title="E-post"
              subtitle={session?.user.email ?? '—'}
              icon="mail-outline"
            />
            <Divider />
            <ListItem title="Logg ut" icon="log-out-outline" destructive onPress={confirmSignOut} />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(300)}>
        <SectionLabel>Om</SectionLabel>
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <ListItem title="Versjon" subtitle="1.0.0" icon="information-circle-outline" />
          </View>
        </Card>
        <AppText
          variant="caption"
          color="muted"
          style={{ textAlign: 'center', marginTop: spacing.xl }}
        >
          Laget med 💪 i Norge
        </AppText>
      </Animated.View>
    </Screen>
  );
}
