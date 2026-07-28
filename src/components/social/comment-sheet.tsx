import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { AppText, Avatar, Button, Input, Sheet } from '@/components/ui';
import { addComment, fetchCommentsWithAuthors } from '@/lib/api/workouts';
import { infoDialog } from '@/lib/dialogs';
import { formatTimeAgo } from '@/lib/format';
import { useAuthStore } from '@/lib/store/auth';
import { useTheme } from '@/theme';
import type { UserProfile, WorkoutComment } from '@/types';

interface CommentSheetProps {
  visible: boolean;
  onClose: () => void;
  workoutId: string;
  onCommentAdded?: (comment: WorkoutComment) => void;
}

interface CommentItem {
  comment: WorkoutComment;
  author: UserProfile | null;
}

/**
 * Selvstendig kommentar-ark: laster kommentarer fra serveren når det åpnes,
 * og legger nye kommentarer optimistisk til i listen.
 */
export function CommentSheet({ visible, onClose, workoutId, onCommentAdded }: CommentSheetProps) {
  const { colors, spacing, radius } = useTheme();
  const me = useAuthStore((s) => s.user);

  const [items, setItems] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  /** Økes av «Prøv igjen» for å trigge en ny henting */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible || !workoutId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCommentsWithAuthors(workoutId)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, workoutId, attempt]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const comment = await addComment(workoutId, trimmed);
      // Optimistisk append med meg selv som forfatter
      setItems((prev) => [...prev, { comment, author: me }]);
      setText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCommentAdded?.(comment);
    } catch (e) {
      infoDialog(
        'Kunne ikke sende kommentaren',
        e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.',
      );
    } finally {
      setSending(false);
    }
  };

  const canSend = text.trim().length > 0 && !sending;

  return (
    <Sheet visible={visible} onClose={onClose} title="Kommentarer">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : error ? (
          <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg }}>
            <AppText variant="body" color="danger" style={{ textAlign: 'center' }}>
              {error}
            </AppText>
            <Button
              title="Prøv igjen"
              variant="secondary"
              size="sm"
              onPress={() => setAttempt((n) => n + 1)}
            />
          </View>
        ) : items.length === 0 ? (
          <AppText
            variant="body"
            color="muted"
            style={{ textAlign: 'center', paddingVertical: spacing.lg }}
          >
            Ingen kommentarer ennå — bli den første!
          </AppText>
        ) : (
          <ScrollView
            style={{ maxHeight: 380 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xs }}
          >
            {items.map(({ comment, author }) => (
              <View key={comment.id} style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Avatar
                  name={author?.displayName ?? '?'}
                  color={author?.avatarColor ?? colors.accent}
                  uri={author?.avatarUri}
                  size={32}
                />
                <View style={{ flex: 1 }}>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}
                  >
                    <AppText variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {author?.displayName ?? 'Ukjent'}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {formatTimeAgo(comment.createdAt)}
                    </AppText>
                  </View>
                  <AppText variant="body" color="secondary" style={{ marginTop: 1 }}>
                    {comment.text}
                  </AppText>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Skrivefelt + send */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing.sm,
            marginTop: spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Input
              placeholder="Skriv en kommentar …"
              value={text}
              onChangeText={setText}
              maxLength={500}
              multiline
              style={{ maxHeight: 100 }}
            />
          </View>
          <Pressable
            onPress={send}
            disabled={!canSend}
            style={({ pressed }) => ({
              width: 46,
              height: 46,
              borderRadius: radius.full,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !canSend ? 0.5 : pressed ? 0.8 : 1,
            })}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : (
              <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}
