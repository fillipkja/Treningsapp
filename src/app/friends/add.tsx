import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { AppText, Avatar, Button, Card, EmptyState, Input, Screen, ScreenHeader } from '@/components/ui';
import { fetchFriendState, sendFriendRequest } from '@/lib/api/friends';
import { searchByUsername } from '@/lib/api/profiles';
import { infoDialog } from '@/lib/dialogs';
import { useAuthStore } from '@/lib/store/auth';
import { useTheme } from '@/theme';
import type { UserProfile } from '@/types';

type Relation = 'self' | 'friend' | 'incoming' | 'outgoing' | 'none';

export default function AddFriendScreen() {
  const { spacing } = useTheme();
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
      setError(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.');
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
        'Kunne ikke sende forespørselen',
        e instanceof Error ? e.message : 'Prøv igjen.',
      );
    } finally {
      setSending(false);
    }
  };

  const statusText = (relation: Relation): string | null => {
    switch (relation) {
      case 'self':
        return 'Dette er deg 👋';
      case 'outgoing':
        return 'Forespørsel sendt ✓';
      case 'friend':
        return 'Dere er allerede venner ✓';
      case 'incoming':
        return 'Har allerede sendt deg en forespørsel — godta den i vennelisten';
      default:
        return null;
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Legg til venn" />

      {/* Søkefelt */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input
            placeholder="@brukernavn"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={search}
          />
        </View>
        <Button
          title="Søk"
          icon="search"
          onPress={search}
          loading={searching}
          disabled={query.trim().replace(/^@+/, '').length === 0}
        />
      </View>

      <AppText variant="caption" color="muted" style={{ marginTop: spacing.sm }}>
        Brukernavn deles muntlig — spør vennen din om brukernavnet deres.
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
          title="Fant ingen med brukernavnet"
          message="Sjekk stavingen og prøv igjen."
        />
      ) : null}

      {/* Treff */}
      {result ? (
        <Card style={{ marginTop: spacing.lg, alignItems: 'center', gap: spacing.md }}>
          <Avatar
            name={result.displayName || result.username}
            color={result.avatarColor}
            uri={result.avatarUri}
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
              title="Send venneforespørsel"
              icon="person-add-outline"
              onPress={() => send(result)}
              loading={sending}
              fullWidth
            />
          ) : (
            <AppText
              variant="bodyBold"
              color={
                relationFor(result) === 'outgoing' || relationFor(result) === 'friend'
                  ? 'success'
                  : 'secondary'
              }
              style={{ textAlign: 'center', paddingVertical: spacing.xs }}
            >
              {statusText(relationFor(result))}
            </AppText>
          )}
        </Card>
      ) : null}
    </Screen>
  );
}
