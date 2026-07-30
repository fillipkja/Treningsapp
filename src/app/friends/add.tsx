import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { AppText, Avatar, Button, Card, EmptyState, Input, Screen, ScreenHeader } from '@/components/ui';
import { useT } from '@/i18n';
import { fetchFriendState, sendFriendRequest } from '@/lib/api/friends';
import { searchByUsername } from '@/lib/api/profiles';
import { infoDialog } from '@/lib/dialogs';
import { useAuthStore } from '@/lib/store/auth';
import { useTheme } from '@/theme';
import type { UserProfile } from '@/types';

type Relation = 'self' | 'friend' | 'incoming' | 'outgoing' | 'none';

export default function AddFriendScreen() {
  const t = useT();
  const { colors, spacing } = useTheme();
  const myId = useAuthStore((s) => s.user?.id);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  /** Om et søk er fullført (for å skille «ikke søkt» fra «ingen treff») */
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [incomingIds, setIncomingIds] = useState<Set<string>>(new Set());
  const [outgoingIds, setOutgoingIds] = useState<Set<string>>(new Set());

  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Hent eksisterende relasjoner for å vise kontekstriktig knapp/status
  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    fetchFriendState(myId)
      .then((state) => {
        if (cancelled) return;
        setFriendIds(new Set(state.friends.map((p) => p.id)));
        setIncomingIds(new Set(state.incoming.map((p) => p.id)));
        setOutgoingIds(new Set(state.outgoing.map((p) => p.id)));
      })
      .catch(() => {
        // Ikke-blokkerende: søk og sending fungerer fortsatt (serveren avviser duplikater)
      });
    return () => {
      cancelled = true;
    };
  }, [myId]);

  const search = async () => {
    const q = query.trim().replace(/^@+/, '');
    if (!q || searching) return;
    Keyboard.dismiss();
    setSearching(true);
    setError(null);
    setResult(null);
    setSearched(false);
    try {
      const profile = await searchByUsername(q);
      setResult(profile);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error.generic'));
    } finally {
      setSearching(false);
    }
  };

  const relationFor = (profile: UserProfile): Relation => {
    if (profile.id === myId) return 'self';
    if (sentTo === profile.id || outgoingIds.has(profile.id)) return 'outgoing';
    if (friendIds.has(profile.id)) return 'friend';
    if (incomingIds.has(profile.id)) return 'incoming';
    return 'none';
  };

  const send = async (profile: UserProfile) => {
    if (!myId || sending) return;
    setSending(true);
    try {
      await sendFriendRequest(myId, profile.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSentTo(profile.id);
    } catch (e) {
      infoDialog(
        t('profile.friendsSendFailed'),
        e instanceof Error ? e.message : t('error.generic'),
      );
    } finally {
      setSending(false);
    }
  };

  const statusText = (relation: Relation): string | null => {
    switch (relation) {
      case 'self':
        return t('profile.friendsStatusSelf');
      case 'outgoing':
        return t('profile.friendsStatusSent');
      case 'friend':
        return t('profile.friendsStatusAlready');
      case 'incoming':
        return t('profile.friendsStatusIncoming');
      default:
        return null;
    }
  };

  const renderStatus = (relation: Relation) => {
    const positive = relation === 'outgoing' || relation === 'friend';
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.xs,
        }}
      >
        {positive ? (
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        ) : null}
        <AppText
          variant="bodyBold"
          color={positive ? 'success' : 'secondary'}
          style={{ textAlign: 'center', flexShrink: 1 }}
        >
          {statusText(relation)}
        </AppText>
      </View>
    );
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('profile.friendsAdd')} />

      {/* Søkefelt */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input
            placeholder={t('profile.friendsSearchPlaceholder')}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={search}
          />
        </View>
        <Button
          title={t('common.search')}
          icon="search"
          onPress={search}
          loading={searching}
          disabled={query.trim().replace(/^@+/, '').length === 0}
        />
      </View>

      <AppText variant="caption" color="muted" style={{ marginTop: spacing.sm }}>
        {t('profile.friendsSearchHint')}
      </AppText>

      {/* Feil ved søk */}
      {error ? (
        <AppText variant="body" color="danger" style={{ marginTop: spacing.lg, textAlign: 'center' }}>
          {error}
        </AppText>
      ) : null}

      {/* Ingen treff */}
      {searched && !result ? (
        <EmptyState
          icon="search-outline"
          title={t('profile.friendsNoMatchTitle')}
          message={t('profile.friendsNoMatchMessage')}
        />
      ) : null}

      {/* Treff */}
      {result ? (
        <Card style={{ marginTop: spacing.lg, alignItems: 'center', gap: spacing.md }}>
          <Avatar
            name={result.displayName || result.username}
            color={result.avatarColor}
            uri={result.avatarUri}
            icon={result.avatarIcon}
            size={72}
          />
          <View style={{ alignItems: 'center', gap: 2 }}>
            <AppText variant="subheading" numberOfLines={1}>
              {result.displayName || result.username}
            </AppText>
            <AppText variant="caption" color="muted">
              @{result.username}
            </AppText>
          </View>
          {result.bio ? (
            <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
              {result.bio}
            </AppText>
          ) : null}

          {relationFor(result) === 'none' ? (
            <Button
              title={t('profile.friendsSendRequest')}
              icon="person-add-outline"
              onPress={() => send(result)}
              loading={sending}
              fullWidth
            />
          ) : (
            renderStatus(relationFor(result))
          )}
        </Card>
      ) : null}
    </Screen>
  );
}
