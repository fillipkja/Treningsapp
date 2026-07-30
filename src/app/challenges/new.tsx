import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
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
import { t as translate, useLanguage, useT, type TranslationKey } from '@/i18n';
import { challengeTypeLabel } from '@/i18n/labels';
import { fetchFriendState } from '@/lib/api/friends';
import { infoDialog } from '@/lib/dialogs';
import { useAuthStore } from '@/lib/store/auth';
import { useChallengeStore } from '@/lib/store/challenges';
import { useProgramStore } from '@/lib/store/programs';
import { challengeTypeColors, useTheme } from '@/theme';
import type { ChallengeType, UserProfile } from '@/types';

const TYPE_OPTIONS: {
  type: ChallengeType;
  icon: keyof typeof Ionicons.glyphMap;
  descKey: TranslationKey;
  placeholderKey: TranslationKey;
  targetLabelKey?: TranslationKey;
  targetExample?: number;
}[] = [
  {
    type: 'økter',
    icon: 'checkmark-done',
    descKey: 'compete.typeDescWorkouts',
    placeholderKey: 'compete.namePlaceholderWorkouts',
    targetLabelKey: 'compete.targetWorkouts',
    targetExample: 5,
  },
  {
    type: 'volum',
    icon: 'barbell',
    descKey: 'compete.typeDescVolume',
    placeholderKey: 'compete.namePlaceholderVolume',
    targetLabelKey: 'compete.targetVolume',
    targetExample: 10000,
  },
  {
    type: 'prs',
    icon: 'star',
    descKey: 'compete.typeDescPrs',
    placeholderKey: 'compete.namePlaceholderPrs',
    targetLabelKey: 'compete.targetPrs',
    targetExample: 3,
  },
  {
    type: 'program',
    icon: 'map',
    descKey: 'compete.typeDescProgram',
    placeholderKey: 'compete.namePlaceholderProgram',
  },
];

const DURATIONS = [7, 14, 30] as const;

export default function NewChallengeScreen() {
  const { colors, spacing, radius, isDark } = useTheme();
  const mode = isDark ? 'dark' : 'light';
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();

  const me = useAuthStore((s) => s.user);
  const programs = useProgramStore((s) => s.programs);
  const createChallenge = useChallengeStore((s) => s.createChallenge);

  const [name, setName] = useState('');
  const [type, setType] = useState<ChallengeType>('økter');
  const [targetText, setTargetText] = useState('');
  const [programId, setProgramId] = useState<string | undefined>(undefined);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [creating, setCreating] = useState(false);

  // Venner til deltakervalget (null = laster)
  const [friends, setFriends] = useState<UserProfile[] | null>(null);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [friendsAttempt, setFriendsAttempt] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const myId = me?.id;
  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    fetchFriendState(myId)
      .then((state) => {
        if (!cancelled) setFriends(state.friends);
      })
      .catch((error) => {
        if (!cancelled)
          setFriendsError(error instanceof Error ? error.message : translate('error.generic'));
      });
    return () => {
      cancelled = true;
    };
  }, [myId, friendsAttempt]);

  const toggleFriend = (id: string) => {
    void Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeOption = TYPE_OPTIONS.find((o) => o.type === type) ?? TYPE_OPTIONS[0];
  const selectedProgram = programs.find((p) => p.id === programId);
  const parsedTarget = Number.parseInt(targetText, 10);

  const canStart =
    !!me &&
    name.trim().length > 0 &&
    (type === 'program' ? !!selectedProgram : Number.isFinite(parsedTarget) && parsedTarget > 0);

  const start = async () => {
    if (!me || !canStart || creating) return;
    setCreating(true);
    try {
      const challenge = await createChallenge({
        name: name.trim(),
        type,
        // For programutfordringer settes målet automatisk til antall dager i programmet
        target: type === 'program' ? selectedProgram?.days.length : parsedTarget,
        durationDays,
        programId: type === 'program' ? programId : undefined,
        participantIds: [...selectedIds],
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/challenges/${challenge.id}`);
    } catch (error) {
      setCreating(false);
      infoDialog(
        t('compete.createError'),
        error instanceof Error ? error.message : t('error.generic'),
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <ScreenHeader title={t('compete.newChallenge')} />

        <Animated.View entering={FadeInDown.duration(300)} style={{ gap: spacing.xl }}>
          {/* Type */}
          <View style={{ gap: spacing.md }}>
            <AppText variant="label" color="muted">
              {t('compete.typeSection')}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {TYPE_OPTIONS.map((option) => {
                const active = option.type === type;
                const tint = challengeTypeColors[mode][option.type];
                return (
                  <View key={option.type} style={{ flexBasis: '46%', flexGrow: 1 }}>
                    <Card
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setType(option.type);
                      }}
                      style={{
                        borderWidth: 1.5,
                        borderColor: active ? tint : colors.border,
                        backgroundColor: active ? `${tint}29` : colors.surface,
                        minHeight: 132,
                      }}
                    >
                      <View style={{ gap: spacing.sm }}>
                        <Ionicons
                          name={option.icon}
                          size={22}
                          color={active ? tint : colors.textSecondary}
                        />
                        <AppText variant="bodyBold">
                          {challengeTypeLabel(option.type, lang)}
                        </AppText>
                        <AppText variant="caption" color="muted">
                          {t(option.descKey)}
                        </AppText>
                      </View>
                    </Card>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Navn */}
          <View style={{ gap: spacing.md }}>
            <AppText variant="label" color="muted">
              {t('compete.nameSection')}
            </AppText>
            <Input
              value={name}
              onChangeText={setName}
              placeholder={t(activeOption.placeholderKey)}
              returnKeyType="done"
              maxLength={40}
            />
          </View>

          {/* Målverdi (ikke for program — der settes målet av programmet) */}
          {type !== 'program' ? (
            <View style={{ gap: spacing.md }}>
              <AppText variant="label" color="muted">
                {activeOption.targetLabelKey ? t(activeOption.targetLabelKey) : ''}
              </AppText>
              <Input
                value={targetText}
                onChangeText={(text) => setTargetText(text.replace(/[^0-9]/g, ''))}
                placeholder={
                  activeOption.targetExample !== undefined
                    ? t('compete.egNumber', { n: activeOption.targetExample })
                    : undefined
                }
                keyboardType="number-pad"
                returnKeyType="done"
                maxLength={7}
              />
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              <AppText variant="label" color="muted">
                {t('compete.pickProgram')}
              </AppText>
              {programs.length === 0 ? (
                <AppText variant="caption" color="muted">
                  {t('compete.noPrograms')}
                </AppText>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {programs.map((p) => (
                    <Chip
                      key={p.id}
                      label={t('compete.programDays', { name: p.name, count: p.days.length })}
                      selected={programId === p.id}
                      onPress={() => setProgramId(p.id)}
                    />
                  ))}
                </View>
              )}
              {selectedProgram ? (
                <AppText variant="caption" color="muted">
                  {t('compete.programGoal', { count: selectedProgram.days.length })}
                </AppText>
              ) : null}
            </View>
          )}

          {/* Varighet */}
          <View style={{ gap: spacing.md }}>
            <AppText variant="label" color="muted">
              {t('compete.duration')}
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {DURATIONS.map((d) => (
                <Chip
                  key={d}
                  label={t('compete.durationDays', { count: d })}
                  selected={durationDays === d}
                  onPress={() => setDurationDays(d)}
                />
              ))}
            </View>
          </View>

          {/* Deltakere */}
          <View style={{ gap: spacing.md }}>
            <AppText variant="label" color="muted">
              {t('compete.inviteFriends')}
            </AppText>
            {friendsError ? (
              <View style={{ gap: spacing.sm }}>
                <AppText variant="caption" color="danger">
                  {friendsError}
                </AppText>
                <Button
                  title={t('common.retry')}
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    setFriendsError(null);
                    setFriends(null);
                    setFriendsAttempt((n) => n + 1);
                  }}
                />
              </View>
            ) : friends === null ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : friends.length === 0 ? (
              <View style={{ gap: spacing.sm }}>
                <AppText variant="caption" color="muted">
                  {t('compete.noFriendsYet')}
                </AppText>
                <Button
                  title={t('compete.addFriends')}
                  icon="person-add-outline"
                  size="sm"
                  variant="secondary"
                  onPress={() => router.push('/friends/add')}
                />
              </View>
            ) : (
              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                  {friends.map((friend) => {
                    const selected = selectedIds.has(friend.id);
                    return (
                      <Pressable
                        key={friend.id}
                        onPress={() => toggleFriend(friend.id)}
                        style={({ pressed }) => ({
                          width: 72,
                          alignItems: 'center',
                          gap: spacing.xs,
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <View
                          style={{
                            padding: 3,
                            borderRadius: radius.full,
                            borderWidth: 2,
                            borderColor: selected ? colors.accent : 'transparent',
                          }}
                        >
                          <Avatar
                            name={friend.displayName}
                            color={friend.avatarColor}
                            uri={friend.avatarUri}
                            icon={friend.avatarIcon}
                            size={52}
                          />
                          {selected ? (
                            <View
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: 22,
                                height: 22,
                                borderRadius: radius.full,
                                backgroundColor: colors.accent,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 2,
                                borderColor: colors.background,
                              }}
                            >
                              <Ionicons name="checkmark" size={12} color={colors.onAccent} />
                            </View>
                          ) : null}
                        </View>
                        <AppText
                          variant="caption"
                          numberOfLines={1}
                          style={{ maxWidth: 72, textAlign: 'center' }}
                        >
                          {friend.displayName}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
                <AppText variant="caption" color="muted">
                  {selectedIds.size === 0
                    ? t('compete.soloSelected')
                    : selectedIds.size === 1
                      ? t('compete.oneFriendChallenged')
                      : t('compete.friendsChallenged', { count: selectedIds.size })}
                </AppText>
              </View>
            )}
          </View>

          <Button
            title={t('common.start')}
            icon="flash"
            size="lg"
            fullWidth
            disabled={!canStart}
            loading={creating}
            onPress={() => void start()}
          />
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
