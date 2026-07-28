import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  Avatar,
  Button,
  Chip,
  Input,
  ProgressBar,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { useLanguage, useT, type TranslationKey } from '@/i18n';
import { goalLabel } from '@/i18n/labels';
import { useAuthStore } from '@/lib/store/auth';
import { avatarColors, useTheme } from '@/theme';
import type { TrainingGoal } from '@/types';

const STEP_COUNT = 4;
const USERNAME_RE = /^[a-z0-9._]+$/;

const GOALS: { value: TrainingGoal; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'styrke', icon: 'barbell-outline' },
  { value: 'muskelvekst', icon: 'body-outline' },
  { value: 'utholdenhet', icon: 'pulse-outline' },
  { value: 'helse', icon: 'heart-outline' },
];

function validateUsername(username: string): TranslationKey | undefined {
  if (!username) return 'auth.usernameRequired';
  if (username.length < 3) return 'auth.usernameTooShort';
  if (username.length > 24) return 'auth.usernameTooLong';
  if (!USERNAME_RE.test(username)) return 'auth.usernameInvalidChars';
  return undefined;
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return num;
}

/**
 * Serverbasert onboarding: profilen opprettes i Supabase via completeOnboarding.
 * Avatar er farge + initialer — bildeopplasting til server er ikke støttet ennå.
 */
export default function OnboardingScreen() {
  const theme = useTheme();
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);

  // Steg 1: identitet
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [usernameError, setUsernameError] = useState<string | undefined>(undefined);

  // Steg 2: avatarfarge
  const [avatarColor, setAvatarColor] = useState<string>(avatarColors[0]);

  // Steg 3: kropp (valgfritt)
  const [heightStr, setHeightStr] = useState('');
  const [weightStr, setWeightStr] = useState('');

  // Steg 4: mål
  const [goal, setGoal] = useState<TrainingGoal | undefined>(undefined);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);

  const isLastStep = step === STEP_COUNT - 1;

  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(undefined);
    const { error } = await completeOnboarding({
      username: username.trim(),
      displayName: displayName.trim() || username.trim(),
      avatarColor,
      heightCm: parseOptionalNumber(heightStr),
      weightKg: parseOptionalNumber(weightStr),
      goal,
    });
    setSubmitting(false);
    if (error) {
      // Brukernavnfeil (f.eks. «Brukernavnet er opptatt.») vises på riktig steg.
      // Meldingen kan være oversatt (error.usernameTaken/-Format) eller komme
      // rått fra DB-triggere på norsk — sjekk begge språk.
      if (/brukernavn|username/i.test(error)) {
        setUsernameError(error);
        setStep(0);
      } else {
        setSubmitError(error);
      }
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  const goNext = () => {
    if (step === 0) {
      const errorKey = validateUsername(username.trim());
      setUsernameError(errorKey ? t(errorKey) : undefined);
      if (errorKey) return;
    }
    if (isLastStep) {
      void handleComplete();
      return;
    }
    Haptics.selectionAsync();
    setStep((s) => s + 1);
  };

  const goBack = () => {
    if (submitting) return;
    Haptics.selectionAsync();
    setStep((s) => Math.max(0, s - 1));
  };

  const previewName = displayName.trim() || username.trim() || t('common.you');

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={{ gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.xs }}>
              <AppText variant="title">{t('auth.usernameTitle')}</AppText>
              <AppText variant="body" color="secondary">
                {t('auth.usernameSubtitle')}
              </AppText>
            </View>
            <Input
              label={t('auth.usernameLabel')}
              value={username}
              onChangeText={(text) => {
                setUsername(text.toLowerCase());
                if (usernameError) setUsernameError(undefined);
              }}
              error={usernameError}
              placeholder={t('auth.usernamePlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label={t('auth.displayNameLabel')}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('auth.displayNamePlaceholder')}
              autoComplete="name"
              maxLength={40}
            />
            <AppText variant="caption" color="muted">
              {t('auth.usernameHint')}
            </AppText>
          </View>
        );
      case 1:
        return (
          <View style={{ gap: theme.spacing.xl }}>
            <View style={{ gap: theme.spacing.xs }}>
              <AppText variant="title">{t('auth.avatarTitle')}</AppText>
              <AppText variant="body" color="secondary">
                {t('auth.avatarSubtitle')}
              </AppText>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Avatar name={previewName} color={avatarColor} size={112} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
              {avatarColors.map((color) => {
                const selected = color === avatarColor;
                return (
                  <Pressable
                    key={color}
                    onPress={() => {
                      setAvatarColor(color);
                      Haptics.selectionAsync();
                    }}
                    style={({ pressed }) => ({
                      width: 48,
                      height: 48,
                      borderRadius: theme.radius.full,
                      backgroundColor: color,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: selected ? 3 : 0,
                      borderColor: theme.colors.textPrimary,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    {selected ? (
                      <Ionicons name="checkmark" size={22} color={theme.colors.onAccent} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      case 2:
        return (
          <View style={{ gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.xs }}>
              <AppText variant="title">{t('auth.bodyTitle')}</AppText>
              <AppText variant="body" color="secondary">
                {t('auth.bodySubtitle')}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('auth.heightLabel')}
                  value={heightStr}
                  onChangeText={setHeightStr}
                  placeholder="180"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('auth.weightLabel')}
                  value={weightStr}
                  onChangeText={setWeightStr}
                  placeholder="80"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <AppText variant="caption" color="muted">
              {t('auth.bodyHint')}
            </AppText>
          </View>
        );
      case 3:
        return (
          <View style={{ gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.xs }}>
              <AppText variant="title">{t('auth.goalTitle')}</AppText>
              <AppText variant="body" color="secondary">
                {t('auth.goalSubtitle')}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
              {GOALS.map((g) => (
                <Chip
                  key={g.value}
                  label={goalLabel(g.value, lang)}
                  icon={g.icon}
                  selected={goal === g.value}
                  onPress={() => {
                    setGoal(g.value);
                    Haptics.selectionAsync();
                  }}
                />
              ))}
            </View>
            {submitError ? (
              <AppText variant="caption" color="danger">
                {submitError}
              </AppText>
            ) : null}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title={t('auth.onboardingTitle')}
        hideBack={step === 0}
        onBack={goBack}
        right={
          <AppText variant="caption" color="muted">
            {t('auth.stepOf', { step: step + 1, total: STEP_COUNT })}
          </AppText>
        }
      />
      <ProgressBar progress={(step + 1) / STEP_COUNT} color={theme.colors.accent} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingVertical: theme.spacing.xl }}
        >
          <Animated.View key={step} entering={FadeInDown.duration(250)}>
            {renderStep()}
          </Animated.View>
        </ScrollView>
        <View style={{ paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
          <Button
            title={isLastStep ? t('auth.finish') : t('auth.continue')}
            icon={isLastStep ? 'checkmark' : 'arrow-forward'}
            onPress={goNext}
            size="lg"
            fullWidth
            loading={submitting}
            disabled={step === 3 && !goal}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
