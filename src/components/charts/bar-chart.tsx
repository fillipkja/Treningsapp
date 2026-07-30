import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
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
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

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

  // Selektive x-etiketter: grådig venstre-til-høyre per faktisk etikettbredde
  // (én bred etikett straffer ikke de smale); siste vises alltid og vinner plass.
  const labeledIndices = useMemo(() => {
    const set = new Set<number>();
    if (n === 0 || bandW <= 0) return set;
    const half = (i: number) => estimateTextWidth(data[i].label, 11) / 2;
    let lastKept = -1;
    for (let i = 0; i < n; i++) {
      if (lastKept < 0 || (i - lastKept) * bandW >= half(lastKept) + half(i) + 8) {
        set.add(i);
        lastKept = i;
      }
    }
    if (!set.has(n - 1)) {
      for (const i of [...set]) {
        if ((n - 1 - i) * bandW < half(i) + half(n - 1) + 8) set.delete(i);
      }
      set.add(n - 1);
    }
    return set;
  }, [data, n, bandW]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && plotW > 0 && n > 0 ? (
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
            const dimmed = highlightIndex != null && i !== highlightIndex;
            return (
              <Path
                key={`bar-${i}`}
                d={barPath(barCenter(i) - barW / 2, top, barW, baselineY)}
                fill={dimmed ? withAlpha(barColor, 0.45) : barColor}
              />
            );
          })}

          {/* Verdi-label over hver stolpe med verdi (null-uker holdes rene) */}
          {data.map((d, i) =>
            d.value > 0 ? (
              <SvgText
                key={`val-${i}`}
                x={clamp(barCenter(i), plotX + 12, width - 12)}
                y={Math.max(yFor(d.value) - 6, 11)}
                fontSize={11}
                fontWeight="600"
                fill={colors.textSecondary}
                textAnchor="middle"
              >
                {yFormatter(d.value)}
              </SvgText>
            ) : null,
          )}

          {/* X-etiketter (selektive) */}
          {data.map((d, i) =>
            labeledIndices.has(i) ? (
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
      ) : null}
    </View>
  );
}
