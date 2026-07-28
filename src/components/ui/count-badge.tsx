import { View } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './app-text';

interface CountBadgeProps {
  count: number;
  color?: string;
}

export function CountBadge({ count, color }: CountBadgeProps) {
  const { colors, radius } = useTheme();

  return (
    <View
      style={{
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        borderRadius: radius.full,
        backgroundColor: color ?? colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText style={{ color: colors.onAccent, fontSize: 11, fontWeight: '700' }}>
        {count}
      </AppText>
    </View>
  );
}
