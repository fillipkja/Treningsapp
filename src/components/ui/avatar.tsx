import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { AppText } from './app-text';

interface AvatarProps {
  name: string;
  color: string;
  uri?: string;
  size?: number;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ name, color, uri, size = 40 }: AvatarProps) {
  const { colors } = useTheme();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText
        style={{ color: colors.onAccent, fontSize: size * 0.4, fontWeight: '600' }}
      >
        {initials(name)}
      </AppText>
    </View>
  );
}
