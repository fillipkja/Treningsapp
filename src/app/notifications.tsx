import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { AppText, Button, Divider, EmptyState, Screen, ScreenHeader } from '@/components/ui';
import { formatTimeAgo } from '@/lib/format';
import { useNotificationStore } from '@/lib/store/notifications';
import { useTheme } from '@/theme';
import type { AppNotification } from '@/types';

// Kun 'badge', 'utfordring' og 'påminnelse' opprettes nå, men gamle lagrede
// varsler kan ha andre typer — rendring må tåle dem uten å kræsje.
const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  utfordring: 'flag',
  badge: 'ribbon',
  påminnelse: 'alarm',
  // Historiske typer — kan fortsatt ligge lagret hos brukeren
  venn_pr: 'trophy',
  venn_økt: 'barbell',
  like: 'heart',
  kommentar: 'chatbubble',
  venneforespørsel: 'person-add',
};

const FALLBACK_ICON: keyof typeof Ionicons.glyphMap = 'notifications-outline';

export default function NotificationsScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const notifications = useNotificationStore((s) => s.notifications);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const markRead = useNotificationStore((s) => s.markRead);

  const sections = useMemo(() => {
    const fresh = notifications.filter((n) => !n.read);
    const earlier = notifications.filter((n) => n.read);
    const out: { title: string; data: AppNotification[] }[] = [];
    if (fresh.length > 0) out.push({ title: 'Nye', data: fresh });
    if (earlier.length > 0) out.push({ title: 'Tidligere', data: earlier });
    return out;
  }, [notifications]);

  const hasUnread = notifications.some((n) => !n.read);

  const openNotification = (n: AppNotification) => {
    Haptics.selectionAsync();
    markRead(n.id);
    switch (n.type) {
      case 'utfordring':
        if (n.refId) router.push(`/challenges/${n.refId}`);
        break;
      case 'badge':
        router.push('/badges');
        break;
      case 'påminnelse':
        router.push('/(tabs)/trening');
        break;
      default:
        // Historiske varseltyper: ingen navigasjon, kun markert som lest
        break;
    }
  };

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.screen }}>
        <ScreenHeader
          title="Varsler"
          right={
            hasUnread ? (
              <Button title="Merk alt lest" variant="ghost" size="sm" onPress={markAllRead} />
            ) : undefined
          }
        />
      </View>

      {notifications.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title="Ingen varsler"
          message="Utfordringer, merker og påminnelser dukker opp her."
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
