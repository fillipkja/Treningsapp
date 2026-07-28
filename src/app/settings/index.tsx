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
import { useT, type AppLanguage } from '@/i18n';
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
  const t = useT();
  const { colors, spacing } = useTheme();

  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

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
    if (result.error) infoDialog(t('profile.saveFailed'), result.error);
  };

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
      <ScreenHeader title={t('profile.settingsTitle')} />

      <Animated.View entering={FadeInDown.duration(300)}>
        <SectionLabel>{t('profile.settingsLanguage')}</SectionLabel>
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="language-outline" size={19} color={colors.accent} />
            {/* «Norsk» og «English» er egennavn — vises likt på begge språk */}
            <AppText variant="bodyBold">{t('profile.settingsLanguage')}</AppText>
          </View>
          <SegmentedControl
            options={[
              { label: 'Norsk', value: 'nb' },
              { label: 'English', value: 'en' },
            ]}
            value={language}
            onChange={(v) => {
              Haptics.selectionAsync();
              setLanguage(v as AppLanguage);
            }}
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(300)}>
        <SectionLabel>{t('profile.settingsSharing')}</SectionLabel>
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <ListItem
              title={t('profile.shareWorkoutsTitle')}
              subtitle={t('profile.shareWorkoutsSubtitle')}
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

      <Animated.View entering={FadeInDown.delay(120).duration(300)}>
        <SectionLabel>{t('profile.settingsAppearance')}</SectionLabel>
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="moon-outline" size={19} color={colors.accent} />
            <AppText variant="bodyBold">{t('profile.theme')}</AppText>
          </View>
          <SegmentedControl
            options={[
              { label: t('profile.themeDark'), value: 'dark' },
              { label: t('profile.themeLight'), value: 'light' },
              { label: t('profile.themeSystem'), value: 'system' },
            ]}
            value={themeMode}
            onChange={(v) => {
              Haptics.selectionAsync();
              setThemeMode(v as ThemeMode);
            }}
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(300)}>
        <SectionLabel>{t('profile.settingsAccount')}</SectionLabel>
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <ListItem
              title={t('profile.email')}
              subtitle={session?.user.email ?? '—'}
              icon="mail-outline"
            />
            <Divider />
            <ListItem title={t('profile.signOut')} icon="log-out-outline" destructive onPress={confirmSignOut} />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(300)}>
        <SectionLabel>{t('profile.settingsAbout')}</SectionLabel>
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <ListItem title={t('profile.version')} subtitle="1.0.0" icon="information-circle-outline" />
          </View>
        </Card>
        <AppText
          variant="caption"
          color="muted"
          style={{ textAlign: 'center', marginTop: spacing.xl }}
        >
          {t('profile.madeInNorway')}
        </AppText>
      </Animated.View>
    </Screen>
  );
}
