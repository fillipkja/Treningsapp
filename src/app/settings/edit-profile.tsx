import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
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

/** "182" / "82,5" -> tall, tom streng -> undefined */
function parseMeasure(value: string): number | undefined {
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
  const [avatarUri, setAvatarUri] = useState(user?.avatarUri);
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? avatarColors[0]);
  const [usernameError, setUsernameError] = useState<string | undefined>(undefined);

  if (!user) return null;

  const pickImage = async () => {
    Haptics.selectionAsync();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const save = () => {
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    if (cleanUsername.length < 3) {
      setUsernameError('Brukernavnet må ha minst 3 tegn');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setUsernameError(undefined);
    updateProfile({
      displayName: displayName.trim() || cleanUsername,
      username: cleanUsername,
      bio: bio.trim() || undefined,
      heightCm: parseMeasure(heightCm),
      weightKg: parseMeasure(weightKg),
      goal,
      avatarUri,
      avatarColor,
    });
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
            <Pressable onPress={pickImage} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Avatar
                name={displayName || username || '?'}
                color={avatarColor}
                uri={avatarUri}
                size={96}
              />
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 32,
                  height: 32,
                  borderRadius: radius.full,
                  backgroundColor: colors.accent,
                  borderWidth: 2,
                  borderColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="camera" size={16} color={colors.onAccent} />
              </View>
            </Pressable>
            <AppText variant="caption" color="muted">
              Trykk på bildet for å velge fra biblioteket, eller velg en farge
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {avatarColors.map((color) => {
                const selected = !avatarUri && color === avatarColor;
                return (
                  <Pressable
                    key={color}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAvatarColor(color);
                      setAvatarUri(undefined);
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
            />
            <Input
              label="Brukernavn"
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                if (usernameError) setUsernameError(undefined);
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

        <Animated.View entering={FadeInDown.delay(180).duration(300)} style={{ marginTop: spacing.xl }}>
          <Button title="Lagre" icon="checkmark" size="lg" fullWidth onPress={save} />
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
