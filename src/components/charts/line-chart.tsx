import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { chartSeries, useTheme } from '@/theme';

import { clamp, estimateTextWidth, formatValue, niceScale, withAlpha } from './utils';

export interface LineChartPoint {
  /** Kategorisk x-etikett (ferdig formatert dato e.l.) */
  x: string;
  y: number;
}

export interface LineChartSeries {
  label: string;
  /** Overstyrer seriefargen. Default: chartSeries i fast rekkefølge */
  color?: string;
  points: LineChartPoint[];
}

export interface LineChartProps {
  series: LineChartSeries[];
  /** Total høyde på plottet inkl. x-aksebånd (default 200) */
  height?: number;
  yFormatter?: (value: number) => string;
  /** Arealvask under linjen (~10 % opacity). Default: på ved én serie */
  areaFill?: boolean;
  /** Punkt på hver måling — endepunktet vises alltid */
  showDots?: boolean;
}

const PAD_TOP = 18;
const PAD_RIGHT = 8;
const X_BAND = 22;

export function LineChart({
  series,
  height = 200,
  yFormatter = formatValue,
  areaFill,
  showDots = false,
}: LineChartProps) {
  const { colors, isDark, spacing, radius } = useTheme();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipWidth, setTooltipWidth] = useState(120);
  const lastHapticIndex = useRef<number | null>(null);

  const palette = chartSeries[isDark ? 'dark' : 'light'];
  const colored = series.map((s, i) => ({ ...s, color: s.color ?? palette[i % palette.length] }));
  const showArea = areaFill ?? series.length === 1;

  // Kategoriakse: union av x-etiketter i rekkefølge de dukker opp.
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of series) {
      for (const p of s.points) {
        if (!seen.has(p.x)) {
          seen.add(p.x);
          out.push(p.x);
        }
      }
    }
    return out;
  }, [series]);
  const catIndex = useMemo(() => new Map(categories.map((c, i) => [c, i])), [categories]);
  const n = categories.length;

  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  const scale = niceScale(
    allY.length > 0 ? Math.min(...allY) : 0,
    allY.length > 0 ? Math.max(...allY) : 1,
    3,
  );

  const tickLabels = scale.ticks.map((t) => yFormatter(t));
  const gutter = Math.max(28, ...tickLabels.map((l) => estimateTextWidth(l, 11) + 8));
  const plotX = gutter;
  const plotW = Math.max(0, width - gutter - PAD_RIGHT);
  const plotH = Math.max(0, height - PAD_TOP - X_BAND);
  const baselineY = PAD_TOP + plotH;

  const xFor = (i: number) => plotX + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yFor = (v: number) =>
    PAD_TOP + plotH - ((v - scale.min) / Math.max(scale.max - scale.min, 1e-9)) * plotH;

  // Selektive x-etiketter: første, jevnt fordelte og siste — aldri kollisjon.
  const labeledIndices = useMemo(() => {
    const set = new Set<number>();
    if (n === 0 || plotW <= 0) return set;
    const maxLabels = Math.max(2, Math.floor(plotW / 56));
    const step = Math.ceil(n / maxLabels);
    for (let i = 0; i < n; i += step) set.add(i);
    const lastMultiple = Math.floor((n - 1) / step) * step;
    if (!set.has(n - 1)) {
      if (n - 1 - lastMultiple < step * 0.6) set.delete(lastMultiple);
      set.add(n - 1);
    }
    return set;
  }, [n, plotW]);

  const panResponder = useMemo(() => {
    const updateIndex = (locationX: number) => {
      if (n === 0 || plotW <= 0) return;
      const idx = n <= 1 ? 0 : clamp(Math.round((locationX / plotW) * (n - 1)), 0, n - 1);
      setActiveIndex(idx);
      if (lastHapticIndex.current !== idx) {
        lastHapticIndex.current = idx;
        Haptics.selectionAsync().catch(() => {});
      }
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => updateIndex(e.nativeEvent.locationX),
      onPanResponderMove: (e) => updateIndex(e.nativeEvent.locationX),
      onPanResponderRelease: () => {
        setActiveIndex(null);
        lastHapticIndex.current = null;
      },
      onPanResponderTerminate: () => {
        setActiveIndex(null);
        lastHapticIndex.current = null;
      },
    });
  }, [n, plotW]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const activeRows =
    activeIndex == null
      ? []
      : colored
          .map((s) => {
            const point = s.points.find((p) => catIndex.get(p.x) === activeIndex);
            return point ? { label: s.label, color: s.color, y: point.y } : null;
          })
          .filter((row): row is { label: string; color: string; y: number } => row != null);

  const tooltipLeft =
    activeIndex == null ? 0 : clamp(xFor(activeIndex) - tooltipWidth / 2, 0, Math.max(0, width - tooltipWidth));

  return (
    <View onLayout={onLayout}>
      {colored.length >= 2 && (
        <View style={[styles.legendRow, { marginBottom: spacing.sm, columnGap: spacing.lg }]}>
          {colored.map((s) => (
            <View key={s.label} style={[styles.legendItem, { columnGap: spacing.xs + 2 }]}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {width > 0 && plotW > 0 && n > 0 && (
        <View style={{ height }}>
          <Svg width={width} height={height}>
            {/* Gridlinjer + y-ticks */}
            {scale.ticks.map((tick) => (
              <Line
                key={`grid-${tick}`}
                x1={plotX}
                y1={yFor(tick)}
                x2={width - PAD_RIGHT}
                y2={yFor(tick)}
                stroke={colors.gridline}
                strokeWidth={1}
              />
            ))}
            {scale.ticks.map((tick) => (
              <SvgText
                key={`ytick-${tick}`}
                x={gutter - 6}
                y={yFor(tick) + 4}
                fontSize={11}
                fill={colors.textMuted}
                textAnchor="end"
              >
                {yFormatter(tick)}
              </SvgText>
            ))}

            {/* X-etiketter (selektive) */}
            {categories.map((cat, i) =>
              labeledIndices.has(i) ? (
                <SvgText
                  key={`xtick-${i}`}
                  x={xFor(i)}
                  y={baselineY + 15}
                  fontSize={11}
                  fill={colors.textMuted}
                  textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                >
                  {cat}
                </SvgText>
              ) : null,
            )}

            {/* Arealvask */}
            {showArea &&
              colored.map((s) => {
                if (s.points.length < 2) return null;
                const coords = s.points.map((p) => ({ x: xFor(catIndex.get(p.x) ?? 0), y: yFor(p.y) }));
                const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x} ${c.y}`).join(' ');
                const first = coords[0];
                const last = coords[coords.length - 1];
                return (
                  <Path
                    key={`area-${s.label}`}
                    d={`${line} L${last.x} ${baselineY} L${first.x} ${baselineY} Z`}
                    fill={withAlpha(s.color, 0.1)}
                  />
                );
              })}

            {/* Linjer */}
            {colored.map((s) => {
              if (s.points.length === 0) return null;
              const d = s.points
                .map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(catIndex.get(p.x) ?? 0)} ${yFor(p.y)}`)
                .join(' ');
              return (
                <Path
                  key={`line-${s.label}`}
                  d={d}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              );
            })}

            {/* Punkt per måling (valgfritt) */}
            {showDots &&
              colored.map((s) =>
                s.points.map((p, i) => (
                  <Circle
                    key={`dot-${s.label}-${i}`}
                    cx={xFor(catIndex.get(p.x) ?? 0)}
                    cy={yFor(p.y)}
                    r={4}
                    fill={s.color}
                    stroke={colors.surface}
                    strokeWidth={2}
                  />
                )),
              )}

            {/* Crosshair + aktive punkter */}
            {activeIndex != null && (
              <Line
                x1={xFor(activeIndex)}
                y1={PAD_TOP}
                x2={xFor(activeIndex)}
                y2={baselineY}
                stroke={colors.textMuted}
                strokeWidth={1}
              />
            )}
            {activeIndex != null &&
              activeRows.map((row) => (
                <Circle
                  key={`active-${row.label}`}
                  cx={xFor(activeIndex)}
                  cy={yFor(row.y)}
                  r={4}
                  fill={row.color}
                  stroke={colors.surface}
                  strokeWidth={2}
                />
              ))}

            {/* Endepunkt-dot + selektiv direkte-label (siste verdi) */}
            {colored.map((s) => {
              const lastPoint = s.points[s.points.length - 1];
              if (!lastPoint) return null;
              const lx = xFor(catIndex.get(lastPoint.x) ?? 0);
              const ly = yFor(lastPoint.y);
              return (
                <Circle key={`end-${s.label}`} cx={lx} cy={ly} r={5} fill={s.color} stroke={colors.surface} strokeWidth={2} />
              );
            })}
            {activeIndex == null &&
              colored.map((s) => {
                const lastPoint = s.points[s.points.length - 1];
                if (!lastPoint) return null;
                const lx = xFor(catIndex.get(lastPoint.x) ?? 0);
                const ly = yFor(lastPoint.y);
                return (
                  <SvgText
                    key={`endlabel-${s.label}`}
                    x={lx}
                    y={Math.max(ly - 11, 11)}
                    fontSize={11}
                    fontWeight="600"
                    fill={colors.textSecondary}
                    textAnchor={lx > width - 40 ? 'end' : 'middle'}
                  >
                    {yFormatter(lastPoint.y)}
                  </SvgText>
                );
              })}
          </Svg>

          {/* Touch-overlegg for scrubbing */}
          <View
            {...panResponder.panHandlers}
            style={{ position: 'absolute', left: plotX, top: 0, width: plotW, height: baselineY }}
          />

          {/* Tooltip */}
          {activeIndex != null && activeRows.length > 0 && (
            <View
              pointerEvents="none"
              onLayout={(e) => setTooltipWidth(e.nativeEvent.layout.width)}
              style={[
                styles.tooltip,
                {
                  left: tooltipLeft,
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm - 2,
                  paddingHorizontal: spacing.sm + 2,
                },
              ]}
            >
              <Text style={[styles.tooltipTitle, { color: colors.textMuted }]}>{categories[activeIndex]}</Text>
              {activeRows.map((row) => (
                <View key={row.label} style={[styles.tooltipRow, { columnGap: spacing.xs + 2 }]}>
                  {activeRows.length > 1 && <View style={[styles.tooltipDot, { backgroundColor: row.color }]} />}
                  <Text style={[styles.tooltipValue, { color: colors.textPrimary }]}>{yFormatter(row.y)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
      {(width === 0 || plotW <= 0 || n === 0) && <View style={{ height }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    borderWidth: 1,
  },
  tooltipTitle: {
    fontSize: 11,
    marginBottom: 2,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tooltipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tooltipValue: {
    fontSize: 13,
    fontWeight: '600',
  },
});
