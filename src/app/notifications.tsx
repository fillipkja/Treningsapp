import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';
import { AppText, Button, Divider, EmptyState, Screen, ScreenHeader } from '@/components/ui';
import { useT, type TranslationKey } from '@/i18n';
import type { NotificationWithActor } from '@/lib/api/notifications';
import { infoDialog } from '@/lib/dialogs';
import { formatTimeAgo } from '@/lib/format';
import { useNotificationStore } from '@/lib/store/notifications';
import { useTheme } from '@/theme';

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

// Typefarge = varselets identitet: hjerte i danger, kommentar i accent,
// rekord og merker i gull, venner i success. Utfordring bruker accent
// (flag-ikonet skiller den) — accentWarm er reservert volum/streak.
type TypeColorKey = 'danger' | 'accent' | 'gold' | 'success';
const TYPE_COLOR_KEYS: Record<string, TypeColorKey | undefined> = {
  like: 'danger',
  kommentar: 'accent',
  venn_pr: 'gold',
  badge: 'gold',
  venneforespørsel: 'success',
  venn_akseptert: 'success',
  utfordring: 'accent',
};

// Kjente typer komponeres lokalisert klientside fra type + aktør.
const TYPE_TEXT_KEYS: Record<string, TranslationKey | undefined> = {
  like: 'notifications.like',
  kommentar: 'notifications.comment',
  venn_pr: 'notifications.friendPr',
  venneforespørsel: 'notifications.friendRequest',
  venn_akseptert: 'notifications.friendAccepted',
  utfordring: 'notifications.challenge',
};

// Gamle varsler har title/body med emojier fra serveren — strippes ved visning.
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{FE0F}]/gu;
function stripEmoji(text: string): string {
  return text.replace(EMOJI_RE, '').replace(/ {2,}/g, ' ').trim();
}

export default function NotificationsScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const t = useT();

  const notifications = useNotificationStore((s) => s.notifications) as NotificationWithActor[];
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
    const out: { title: string; data: NotificationWithActor[] }[] = [];
    if (fresh.length > 0) out.push({ title: t('notifications.sectionNew'), data: fresh });
    if (earlier.length > 0) out.push({ title: t('notifications.sectionEarlier'), data: earlier });
    return out;
  }, [notifications, t]);

  const hasUnread = notifications.some((n) => !n.read);

  const onMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllRead();
    } catch (error) {
      infoDialog(
        t('notifications.updateFailedTitle'),
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const openNotification = (n: NotificationWithActor) => {
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

  /**
   * Kjent type + aktør -> lokalisert tekst komponert klientside. For
   * kommentarer inneholder DB-body selve kommentaren — vis den som undertekst.
   * Ukjent type eller manglende aktør -> lagret title/body (gamle varsler).
   */
  const notificationText = (n: NotificationWithActor): { title: string; subtitle?: string } => {
    const key = TYPE_TEXT_KEYS[n.type];
    if (key && n.actor) {
      return {
        title: t(key, { name: n.actor.displayName }),
        subtitle: n.type === 'kommentar' && n.body ? stripEmoji(n.body) : undefined,
      };
    }
    const body = stripEmoji(n.body);
    return { title: stripEmoji(n.title), subtitle: body.length > 0 ? body : undefined };
  };

  const initialLoading = loading && !loaded;

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.screen }}>
        <ScreenHeader
          title={t('notifications.title')}
          right={
            hasUnread ? (
              <Button
                title={t('notifications.markAllRead')}
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
            {t('notifications.loading')}
          </AppText>
        </View>
      ) : loadError && notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.screen }}>
          <AppText variant="body" style={{ color: colors.danger, textAlign: 'center' }}>
            {loadError}
          </AppText>
          <Button title={t('common.retry')} variant="secondary" icon="refresh" onPress={retryLoad} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title={t('notifications.emptyTitle')}
          message={t('notifications.emptyMessage')}
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
          renderItem={({ item }) => {
            const tint = colors[TYPE_COLOR_KEYS[item.type] ?? 'accent'];
            const { title, subtitle } = notificationText(item);
            return (
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
                    backgroundColor: `${tint}29`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={TYPE_ICONS[item.type] ?? FALLBACK_ICON} size={19} color={tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyBold" numberOfLines={2}>
                    {title}
                  </AppText>
                  {subtitle ? (
                    <AppText variant="body" color="secondary" numberOfLines={2} style={{ marginTop: 1 }}>
                      {subtitle}
                    </AppText>
                  ) : null}
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
            );
          }}
        />
      )}
    </Screen>
  );
}
