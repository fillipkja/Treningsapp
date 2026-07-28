import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuthStore } from '@/lib/store/auth';
import { useTheme } from '@/theme';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

interface FieldErrors {
  email?: string;
  password?: string;
  confirm?: string;
}

/** Registrering med e-post og passord via Supabase. */
export default function RegisterScreen() {
  const { colors, spacing, radius } = useTheme();
  const t = useT();
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = t('auth.emailRequired');
    else if (!EMAIL_RE.test(email.trim())) errors.email = t('error.invalidEmail');
    if (!password) errors.password = t('auth.passwordRequired');
    else if (password.length < 6) errors.password = t('error.passwordTooShort');
    if (confirm !== password) errors.confirm = t('auth.passwordsDontMatch');
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (loading) return;
    setServerError(undefined);
    if (!validate()) return;
    setLoading(true);
    const result = await signUp(email, password);
    setLoading(false);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (result.needsEmailConfirm) {
      setAwaitingConfirm(true);
      return;
    }
    // index-redirecten ruter videre til onboarding
    router.replace('/');
  };

  if (awaitingConfirm) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xxl }}>
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
              <Ionicons name="mail-unread-outline" size={44} color={colors.accent} />
            </View>
            <AppText variant="title" style={{ textAlign: 'center' }}>
              {t('auth.checkEmailTitle')}
            </AppText>
            <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
              {t('auth.checkEmailBody', { email: email.trim() })}
            </AppText>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(400).delay(150)}>
            <Button
              title={t('auth.toLogin')}
              size="lg"
              fullWidth
              onPress={() => router.replace('/(auth)/login')}
            />
          </Animated.View>
        </View>
      </Screen>
    );
  }

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
            <AppText variant="title">{t('auth.createAccount')}</AppText>
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
                setFieldErrors((e) => ({ ...e, email: undefined }));
                if (serverError) setServerError(undefined);
              }}
              error={fieldErrors.email}
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
                setFieldErrors((e) => ({ ...e, password: undefined }));
                if (serverError) setServerError(undefined);
              }}
              error={fieldErrors.password}
              placeholder={t('auth.passwordPlaceholderNew')}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <Input
              label={t('auth.confirmPasswordLabel')}
              value={confirm}
              onChangeText={(text) => {
                setConfirm(text);
                setFieldErrors((e) => ({ ...e, confirm: undefined }));
                if (serverError) setServerError(undefined);
              }}
              error={fieldErrors.confirm}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              onSubmitEditing={handleRegister}
            />
            {serverError ? (
              <AppText variant="caption" color="danger">
                {serverError}
              </AppText>
            ) : null}
            <Button
              title={t('auth.createAccount')}
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleRegister}
            />
            <Pressable
              hitSlop={8}
              onPress={() => router.replace('/(auth)/login')}
              style={({ pressed }) => ({ alignSelf: 'center', opacity: pressed ? 0.7 : 1 })}
            >
              <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
                {t('auth.haveAccountPrompt')}{' '}
                <AppText variant="bodyBold" color="accent">
                  {t('auth.signIn')}
                </AppText>
              </AppText>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
