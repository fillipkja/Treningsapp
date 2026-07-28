import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './app-text';

interface ScreenHeaderProps {
  title: string;
  /** Skjul tilbakeknappen (for tab-skjermer) */
  hideBack?: boolean;
  right?: ReactNode;
  onBack?: () => void;
}

/** Standard skjermtopp med tilbakeknapp — brukes fordi native header er skrudd av */
export function ScreenHeader({ title, hideBack, right, onBack }: ScreenHeaderProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {!hideBack && (
          <Pressable
            hitSlop={8}
            onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')))}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: theme.colors.surfaceElevated, opacity: pressed ? 0.7 : 1 },
            ]}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
          </Pressable>
        )}
      </View>
      <AppText variant="heading" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  side: { minWidth: 40 },
  right: { alignItems: 'flex-end', flexShrink: 0, minWidth: 40 },
  title: { flex: 1, textAlign: 'center' },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
