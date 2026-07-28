import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
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
import { useAuthStore } from '@/lib/store/auth';
import { avatarColors, useTheme } from '@/theme';
import type { TrainingGoal } from '@/types';

const STEP_COUNT = 4;
const USERNAME_RE = /^[a-z0-9._]+$/;

const GOALS: { value: TrainingGoal; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'styrke', label: 'Styrke', icon: 'barbell-outline' },
  { value: 'muskelvekst', label: 'Muskelvekst', icon: 'body-outline' },
  { value: 'utholdenhet', label: 'Utholdenhet', icon: 'pulse-outline' },
  { value: 'helse', label: 'Helse', icon: 'heart-outline' },
];

function validateUsername(username: string): string | undefined {
  if (!username) return 'Brukernavn er obligatorisk';
  if (username.length < 3) return 'Brukernavnet må ha minst 3 tegn';
  if (!USERNAME_RE.test(username))
    return 'Kun småbokstaver, tall, punktum og understrek';
  return undefined;
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return num;
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);

  // Steg 1: identitet
  const [username, setUsername] = useState(user?.username ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [usernameError, setUsernameError] = useState<string | undefined>(undefined);

  // Steg 2: avatar
  const [avatarUri, setAvatarUri] = useState<string | undefined>(user?.avatarUri);
  const [avatarColor, setAvatarColor] = useState<string>(user?.avatarColor ?? avatarColors[0]);

  // Steg 3: kropp
  const [heightStr, setHeightStr] = useState('');
  const [weightStr, setWeightStr] = useState('');

  // Steg 4: mål
  const [goal, setGoal] = useState<TrainingGoal | undefined>(user?.goal);

  const isLastStep = step === STEP_COUNT - 1;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleComplete = () => {
    completeOnboarding({
      username: username.trim(),
      displayName: displayName.trim(),
      avatarUri,
      avatarColor,
      heightCm: parseOptionalNumber(heightStr),
      weightKg: parseOptionalNumber(weightStr),
      goal,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  const goNext = () => {
    if (step === 0) {
      const error = validateUsername(username.trim());
      setUsernameError(error);
      if (error) return;
    }
    if (isLastStep) {
      handleComplete();
      return;
    }
    Haptics.selectionAsync();
    setStep((s) => s + 1);
  };

  const goBack = () => {
    Haptics.selectionAsync();
    setStep((s) => Math.max(0, s - 1));
  };

  const previewName = displayName.trim() || username.trim() || 'Deg';

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={{ gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.xs }}>
              <AppText variant="title">Velg brukernavn</AppText>
              <AppText variant="body" color="secondary">
                Dette er navnet ditt i appen.
              </AppText>
            </View>
            <Input
              label="Brukernavn"
              value={username}
              onChangeText={(text) => {
                setUsername(text.toLowerCase());
                if (usernameError) setUsernameError(undefined);
              }}
              error={usernameError}
              placeholder="f.eks. ola.nordmann"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label="Visningsnavn"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="f.eks. Ola Nordmann"
              autoComplete="name"
            />
            <AppText variant="caption" color="muted">
              Minst 3 tegn. Småbokstaver, tall, punktum og understrek.
            </AppText>
          </View>
        );
      case 1:
        return (
          <View style={{ gap: theme.spacing.xl }}>
            <View style={{ gap: theme.spacing.xs }}>
              <AppText variant="title">Velg avatar</AppText>
              <AppText variant="body" color="secondary">
                Last opp et bilde, eller velg en farge til initialene dine.
              </AppText>
            </View>
            <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
              <Avatar name={previewName} color={avatarColor} uri={avatarUri} size={112} />
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <Button
                  title="Velg bilde"
                  icon="image-outline"
                  variant="secondary"
                  onPress={pickImage}
                />
                {avatarUri ? (
                  <Button
                    title="Fjern bilde"
                    icon="trash-outline"
                    variant="ghost"
                    onPress={() => setAvatarUri(undefined)}
                  />
                ) : null}
              </View>
            </View>
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="label" color="muted">
                Eller velg en farge
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
                {avatarColors.map((color) => {
                  const selected = !avatarUri && color === avatarColor;
                  return (
                    <Pressable
                      key={color}
                      onPress={() => {
                        setAvatarColor(color);
                        setAvatarUri(undefined);
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
          </View>
        );
      case 2:
        return (
          <View style={{ gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.xs }}>
              <AppText variant="title">Kroppsdata</AppText>
              <AppText variant="body" color="secondary">
                Valgfritt — brukes til statistikk og relativ styrke.
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Høyde (cm)"
                  value={heightStr}
                  onChangeText={setHeightStr}
                  placeholder="180"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Vekt (kg)"
                  value={weightStr}
                  onChangeText={setWeightStr}
                  placeholder="80"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <AppText variant="caption" color="muted">
              Du kan hoppe over dette og fylle inn senere i innstillinger.
            </AppText>
          </View>
        );
      case 3:
        return (
          <View style={{ gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.xs }}>
              <AppText variant="title">Hva er målet ditt?</AppText>
              <AppText variant="body" color="secondary">
                Velg det som passer best akkurat nå.
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
              {GOALS.map((g) => (
                <Chip
                  key={g.value}
                  label={g.label}
                  icon={g.icon}
                  selected={goal === g.value}
                  onPress={() => {
                    setGoal(g.value);
                    Haptics.selectionAsync();
                  }}
                />
              ))}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title="Sett opp profilen"
        hideBack={step === 0}
        onBack={goBack}
        right={
          <AppText variant="caption" color="muted">
            {step + 1} av {STEP_COUNT}
          </AppText>
        }
      />
      <ProgressBar progress={(step + 1) / STEP_COUNT} />
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
            title={isLastStep ? 'Fullfør' : 'Fortsett'}
            icon={isLastStep ? 'checkmark' : 'arrow-forward'}
            onPress={goNext}
            size="lg"
            fullWidth
            disabled={step === 3 && !goal}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
