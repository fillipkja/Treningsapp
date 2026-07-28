import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme';

import { clamp, estimateTextWidth, formatValue, niceScale, withAlpha } from './utils';

export interface BarChartDatum {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarChartDatum[];
  /** Total høyde på plottet inkl. x-aksebånd (default 180) */
  height?: number;
  /** Stolpefarge (default accent) */
  color?: string;
  yFormatter?: (value: number) => string;
  /** Fremhevet stolpe (f.eks. inneværende uke) — resten dempes til 45 % */
  highlightIndex?: number;
}

const PAD_TOP = 18;
const PAD_RIGHT = 8;
const X_BAND = 22;
const MAX_BAR_WIDTH = 24;
const CAP_RADIUS = 4;

/** Stolpe med avrundet data-ende (toppen) og kvadratisk baseline. */
function barPath(x: number, top: number, barWidth: number, baseline: number): string {
  const r = Math.min(CAP_RADIUS, barWidth / 2, Math.max(0, baseline - top));
  return [
    `M${x} ${baseline}`,
    `L${x} ${top + r}`,
    `Q${x} ${top} ${x + r} ${top}`,
    `L${x + barWidth - r} ${top}`,
    `Q${x + barWidth} ${top} ${x + barWidth} ${top + r}`,
    `L${x + barWidth} ${baseline}`,
    'Z',
  ].join(' ');
}

export function BarChart({
  data,
  height = 180,
  color,
  yFormatter = formatValue,
  highlightIndex,
}: BarChartProps) {
  const { colors, spacing, radius } = useTheme();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipWidth, setTooltipWidth] = useState(96);

  const barColor = color ?? colors.accent;
  const n = data.length;

  const maxValue = n > 0 ? Math.max(...data.map((d) => d.value), 0) : 0;
  const scale = niceScale(0, maxValue > 0 ? maxValue : 1, 3);

  const tickLabels = scale.ticks.map((t) => yFormatter(t));
  const gutter = Math.max(28, ...tickLabels.map((l) => estimateTextWidth(l, 11) + 8));
  const plotX = gutter;
  const plotW = Math.max(0, width - gutter - PAD_RIGHT);
  const plotH = Math.max(0, height - PAD_TOP - X_BAND);
  const baselineY = PAD_TOP + plotH;

  const bandW = n > 0 ? plotW / n : 0;
  const barW = clamp(Math.min(MAX_BAR_WIDTH, bandW - 2), 2, MAX_BAR_WIDTH);

  const yFor = (v: number) =>
    PAD_TOP + plotH - ((v - scale.min) / Math.max(scale.max - scale.min, 1e-9)) * plotH;
  const barCenter = (i: number) => plotX + i * bandW + bandW / 2;

  const maxIndex = useMemo(() => {
    let idx = -1;
    let best = -Infinity;
    data.forEach((d, i) => {
      if (d.value > best) {
        best = d.value;
        idx = i;
      }
    });
    return idx;
  }, [data]);

  // Selektive x-etiketter når båndene blir for smale.
  const labelStep = bandW >= 28 ? 1 : Math.max(1, Math.ceil(28 / Math.max(bandW, 1)));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const onBarPress = (i: number) => {
    setActiveIndex((prev) => (prev === i ? null : i));
    Haptics.selectionAsync().catch(() => {});
  };

  const active = activeIndex != null ? data[activeIndex] : null;
  const tooltipLeft =
    activeIndex == null
      ? 0
      : clamp(barCenter(activeIndex) - tooltipWidth / 2, 0, Math.max(0, width - tooltipWidth));

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && plotW > 0 && n > 0 ? (
        <>
          <Svg width={width} height={height}>
            {/* Gridlinjer + y-ticks (baseline er egen hårlinje) */}
            {scale.ticks.map((tick) =>
              tick === 0 ? null : (
                <Line
                  key={`grid-${tick}`}
                  x1={plotX}
                  y1={yFor(tick)}
                  x2={width - PAD_RIGHT}
                  y2={yFor(tick)}
                  stroke={colors.gridline}
                  strokeWidth={1}
                />
              ),
            )}
            <Line x1={plotX} y1={baselineY} x2={width - PAD_RIGHT} y2={baselineY} stroke={colors.gridline} strokeWidth={1} />
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

            {/* Stolper */}
            {data.map((d, i) => {
              const top = yFor(Math.max(0, d.value));
              if (baselineY - top < 0.5) return null;
              const dimmed = highlightIndex != null && i !== highlightIndex && i !== activeIndex;
              return (
                <Path
                  key={`bar-${i}`}
                  d={barPath(barCenter(i) - barW / 2, top, barW, baselineY)}
                  fill={dimmed ? withAlpha(barColor, 0.45) : barColor}
                />
              );
            })}

            {/* Verdi-label kun på maks-stolpen */}
            {maxIndex >= 0 && data[maxIndex].value > 0 && activeIndex == null && (
              <SvgText
                x={clamp(barCenter(maxIndex), plotX + 12, width - 12)}
                y={Math.max(yFor(data[maxIndex].value) - 6, 11)}
                fontSize={11}
                fontWeight="600"
                fill={colors.textSecondary}
                textAnchor="middle"
              >
                {yFormatter(data[maxIndex].value)}
              </SvgText>
            )}

            {/* X-etiketter */}
            {data.map((d, i) =>
              i % labelStep === 0 || i === n - 1 ? (
                <SvgText
                  key={`xtick-${i}`}
                  x={barCenter(i)}
                  y={baselineY + 15}
                  fontSize={11}
                  fill={colors.textMuted}
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              ) : null,
            )}
          </Svg>

          {/* Trykkflater per bånd (bredere enn stolpen) */}
          {data.map((_, i) => (
            <Pressable
              key={`hit-${i}`}
              onPress={() => onBarPress(i)}
              style={{
                position: 'absolute',
                left: plotX + i * bandW,
                top: 0,
                width: bandW,
                height: baselineY,
              }}
            />
          ))}

          {/* Tooltip */}
          {active != null && (
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
              <Text style={[styles.tooltipTitle, { color: colors.textMuted }]}>{active.label}</Text>
              <Text style={[styles.tooltipValue, { color: colors.textPrimary }]}>{yFormatter(active.value)}</Text>
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    top: 0,
    borderWidth: 1,
  },
  tooltipTitle: {
    fontSize: 11,
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: 13,
    fontWeight: '600',
  },
});
