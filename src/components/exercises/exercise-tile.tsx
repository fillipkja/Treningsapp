import { StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/i18n';
import { exerciseDisplayName } from '@/lib/data/exercise-i18n';
import { muscleColors, useTheme } from '@/theme';
import type { Exercise } from '@/types';

export interface ExerciseTileProps {
  exercise: Exercise;
  /** Sidelengde i px (default 48) */
  size?: number;
}

/**
 * Farget øvelsesflis: avrundet kvadrat i muskelgruppens identitetsfarge
 * (16 % vask som bakgrunn) med øvelsens forbokstav i selve fargen.
 */
export function ExerciseTile({ exercise, size = 48 }: ExerciseTileProps) {
  const { colors, radius, isDark } = useTheme();
  const lang = useLanguage();

  const palette: Record<string, string> = muscleColors[isDark ? 'dark' : 'light'];
  const muscle = exercise.primaryMuscles[0];
  const color = (muscle != null ? palette[muscle] : undefined) ?? colors.accent;

  const letter = (exerciseDisplayName(exercise, lang).trim().charAt(0) || '?').toUpperCase();
  const isLarge = size >= 80;

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: isLarge ? radius.lg : radius.md,
          backgroundColor: color + '29',
        },
      ]}
    >
      <Text
        allowFontScaling={false}
        style={{
          color,
          fontWeight: '600',
          fontSize: Math.round(size * (isLarge ? 0.4 : 0.38)),
        }}
      >
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
