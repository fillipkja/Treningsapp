import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';
import { AppText, Button, Divider, EmptyState, Screen, ScreenHeader } from '@/components/ui';
import { infoDialog } from '@/lib/dialogs';
import { formatTimeAgo } from '@/lib/format';
import { useNotificationStore } from '@/lib/store/notifications';
import { useTheme } from '@/theme';
import type { AppNotification } from '@/types';

// Varsler opprettes av triggere på serveren. Databasen kan inneholde typer
// som ikke finnes i domenetypen (f.eks. 'venn_akseptert') — rendring og
// navigasjon må tåle ukjente typer uten å kræsje.
const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  utfordring: 'flag',
  badge: 'ribbon',
  påminnelse: 'alarm',
  venn_pr: 'trophy',
  venn_økt: 'barbell',
  like: 'heart',
  kommentar: 'chatbubble',
  venneforespørsel: 'person-add',
  venn_akseptert: 'person-add',
};

const FALLBACK_ICON: keyof typeof Ionicons.glyphMap = 'notifications-outline';

export default function NotificationsScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const notifications = useNotificationStore((s) => s.notifications);
  const loaded = useNotificationStore((s) => s.loaded);
  const loading = useNotificationStore((s) => s.loading);
  const load = useNotificationStore((s) => s.load);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const markRead = useNotificationStore((s) => s.markRead);

  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    load().catch((error: Error) => setLoadError(error.message));
    // Kun ved åpning av skjermen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryLoad = () => {
    setLoadError(undefined);
    load().catch((error: Error) => setLoadError(error.message));
  };

  const sections = useMemo(() => {
    const fresh = notifications.filter((n) => !n.read);
    const earlier = notifications.filter((n) => n.read);
    const out: { title: string; data: AppNotification[] }[] = [];
    if (fresh.length > 0) out.push({ title: 'Nye', data: fresh });
    if (earlier.length > 0) out.push({ title: 'Tidligere', data: earlier });
    return out;
  }, [notifications]);

  const hasUnread = notifications.some((n) => !n.read);

  const onMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllRead();
    } catch (error) {
      infoDialog('Kunne ikke oppdatere', error instanceof Error ? error.message : undefined);
    } finally {
      setMarkingAll(false);
    }
  };

  const openNotification = (n: AppNotification) => {
    Haptics.selectionAsync();
    // Optimistisk i store — feiler kallet, reverteres lesestatusen stille
    markRead(n.id).catch(() => undefined);
    switch (n.type as string) {
      case 'venneforespørsel':
      case 'venn_akseptert':
        router.push('/friends');
        break;
      case 'venn_pr':
      case 'like':
      case 'kommentar':
        if (n.refId) router.push(`/workout/${n.refId}`);
        break;
      case 'utfordring':
        if (n.refId) router.push(`/challenges/${n.refId}`);
        break;
      case 'badge':
        router.push('/badges');
        break;
      default:
        // Ukjent type: kun markert som lest
        break;
    }
  };

  const initialLoading = loading && !loaded;

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.screen }}>
        <ScreenHeader
          title="Varsler"
          right={
            hasUnread ? (
              <Button
                title="Merk alt lest"
                variant="ghost"
                size="sm"
                loading={markingAll}
                onPress={onMarkAllRead}
              />
            ) : undefined
          }
        />
      </View>

      {initialLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <AppText variant="body" color="muted">
            Henter varsler …
          </AppText>
        </View>
      ) : loadError && notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.screen }}>
          <AppText variant="body" style={{ color: colors.danger, textAlign: 'center' }}>
            {loadError}
          </AppText>
          <Button title="Prøv igjen" variant="secondary" icon="refresh" onPress={retryLoad} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title="Ingen varsler"
          message="Likes, kommentarer, venneforespørsler og utfordringer dukker opp her."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(n) => n.id}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.screen,
            paddingBottom: spacing.xxl,
          }}
          renderSectionHeader={({ section }) => (
            <AppText
              variant="label"
              color="muted"
              style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}
            >
              {section.title}
            </AppText>
          )}
          ItemSeparatorComponent={Divider}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openNotification(item)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.md,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: radius.full,
                  backgroundColor: colors.accentMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={TYPE_ICONS[item.type] ?? FALLBACK_ICON} size={19} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold" numberOfLines={1}>
                  {item.title}
                </AppText>
                <AppText variant="body" color="secondary" numberOfLines={2} style={{ marginTop: 1 }}>
                  {item.body}
                </AppText>
                <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
                  {formatTimeAgo(item.createdAt)}
                </AppText>
              </View>
              {!item.read && (
                <View
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: radius.full,
                    backgroundColor: colors.accent,
                  }}
                />
              )}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
