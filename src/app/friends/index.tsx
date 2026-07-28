import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import {
  AppText,
  Avatar,
  Button,
  Card,
  Divider,
  EmptyState,
  ListItem,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { acceptFriendRequest, fetchFriendState, removeFriendship } from '@/lib/api/friends';
import { infoDialog } from '@/lib/dialogs';
import { useAuthStore } from '@/lib/store/auth';
import { useTheme } from '@/theme';
import type { UserProfile } from '@/types';

export default function FriendsScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const myId = useAuthStore((s) => s.user?.id);

  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [incoming, setIncoming] = useState<UserProfile[]>([]);
  const [outgoing, setOutgoing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Id-en det pågår en handling for (Godta/Avslå/Trekk tilbake) */
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!myId) return;
    try {
      setError(null);
      const state = await fetchFriendState(myId);
      setFriends(state.friends);
      setIncoming(state.incoming);
      setOutgoing(state.outgoing);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.');
    }
  }, [myId]);

  // Ved fokus, ikke bare ved mount: RefreshControl er en no-op på web, så uten
  // dette blir listen stående gammel etter en tur til /friends/add.
  useFocusEffect(
    useCallback(() => {
      void load().finally(() => setLoading(false));
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const accept = async (profile: UserProfile) => {
    setBusyId(profile.id);
    try {
      await acceptFriendRequest(profile.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIncoming((prev) => prev.filter((p) => p.id !== profile.id));
      setFriends((prev) => [...prev, profile]);
    } catch (e) {
      infoDialog('Kunne ikke godta', e instanceof Error ? e.message : 'Prøv igjen.');
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (profile: UserProfile, kind: 'incoming' | 'outgoing') => {
    if (!myId) return;
    setBusyId(profile.id);
    try {
      await removeFriendship(myId, profile.id);
      if (kind === 'incoming') setIncoming((prev) => prev.filter((p) => p.id !== profile.id));
      else setOutgoing((prev) => prev.filter((p) => p.id !== profile.id));
    } catch (e) {
      infoDialog(
        kind === 'incoming' ? 'Kunne ikke avslå' : 'Kunne ikke trekke tilbake',
        e instanceof Error ? e.message : 'Prøv igjen.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const isEmpty = friends.length === 0 && incoming.length === 0 && outgoing.length === 0;

  const sectionTitle = (title: string) => (
    <AppText variant="label" color="muted" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
      {title}
    </AppText>
  );

  const personRow = (profile: UserProfile, right: ReactNode) => (
    <View
      key={profile.id}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md }}
    >
      <Avatar
        name={profile.displayName || profile.username}
        color={profile.avatarColor}
        uri={profile.avatarUri}
        size={40}
      />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyBold" numberOfLines={1}>
          {profile.displayName || profile.username}
        </AppText>
        <AppText variant="caption" color="muted" numberOfLines={1}>
          @{profile.username}
        </AppText>
      </View>
      {right}
    </View>
  );

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.screen }}>
        <ScreenHeader
          title="Venner"
          right={
            <Pressable
              hitSlop={6}
              onPress={() => router.push('/friends/add')}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: radius.full,
                backgroundColor: colors.surfaceElevated,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="person-add-outline" size={19} color={colors.textPrimary} />
            </Pressable>
          }
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.screen,
            paddingBottom: spacing.xxl,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />
          }
        >
          {error ? (
            <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
              <AppText variant="body" color="danger" style={{ textAlign: 'center' }}>
                {error}
              </AppText>
              <Button title="Prøv igjen" variant="secondary" size="sm" onPress={refresh} />
            </View>
          ) : isEmpty ? (
            <EmptyState
              icon="people-outline"
              title="Legg til venner med brukernavn"
              message="Spør vennen din om brukernavnet deres, og søk dem opp for å sende en venneforespørsel."
              actionTitle="Legg til venn"
              onAction={() => router.push('/friends/add')}
            />
          ) : (
            <>
              {incoming.length > 0 && (
                <>
                  {sectionTitle('Forespørsler')}
                  <Card padded={false}>
                    {incoming.map((profile, index) => (
                      <View key={profile.id}>
                        {index > 0 && <Divider />}
                        {personRow(
                          profile,
                          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                            <Button
                              title="Godta"
                              size="sm"
                              onPress={() => accept(profile)}
                              loading={busyId === profile.id}
                              disabled={busyId !== null && busyId !== profile.id}
                            />
                            <Button
                              title="Avslå"
                              size="sm"
                              variant="secondary"
                              onPress={() => decline(profile, 'incoming')}
                              disabled={busyId !== null}
                            />
                          </View>,
                        )}
                      </View>
                    ))}
                  </Card>
                </>
              )}

              {outgoing.length > 0 && (
                <>
                  {sectionTitle('Sendt')}
                  <Card padded={false}>
                    {outgoing.map((profile, index) => (
                      <View key={profile.id}>
                        {index > 0 && <Divider />}
                        {personRow(
                          profile,
                          <Button
                            title="Trekk tilbake"
                            size="sm"
                            variant="secondary"
                            onPress={() => decline(profile, 'outgoing')}
                            loading={busyId === profile.id}
                            disabled={busyId !== null && busyId !== profile.id}
                          />,
                        )}
                      </View>
                    ))}
                  </Card>
                </>
              )}

              {friends.length > 0 && (
                <>
                  {sectionTitle('Venner')}
                  <Card padded={false}>
                    <View style={{ paddingHorizontal: spacing.sm }}>
                      {friends.map((profile, index) => (
                        <View key={profile.id}>
                          {index > 0 && <Divider />}
                          <ListItem
                            title={profile.displayName || profile.username}
                            subtitle={`@${profile.username}`}
                            left={
                              <Avatar
                                name={profile.displayName || profile.username}
                                color={profile.avatarColor}
                                uri={profile.avatarUri}
                                size={40}
                              />
                            }
                            chevron
                            onPress={() => router.push(`/friends/${profile.id}`)}
                          />
                        </View>
                      ))}
                    </View>
                  </Card>
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
