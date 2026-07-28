import { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
}

const sizeStyles = {
  sm: { height: 36, paddingHorizontal: 14, fontSize: 13, iconSize: 15 },
  md: { height: 46, paddingHorizontal: 18, fontSize: 15, iconSize: 17 },
  lg: { height: 54, paddingHorizontal: 24, fontSize: 16, iconSize: 19 },
} as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const { colors, radius } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const s = sizeStyles[size];
  const isInactive = disabled || loading;

  const containerStyle: StyleProp<ViewStyle> = {
    height: s.height,
    paddingHorizontal: s.paddingHorizontal,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    opacity: isInactive ? 0.5 : 1,
  };

  let background = colors.accent;
  let textColor = colors.onAccent;
  let borderWidth = 0;
  if (variant === 'secondary') {
    background = colors.surfaceElevated;
    textColor = colors.textPrimary;
    borderWidth = 1;
  } else if (variant === 'ghost') {
    background = 'transparent';
    textColor = colors.accent;
  } else if (variant === 'danger') {
    background = colors.danger;
    textColor = colors.onAccent;
  }

  const textStyle: StyleProp<TextStyle> = {
    color: textColor,
    fontSize: s.fontSize,
    fontWeight: '600',
  };

  const animateTo = (value: number) => {
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], alignSelf: fullWidth ? 'stretch' : 'flex-start' }}>
      <Pressable
        disabled={isInactive}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={[containerStyle, { backgroundColor: background, borderWidth, borderColor: colors.border }]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={s.iconSize} color={textColor} /> : null}
            <Animated.Text style={textStyle}>{title}</Animated.Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
