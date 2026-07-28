import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme';

/** Gull-pill for personlige rekorder — rekord = gull i hele appen. */
export function PrBadge({ label }: { label: string }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.gold,
        backgroundColor: colors.surfaceElevated,
      }}
    >
      <Ionicons name="trophy" size={13} color={colors.gold} />
      <AppText variant="caption" style={{ color: colors.gold, fontWeight: '700' }}>
        {label}
      </AppText>
    </View>
  );
}
