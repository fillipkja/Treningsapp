import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '@/theme';

import { Sparkline } from './sparkline';

export interface StatTileDelta {
  /** Ferdig formatert endring, f.eks. '+12 %' */
  value: string;
  direction: 'up' | 'down';
  /** Om økning er positivt (default true) — styrer god/dårlig-farge */
  upIsGood?: boolean;
}

export interface StatTileProps {
  label: string;
  /** Ferdig formatert hovedtall */
  value: string;
  delta?: StatTileDelta;
  /** Trendserie → sparkline nederst i accent */
  trend?: number[];
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export function StatTile({ label, value, delta, trend, icon, onPress }: StatTileProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [innerWidth, setInnerWidth] = useState(0);

  const deltaIsGood = delta ? (delta.direction === 'up') === (delta.upIsGood ?? true) : true;
  const deltaColor = deltaIsGood ? colors.success : colors.danger;

  const onLayout = (e: LayoutChangeEvent) =>
    setInnerWidth(Math.max(0, e.nativeEvent.layout.width - spacing.lg * 2));

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      onLayout={onLayout}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.lg,
          opacity: pressed && onPress ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[typography.label, { color: colors.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
        {icon != null && <Ionicons name={icon} size={16} color={colors.textMuted} />}
      </View>

      {/* Proporsjonale siffer (default) — aldri tabular-nums på store tall */}
      <Text style={[styles.value, { color: colors.textPrimary, marginTop: spacing.xs }]} numberOfLines={1}>
        {value}
      </Text>

      {delta != null && (
        <View style={[styles.deltaRow, { marginTop: spacing.xs }]}>
          <Ionicons
            name={delta.direction === 'up' ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={deltaColor}
          />
          <Text style={[styles.deltaText, { color: deltaColor }]}>{delta.value}</Text>
        </View>
      )}

      {trend != null && trend.length > 1 && innerWidth > 0 && (
        <View style={{ marginTop: spacing.sm }}>
          <Sparkline points={trend} width={innerWidth} height={26} color={colors.accent} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 2,
  },
  deltaText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
