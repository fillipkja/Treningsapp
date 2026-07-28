import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './app-text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Chip({ label, selected = false, onPress, icon }: ChipProps) {
  const { colors, radius, spacing } = useTheme();
  const textColor = selected ? colors.accent : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm - 1,
        borderRadius: radius.full,
        backgroundColor: selected ? colors.accentMuted : colors.surfaceElevated,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        opacity: pressed ? 0.8 : 1,
        alignSelf: 'flex-start',
      })}
    >
      {icon ? <Ionicons name={icon} size={14} color={textColor} /> : null}
      <AppText variant="caption" style={{ color: textColor, fontWeight: '600' }}>
        {label}
      </AppText>
    </Pressable>
  );
}
