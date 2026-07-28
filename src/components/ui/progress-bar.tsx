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
  // Sporet følger fyllfargen (samme `29`-vask som chips/fliser) slik at
  // meteret holder én kulør også når fyllet overstyres.
  const track = color ? `${color}29` : colors.accentMuted;

  return (
    <View
      style={{
        height,
        borderRadius: radius.full,
        backgroundColor: track,
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
