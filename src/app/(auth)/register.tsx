import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText, Button, Input, Screen } from '@/components/ui';
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
    if (!email.trim()) errors.email = 'E-post er obligatorisk';
    else if (!EMAIL_RE.test(email.trim())) errors.email = 'Skriv inn en gyldig e-postadresse';
    if (!password) errors.password = 'Passord er obligatorisk';
    else if (password.length < 6) errors.password = 'Passordet må ha minst 6 tegn';
    if (confirm !== password) errors.confirm = 'Passordene er ikke like';
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
              Sjekk e-posten din 📬
            </AppText>
            <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
              Vi har sendt en lenke til {email.trim()}. Klikk lenken for å aktivere kontoen, kom så
              tilbake og logg inn.
            </AppText>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(400).delay(150)}>
            <Button
              title="Til innlogging"
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
            <AppText variant="title">Opprett konto</AppText>
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
                setFieldErrors((e) => ({ ...e, email: undefined }));
                if (serverError) setServerError(undefined);
              }}
              error={fieldErrors.email}
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
                setFieldErrors((e) => ({ ...e, password: undefined }));
                if (serverError) setServerError(undefined);
              }}
              error={fieldErrors.password}
              placeholder="Minst 6 tegn"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <Input
              label="Gjenta passord"
              value={confirm}
              onChangeText={(text) => {
                setConfirm(text);
                setFieldErrors((e) => ({ ...e, confirm: undefined }));
                if (serverError) setServerError(undefined);
              }}
              error={fieldErrors.confirm}
              placeholder="Samme passord en gang til"
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
              title="Opprett konto"
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
                Har du konto? <AppText variant="bodyBold" color="accent">Logg inn</AppText>
              </AppText>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
