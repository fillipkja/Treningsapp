import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  Card,
  ListItem,
  Screen,
  ScreenHeader,
  SegmentedControl,
} from '@/components/ui';
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
  const { colors, spacing } = useTheme();

  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);

  return (
    <Screen scroll>
      <ScreenHeader title="Innstillinger" />

      <Animated.View entering={FadeInDown.duration(300)}>
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

      <Animated.View entering={FadeInDown.delay(60).duration(300)}>
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
