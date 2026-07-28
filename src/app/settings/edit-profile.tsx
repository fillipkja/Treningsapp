import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  Avatar,
  Button,
  Card,
  Chip,
  Input,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { useAuthStore } from '@/lib/store/auth';
import { avatarColors, useTheme } from '@/theme';
import type { TrainingGoal } from '@/types';

const GOAL_OPTIONS: { value: TrainingGoal; label: string }[] = [
  { value: 'styrke', label: 'Styrke 🏋️' },
  { value: 'muskelvekst', label: 'Muskelvekst 💪' },
  { value: 'utholdenhet', label: 'Utholdenhet 🏃' },
  { value: 'helse', label: 'Helse 🌱' },
];

/**
 * "182" / "82,5" -> tall. Tomt felt -> null (nullstiller kolonnen), mens
 * ugyldig tekst -> undefined (feltet lates urørt).
 */
function parseMeasure(value: string): number | null | undefined {
  if (value.trim() === '') return null;
  const n = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [heightCm, setHeightCm] = useState(user?.heightCm ? String(user.heightCm) : '');
  const [weightKg, setWeightKg] = useState(
    user?.weightKg ? String(user.weightKg).replace('.', ',') : '',
  );
  const [goal, setGoal] = useState<TrainingGoal | undefined>(user?.goal);
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? avatarColors[0]);
  const [usernameError, setUsernameError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>(undefined);

  if (!user) return null;

  const save = async () => {
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    if (cleanUsername.length < 3) {
      setUsernameError('Brukernavnet må ha minst 3 tegn');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setUsernameError(undefined);
    setSaveError(undefined);
    setSaving(true);
    const result = await updateProfile({
      displayName: displayName.trim() || cleanUsername,
      username: cleanUsername,
      bio: bio.trim(),
      heightCm: parseMeasure(heightCm),
      weightKg: parseMeasure(weightKg),
      goal,
      avatarColor,
    });
    setSaving(false);
    if (result.error) {
      // F.eks. «Brukernavnet er opptatt.» — vis feilen og hold skjermen åpen
      setSaveError(result.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <ScreenHeader title="Rediger profil" />

        {/* Avatar */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card style={{ alignItems: 'center', gap: spacing.lg }}>
            <Avatar
              name={displayName || username || '?'}
              color={avatarColor}
              size={96}
            />
            <AppText variant="caption" color="muted">
              Velg en farge til avataren din
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {avatarColors.map((color) => {
                const selected = color === avatarColor;
                return (
                  <Pressable
                    key={color}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAvatarColor(color);
                    }}
                    style={({ pressed }) => ({
                      width: 34,
                      height: 34,
                      borderRadius: radius.full,
                      backgroundColor: color,
                      borderWidth: selected ? 3 : 0,
                      borderColor: colors.textPrimary,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  />
                );
              })}
            </View>
          </Card>
        </Animated.View>

        {/* Felter */}
        <Animated.View entering={FadeInDown.delay(60).duration(300)}>
          <Card style={{ marginTop: spacing.lg, gap: spacing.lg }}>
            <Input
              label="Visningsnavn"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Ola Nordmann"
              autoCapitalize="words"
              maxLength={40}
            />
            <Input
              label="Brukernavn"
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                if (usernameError) setUsernameError(undefined);
                if (saveError) setSaveError(undefined);
              }}
              placeholder="olanordmann"
              autoCapitalize="none"
              autoCorrect={false}
              error={usernameError}
            />
            <Input
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Fortell litt om deg selv og treningen din"
              maxLength={200}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Høyde (cm)"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="180"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Vekt (kg)"
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="80"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Mål */}
        <Animated.View entering={FadeInDown.delay(120).duration(300)}>
          <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <AppText variant="label" color="muted">
              Treningsmål
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {GOAL_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={goal === option.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGoal(option.value);
                  }}
                />
              ))}
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(300)} style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {saveError ? (
            <AppText variant="body" style={{ color: colors.danger, textAlign: 'center' }}>
              {saveError}
            </AppText>
          ) : null}
          <Button title="Lagre" icon="checkmark" size="lg" fullWidth loading={saving} onPress={save} />
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
