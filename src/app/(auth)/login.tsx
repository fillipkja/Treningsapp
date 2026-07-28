import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuthStore } from '@/lib/store/auth';
import { useTheme } from '@/theme';

/** Innlogging med e-post og passord via Supabase. */
export default function LoginScreen() {
  const { colors, spacing, radius } = useTheme();
  const t = useT();
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    if (!email.trim() || !password) {
      setError(t('auth.fillEmailAndPassword'));
      return;
    }
    setLoading(true);
    setError(undefined);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // index-redirecten ruter videre til onboarding eller tabs
    router.replace('/');
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: spacing.xxl }}
        >
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={{ alignItems: 'center', gap: spacing.md }}
          >
            <LinearGradient
              colors={colors.gradientAccent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 88,
                height: 88,
                borderRadius: radius.xl,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="barbell" size={44} color={colors.onAccent} />
            </LinearGradient>
            <AppText variant="hero" color="accent">
              LØFT
            </AppText>
            <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
              {t('auth.tagline')}
            </AppText>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(400).delay(150)}
            style={{ gap: spacing.lg }}
          >
            <Input
              label={t('auth.emailLabel')}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(undefined);
              }}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
            <Input
              label={t('auth.passwordLabel')}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(undefined);
              }}
              placeholder={t('auth.passwordPlaceholderLogin')}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              onSubmitEditing={handleLogin}
            />
            {error ? (
              <AppText variant="caption" color="danger">
                {error}
              </AppText>
            ) : null}
            <Button
              title={t('auth.signIn')}
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleLogin}
            />
            <Pressable
              hitSlop={8}
              onPress={() => router.push('/(auth)/register')}
              style={({ pressed }) => ({ alignSelf: 'center', opacity: pressed ? 0.7 : 1 })}
            >
              <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
                {t('auth.noAccountPrompt')}{' '}
                <AppText variant="bodyBold" color="accent">
                  {t('auth.createAccount')}
                </AppText>
              </AppText>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
