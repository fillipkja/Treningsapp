import * as Haptics from 'expo-haptics';
import { addDays, addWeeks, differenceInCalendarWeeks, format, isSameDay, startOfWeek } from 'date-fns';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { heatmapRamp, useTheme } from '@/theme';

import { clamp } from './utils';

export interface YearCalendarProps {
  /** Året som vises */
  year: number;
  /** Nøkkel 'yyyy-MM-dd' → intensitet 0–4 */
  values: Record<string, number>;
  /** 12 månedsetiketter fra januar (default norsk) */
  monthLabels?: string[];
  /** Ukedagsetiketter, 7 fra mandag — annenhver rad vises (default norsk) */
  dayLabels?: string[];
  onDayPress?: (dateKey: string) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const WEEKDAYS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
const WEEK_OPTS = { weekStartsOn: 1 } as const;

const CELL = 11;
const GAP = 3;
const STRIDE = CELL + GAP;
const LABEL_HEIGHT = 16;

/** Hele året som rutenett à la bidragskalendere: uker som kolonner, mandag øverst */
export function YearCalendar({
  year,
  values,
  monthLabels = MONTHS,
  dayLabels = WEEKDAYS,
  onDayPress,
}: YearCalendarProps) {
  const { colors, isDark } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [viewWidth, setViewWidth] = useState(0);

  const ramp = heatmapRamp[isDark ? 'dark' : 'light'];
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const gridStart = startOfWeek(jan1, WEEK_OPTS);
  const weekCount = differenceInCalendarWeeks(dec31, gridStart, WEEK_OPTS) + 1;
  const today = new Date();

  // Sentrer inneværende uke når vi viser gjeldende år
  const centerOnCurrentWeek = (width: number) => {
    if (today.getFullYear() !== year || width <= 0) return;
    const weekIndex = differenceInCalendarWeeks(today, gridStart, WEEK_OPTS);
    const x = Math.max(0, weekIndex * STRIDE - width / 2);
    scrollRef.current?.scrollTo({ x, animated: false });
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setViewWidth(width);
    centerOnCurrentWeek(width);
  };

  const handlePress = (dateKey: string) => {
    Haptics.selectionAsync().catch(() => {});
    onDayPress?.(dateKey);
  };

  // Månedsetikett over kolonnen der måneden begynner
  const monthAtWeek: (string | null)[] = Array.from({ length: weekCount }, () => null);
  for (let m = 0; m < 12; m += 1) {
    const idx = differenceInCalendarWeeks(new Date(year, m, 1), gridStart, WEEK_OPTS);
    if (idx >= 0 && idx < weekCount) monthAtWeek[idx] = monthLabels[m];
  }

  return (
    <View style={styles.row} onLayout={onLayout}>
      <View style={{ marginTop: LABEL_HEIGHT, marginRight: GAP }}>
        {Array.from({ length: 7 }, (_, day) => (
          <Text
            key={`day-${day}`}
            style={[
              styles.dayLabel,
              { height: CELL, marginTop: day > 0 ? GAP : 0, color: colors.textMuted },
            ]}
          >
            {day % 2 === 0 ? dayLabels[day] : ''}
          </Text>
        ))}
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => centerOnCurrentWeek(viewWidth)}
        style={{ flex: 1 }}
      >
        <View>
          <View style={{ height: LABEL_HEIGHT, width: weekCount * STRIDE - GAP }}>
            {monthAtWeek.map((label, week) =>
              label ? (
                <Text
                  key={`month-${week}`}
                  style={[styles.monthLabel, { left: week * STRIDE, color: colors.textMuted }]}
                >
                  {label}
                </Text>
              ) : null,
            )}
          </View>
          {Array.from({ length: 7 }, (_, day) => (
            <View key={`row-${day}`} style={[styles.row, { marginTop: day > 0 ? GAP : 0 }]}>
              {Array.from({ length: weekCount }, (_, week) => {
                const date = addDays(addWeeks(gridStart, week), day);
                if (date < jan1 || date > dec31) {
                  return (
                    <View
                      key={`empty-${week}`}
                      style={{ width: CELL, height: CELL, marginLeft: week > 0 ? GAP : 0 }}
                    />
                  );
                }
                const dateKey = format(date, 'yyyy-MM-dd');
                const intensity = clamp(Math.round(values[dateKey] ?? 0), 0, 4);
                const filled = intensity > 0;
                const isToday = isSameDay(date, today);
                return (
                  <Pressable
                    key={dateKey}
                    disabled={!filled || !onDayPress}
                    onPress={() => handlePress(dateKey)}
                    style={({ pressed }) => ({
                      width: CELL,
                      height: CELL,
                      marginLeft: week > 0 ? GAP : 0,
                      borderRadius: 2,
                      backgroundColor: filled ? ramp[intensity] : colors.gridline,
                      borderWidth: isToday ? 1 : 0,
                      borderColor: isToday ? colors.accent : 'transparent',
                      opacity: pressed ? 0.8 : 1,
                    })}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    width: 12,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '600',
  },
});
