import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText, Button, Screen } from '@/components/ui';
import { useAuthStore } from '@/lib/store/auth';
import { useTheme } from '@/theme';

/**
 * Velkomstskjerm. Appen er lokal-først: profilen opprettes og lagres kun på
 * denne enheten — ingen konto, ingen server. Ekte innlogging (e-post/Google/
 * Apple) kobles på her når en backend er på plass.
 */
export default function WelcomeScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);

  const handleStart = () => {
    signIn('epost');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const onboarded = useAuthStore.getState().isOnboarded;
    router.replace(onboarded ? '/(tabs)' : '/(auth)/onboarding');
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xxl }}>
        <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: radius.xl,
              backgroundColor: colors.accentMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="barbell" size={44} color={colors.accent} />
          </View>
          <AppText variant="hero" color="accent">
            LØFT
          </AppText>
          <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
            Loggfør styrkeøktene dine, følg utviklingen med grafer og sett nye personlige rekorder.
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={{ gap: spacing.md }}>
          <Button title="Kom i gang" size="lg" fullWidth onPress={handleStart} />
          <AppText variant="caption" color="muted" style={{ textAlign: 'center' }}>
            Alt lagres lokalt på enheten din — ingen konto nødvendig.
          </AppText>
        </Animated.View>
      </View>
    </Screen>
  );
}
