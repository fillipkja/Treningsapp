import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { useAuthStore } from '@/lib/store/auth';
import { useTheme } from '@/theme';

/** Innlogging med e-post og passord via Supabase. */
export default function LoginScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    if (!email.trim() || !password) {
      setError('Fyll inn e-post og passord.');
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
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: radius.xl,
                backgroundColor: colors.accentMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="barbell" size={44} color={colors.accent} />
            </View>
            <AppText variant="hero" color="accent">
              LØFT
            </AppText>
            <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
              Logg økter. Følg venner. Sett rekorder.
            </AppText>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(400).delay(150)}
            style={{ gap: spacing.lg }}
          >
            <Input
              label="E-post"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(undefined);
              }}
              placeholder="deg@epost.no"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
            <Input
              label="Passord"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(undefined);
              }}
              placeholder="Passordet ditt"
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
              title="Logg inn"
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
                Ny her? <AppText variant="bodyBold" color="accent">Opprett konto</AppText>
              </AppText>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
