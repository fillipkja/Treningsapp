import { View } from 'react-native';
import { useTheme } from '@/theme';

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
}

export function ProgressBar({ progress, color, height = 8 }: ProgressBarProps) {
  const { colors, radius } = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View
      style={{
        height,
        borderRadius: radius.full,
        backgroundColor: colors.accentMuted,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: radius.full,
          backgroundColor: color ?? colors.accent,
        }}
      />
    </View>
  );
}
