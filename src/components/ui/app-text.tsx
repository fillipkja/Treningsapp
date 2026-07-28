import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useTheme, type Theme } from '@/theme';

export type AppTextVariant =
  | 'hero'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'label';

export type AppTextColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'accent'
  | 'success'
  | 'danger'
  | 'onAccent';

interface AppTextProps {
  variant?: AppTextVariant;
  color?: AppTextColor;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  children: ReactNode;
}

function resolveColor(colors: Theme['colors'], color: AppTextColor): string {
  switch (color) {
    case 'secondary':
      return colors.textSecondary;
    case 'muted':
      return colors.textMuted;
    case 'accent':
      return colors.accent;
    case 'success':
      return colors.success;
    case 'danger':
      return colors.danger;
    case 'onAccent':
      return colors.onAccent;
    default:
      return colors.textPrimary;
  }
}

export function AppText({
  variant = 'body',
  color = 'primary',
  style,
  numberOfLines,
  children,
}: AppTextProps) {
  const { colors, typography } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[typography[variant], { color: resolveColor(colors, color) }, style]}
    >
      {children}
    </Text>
  );
}
