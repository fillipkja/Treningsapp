import type { ReactNode, RefObject } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edges } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /**
   * Kanter SafeAreaView skal polstre. Sett til [] på skjermer som vises som
   * fullScreenModal og håndterer toppinnrykket selv via useSafeAreaInsets —
   * native SafeAreaView måler feil (0) inne i modaler.
   */
  edges?: Edges;
  style?: StyleProp<ViewStyle>;
  /** Gir eieren tilgang til ScrollView-en (kun ved scroll) — f.eks. ankerscroll */
  scrollRef?: RefObject<ScrollView | null>;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  style,
  scrollRef,
}: ScreenProps) {
  const { colors, spacing } = useTheme();

  if (scroll) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={edges}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            padded && { padding: spacing.screen },
            { paddingBottom: spacing.xxl },
            style,
          ]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={edges}>
      <View style={[{ flex: 1 }, padded && { padding: spacing.screen }, style]}>{children}</View>
    </SafeAreaView>
  );
}
