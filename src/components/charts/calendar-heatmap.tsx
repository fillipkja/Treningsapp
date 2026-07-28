import * as Haptics from 'expo-haptics';
import { endOfMonth, format, getDate, getDay, isSameDay, startOfMonth } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { heatmapRamp, useTheme } from '@/theme';

import { clamp, luminance } from './utils';

export interface CalendarHeatmapProps {
  /** Måneden som vises (hvilken som helst dag i måneden) */
  month: Date;
  /** Nøkkel 'yyyy-MM-dd' → intensitet 0–4 */
  values: Record<string, number>;
  onDayPress?: (dateKey: string) => void;
}

const WEEKDAYS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
const GAP = 4;

// Tekst oppå ramp-fyll velges etter fyllets luminans (dataviz-regel om
// kontrast inni fargede flater) — bevisst uavhengig av tema.
const INK_ON_LIGHT = '#0f0f0f';
const INK_ON_DARK = '#ffffff';

export function CalendarHeatmap({ month, values, onDayPress }: CalendarHeatmapProps) {
  const { colors, isDark, radius } = useTheme();
  const [width, setWidth] = useState(0);

  const ramp = heatmapRamp[isDark ? 'dark' : 'light'];
  const first = startOfMonth(month);
  const daysInMonth = getDate(endOfMonth(month));
  // Mandag-først: getDay gir 0 = søndag.
  const leading = (getDay(first) + 6) % 7;
  const weekCount = Math.ceil((leading + daysInMonth) / 7);
  const today = new Date();

  const cellSize = width > 0 ? (width - GAP * 6) / 7 : 0;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const handlePress = (dateKey: string) => {
    Haptics.selectionAsync().catch(() => {});
    onDayPress?.(dateKey);
  };

  return (
    <View onLayout={onLayout}>
      {width > 0 && (
        <>
          <View style={styles.row}>
            {WEEKDAYS.map((day, i) => (
              <Text
                key={`${day}-${i}`}
                style={[styles.weekday, { width: cellSize, color: colors.textMuted }]}
              >
                {day}
              </Text>
            ))}
          </View>

          {Array.from({ length: weekCount }, (_, week) => (
            <View key={`week-${week}`} style={[styles.row, { marginTop: GAP }]}>
              {Array.from({ length: 7 }, (_, col) => {
                const dayNumber = week * 7 + col - leading + 1;
                if (dayNumber < 1 || dayNumber > daysInMonth) {
                  return <View key={`empty-${col}`} style={{ width: cellSize, height: cellSize }} />;
                }
                const date = new Date(month.getFullYear(), month.getMonth(), dayNumber);
                const dateKey = format(date, 'yyyy-MM-dd');
                const intensity = clamp(Math.round(values[dateKey] ?? 0), 0, 4);
                const filled = intensity > 0;
                const fill = filled ? ramp[intensity] : colors.gridline;
                const isToday = isSameDay(date, today);
                const textColor = !filled
                  ? colors.textMuted
                  : luminance(fill) > 0.55
                    ? INK_ON_LIGHT
                    : INK_ON_DARK;
                return (
                  <Pressable
                    key={dateKey}
                    disabled={!onDayPress}
                    onPress={() => handlePress(dateKey)}
                    style={({ pressed }) => [
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        borderRadius: radius.sm,
                        backgroundColor: fill,
                        borderColor: isToday ? colors.accent : 'transparent',
                        opacity: pressed && onDayPress ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.dayNumber, { color: textColor }]}>{dayNumber}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekday: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: '500',
  },
});
