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
import { useLanguage, useT } from '@/i18n';
import { genderLabel, goalLabel } from '@/i18n/labels';
import { removeOtherAvatarImages, uploadAvatarImage } from '@/lib/api/avatar';
import { avatarIcons } from '@/lib/data/avatar-icons';
import { infoDialog } from '@/lib/dialogs';
import { useAuthStore } from '@/lib/store/auth';
import { avatarColors, useTheme } from '@/theme';
import type { Gender, TrainingGoal } from '@/types';

const GOAL_VALUES: TrainingGoal[] = ['styrke', 'muskelvekst', 'utholdenhet', 'helse'];
const GENDER_VALUES: Gender[] = ['mann', 'kvinne', 'annet'];

// Speiler bøtta «avatars» (0003-migrasjonen): allowed_mime_types og file_size_limit.
// Valideres ved valg så brukeren får en forståelig melding i stedet for
// storage-API-ets råe avvisning (som apiError oversetter til generisk feil).
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * "182" / "82,5" -> tall. Tomt felt -> null (nullstiller kolonnen), mens
 * ugyldig tekst -> undefined (feltet lates urørt).
 */
function parseMeasure(value: string): number | null | undefined {
  if (value.trim() === '') return null;
  const n = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

interface PickedImage {
  uri: string;
  base64: string;
  mimeType: string;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
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
  const [gender, setGender] = useState<Gender | undefined>(user?.gender);
  const [goal, setGoal] = useState<TrainingGoal | undefined>(user?.goal);
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? avatarColors[0]);
  const [avatarIcon, setAvatarIcon] = useState<string | undefined>(user?.avatarIcon);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [usernameError, setUsernameError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>(undefined);

  if (!user) return null;

  /** Bildet slik det vil se ut etter lagring: nytt valg > eksisterende > fjernet */
  const previewUri = pickedImage?.uri ?? (removeImage ? undefined : user.avatarUri);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        infoDialog(t('profile.avatarPermissionTitle'), t('profile.avatarPermissionMessage'));
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) {
      infoDialog(t('profile.avatarUploadFailed'));
      return;
    }
    const mimeType = asset.mimeType ?? 'image/jpeg';
    if (!ALLOWED_IMAGE_MIME.includes(mimeType)) {
      infoDialog(t('profile.avatarUploadFailed'), t('profile.avatarTypeInvalid'));
      return;
    }
    // Base64 er ~4/3 av bytestørrelsen; på nett komprimeres ikke bildet (quality ignoreres)
    if ((asset.base64.length * 3) / 4 > MAX_IMAGE_BYTES) {
      infoDialog(t('profile.avatarUploadFailed'), t('profile.avatarTooLarge'));
      return;
    }
    Haptics.selectionAsync();
    setPickedImage({ uri: asset.uri, base64: asset.base64, mimeType });
    setRemoveImage(false);
  };

  const clearImage = () => {
    Haptics.selectionAsync();
    setPickedImage(null);
    setRemoveImage(true);
  };

  const save = async () => {
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    if (cleanUsername.length < 3) {
      setUsernameError(t('profile.usernameTooShort'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setUsernameError(undefined);
    setSaveError(undefined);
    setSaving(true);

    // Nytt bilde lastes opp først slik at profilen aldri peker på en død URL
    let avatarUri: string | null | undefined;
    if (pickedImage) {
      try {
        avatarUri = await uploadAvatarImage(user.id, pickedImage.base64, pickedImage.mimeType);
      } catch (error) {
        setSaving(false);
        setSaveError(
          error instanceof Error && error.message
            ? error.message
            : t('profile.avatarUploadFailed'),
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    } else if (removeImage) {
      avatarUri = null;
    }

    const result = await updateProfile({
      displayName: displayName.trim() || cleanUsername,
      username: cleanUsername,
      bio: bio.trim(),
      heightCm: parseMeasure(heightCm),
      weightKg: parseMeasure(weightKg),
      gender: gender ?? null,
      goal,
      avatarColor,
      avatarIcon: avatarIcon ?? null,
      ...(avatarUri !== undefined ? { avatarUri } : {}),
    });
    setSaving(false);
    if (result.error) {
      // F.eks. «Brukernavnet er opptatt.» — vis feilen og hold skjermen åpen
      setSaveError(result.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    // Rydd bort utdaterte bilder i egen mappe (beste forsøk)
    if (avatarUri !== undefined) {
      void removeOtherAvatarImages(user.id, avatarUri ?? undefined);
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
        <ScreenHeader title={t('profile.editProfile')} />

        {/* Avatar */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card style={{ alignItems: 'center', gap: spacing.lg }}>
            <Avatar
              name={displayName || username || '?'}
              color={avatarColor}
              uri={previewUri}
              icon={avatarIcon}
              size={96}
            />

            {/* Eget bilde */}
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button
                title={previewUri ? t('profile.avatarChangePhoto') : t('profile.avatarPickPhoto')}
                icon="image-outline"
                variant="secondary"
                size="sm"
                onPress={pickImage}
              />
              {previewUri ? (
                <Button
                  title={t('profile.avatarRemovePhoto')}
                  icon="close"
                  variant="ghost"
                  size="sm"
                  onPress={clearImage}
                />
              ) : null}
            </View>

            {/* Initialer eller ikon (vises når bilde mangler) */}
            {!previewUri ? (
              <View style={{ gap: spacing.md, alignSelf: 'stretch' }}>
                <AppText variant="caption" color="muted" style={{ textAlign: 'center' }}>
                  {t('profile.avatarIconHint')}
                </AppText>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: spacing.sm,
                  }}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAvatarIcon(undefined);
                    }}
                    style={({ pressed }) => ({
                      width: 40,
                      height: 40,
                      borderRadius: radius.full,
                      backgroundColor: colors.surfaceElevated,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: avatarIcon === undefined ? 2 : 1,
                      borderColor: avatarIcon === undefined ? colors.accent : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <AppText variant="bodyBold" color={avatarIcon === undefined ? 'accent' : 'muted'}>
                      Aa
                    </AppText>
                  </Pressable>
                  {avatarIcons.map((icon) => {
                    const selected = icon === avatarIcon;
                    return (
                      <Pressable
                        key={icon}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setAvatarIcon(icon);
                        }}
                        style={({ pressed }) => ({
                          width: 40,
                          height: 40,
                          borderRadius: radius.full,
                          backgroundColor: colors.surfaceElevated,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? colors.accent : colors.border,
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Ionicons
                          name={icon}
                          size={20}
                          color={selected ? colors.accent : colors.textSecondary}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                <AppText variant="caption" color="muted" style={{ textAlign: 'center' }}>
                  {t('profile.avatarColorHint')}
                </AppText>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: spacing.sm,
                  }}
                >
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
              </View>
            ) : null}
          </Card>
        </Animated.View>

        {/* Felter */}
        <Animated.View entering={FadeInDown.delay(60).duration(300)}>
          <Card style={{ marginTop: spacing.lg, gap: spacing.lg }}>
            <Input
              label={t('profile.displayName')}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('profile.displayNamePlaceholder')}
              autoCapitalize="words"
              maxLength={40}
            />
            <Input
              label={t('profile.username')}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (usernameError) setUsernameError(undefined);
                if (saveError) setSaveError(undefined);
              }}
              placeholder={t('profile.usernamePlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
              error={usernameError}
            />
            <Input
              label={t('profile.bio')}
              value={bio}
              onChangeText={setBio}
              placeholder={t('profile.bioPlaceholder')}
              maxLength={200}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('profile.heightLabel')}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="180"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('profile.weightLabel')}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="80"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Kjønn */}
        <Animated.View entering={FadeInDown.delay(120).duration(300)}>
          <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <AppText variant="label" color="muted">
              {t('profile.genderLabel')}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {GENDER_VALUES.map((value) => (
                <Chip
                  key={value}
                  label={genderLabel(value, lang)}
                  selected={gender === value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    // Trykk på valgt chip fjerner valget — feltet er frivillig
                    setGender(gender === value ? undefined : value);
                  }}
                />
              ))}
            </View>
            <AppText variant="caption" color="muted">
              {t('profile.genderPrivateHint')}
            </AppText>
          </Card>
        </Animated.View>

        {/* Mål */}
        <Animated.View entering={FadeInDown.delay(180).duration(300)}>
          <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <AppText variant="label" color="muted">
              {t('profile.trainingGoal')}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {GOAL_VALUES.map((value) => (
                <Chip
                  key={value}
                  label={goalLabel(value, lang)}
                  selected={goal === value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGoal(value);
                  }}
                />
              ))}
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(300)} style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {saveError ? (
            <AppText variant="body" style={{ color: colors.danger, textAlign: 'center' }}>
              {saveError}
            </AppText>
          ) : null}
          <Button title={t('common.save')} icon="checkmark" size="lg" fullWidth loading={saving} onPress={save} />
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
