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
import { fetchFriendState } from '@/lib/api/friends';
import { infoDialog } from '@/lib/dialogs';
import { useAuthStore } from '@/lib/store/auth';
import { useChallengeStore } from '@/lib/store/challenges';
import { useProgramStore } from '@/lib/store/programs';
import { useTheme } from '@/theme';
import type { ChallengeType, UserProfile } from '@/types';

const TYPE_OPTIONS: {
  type: ChallengeType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  targetLabel?: string;
  targetPlaceholder?: string;
}[] = [
  {
    type: 'økter',
    label: 'Flest mulig økter',
    description: 'Fullfør et antall økter innen fristen',
    icon: 'calendar',
    placeholder: 'F.eks. «5 økter denne uka»',
    targetLabel: 'Antall økter',
    targetPlaceholder: 'F.eks. 5',
  },
  {
    type: 'volum',
    label: 'Løft mest mulig',
    description: 'Nå et totalt løftet volum i kilo',
    icon: 'barbell',
    placeholder: 'F.eks. «10 tonn på to uker»',
    targetLabel: 'Volum i kg',
    targetPlaceholder: 'F.eks. 10000',
  },
  {
    type: 'prs',
    label: 'Sett flest rekorder',
    description: 'Sett et antall nye personlige rekorder',
    icon: 'trophy',
    placeholder: 'F.eks. «Rekordjakten»',
    targetLabel: 'Antall rekorder',
    targetPlaceholder: 'F.eks. 3',
  },
  {
    type: 'program',
    label: 'Fullfør et program',
    description: 'Kom deg gjennom alle dagene i et program',
    icon: 'flag',
    placeholder: 'F.eks. «Først i mål med PPL»',
  },
];

const DURATIONS = [7, 14, 30] as const;

export default function NewChallengeScreen() {
  const { colors, spacing, radius } = useTheme();
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
          setFriendsError(error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.');
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
        'Kunne ikke starte utfordringen',
        error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.',
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <ScreenHeader title="Ny utfordring" />

        <Animated.View entering={FadeInDown.duration(300)} style={{ gap: spacing.xl }}>
          {/* Type */}
          <View style={{ gap: spacing.md }}>
            <AppText variant="label" color="muted">
              Type utfordring
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {TYPE_OPTIONS.map((option) => {
                const active = option.type === type;
                return (
                  <View key={option.type} style={{ flexBasis: '46%', flexGrow: 1 }}>
                    <Card
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setType(option.type);
                      }}
                      style={{
                        borderWidth: 1.5,
                        borderColor: active ? colors.accent : colors.border,
                        backgroundColor: active ? colors.accentMuted : colors.surface,
                        minHeight: 132,
                      }}
                    >
                      <View style={{ gap: spacing.sm }}>
                        <Ionicons
                          name={option.icon}
                          size={22}
                          color={active ? colors.accent : colors.textSecondary}
                        />
                        <AppText variant="bodyBold">{option.label}</AppText>
                        <AppText variant="caption" color="muted">
                          {option.description}
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
              Navn
            </AppText>
            <Input
              value={name}
              onChangeText={setName}
              placeholder={activeOption.placeholder}
              returnKeyType="done"
              maxLength={40}
            />
          </View>

          {/* Målverdi (ikke for program — der settes målet av programmet) */}
          {type !== 'program' ? (
            <View style={{ gap: spacing.md }}>
              <AppText variant="label" color="muted">
                {activeOption.targetLabel}
              </AppText>
              <Input
                value={targetText}
                onChangeText={(t) => setTargetText(t.replace(/[^0-9]/g, ''))}
                placeholder={activeOption.targetPlaceholder}
                keyboardType="number-pad"
                returnKeyType="done"
                maxLength={7}
              />
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              <AppText variant="label" color="muted">
                Velg program
              </AppText>
              {programs.length === 0 ? (
                <AppText variant="caption" color="muted">
                  Du har ingen programmer ennå. Lag et under Trening først.
                </AppText>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {programs.map((p) => (
                    <Chip
                      key={p.id}
                      label={`${p.name} (${p.days.length} dager)`}
                      selected={programId === p.id}
                      onPress={() => setProgramId(p.id)}
                    />
                  ))}
                </View>
              )}
              {selectedProgram ? (
                <AppText variant="caption" color="muted">
                  {`Mål: fullfør alle ${selectedProgram.days.length} dagene i programmet.`}
                </AppText>
              ) : null}
            </View>
          )}

          {/* Varighet */}
          <View style={{ gap: spacing.md }}>
            <AppText variant="label" color="muted">
              Varighet
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {DURATIONS.map((d) => (
                <Chip
                  key={d}
                  label={`${d} dager`}
                  selected={durationDays === d}
                  onPress={() => setDurationDays(d)}
                />
              ))}
            </View>
          </View>

          {/* Deltakere */}
          <View style={{ gap: spacing.md }}>
            <AppText variant="label" color="muted">
              Utfordre venner (valgfritt)
            </AppText>
            {friendsError ? (
              <View style={{ gap: spacing.sm }}>
                <AppText variant="caption" color="danger">
                  {friendsError}
                </AppText>
                <Button
                  title="Prøv igjen"
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
                  Du har ingen venner ennå — du kan fint kjøre solo.
                </AppText>
                <Button
                  title="Legg til venner"
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
                    ? 'Ingen valgt — du kjører solo.'
                    : selectedIds.size === 1
                      ? '1 venn blir utfordret.'
                      : `${selectedIds.size} venner blir utfordret.`}
                </AppText>
              </View>
            )}
          </View>

          <Button
            title="Start"
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
