import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

export interface SparklineProps {
  points: number[];
  /** Default 64 */
  width?: number;
  /** Default 24 */
  height?: number;
  /** Default accent */
  color?: string;
}

/** Ren 2px trendlinje uten akser, punkter eller labels. */
export function Sparkline({ points, width = 64, height = 24, color }: SparklineProps) {
  const { colors } = useTheme();

  if (points.length < 2) {
    return <View style={{ width, height }} />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const inset = 2; // rom til round caps
  const innerW = width - inset * 2;
  const innerH = height - inset * 2;
  const norm = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));

  const d = points
    .map((v, i) => {
      const x = inset + (i / (points.length - 1)) * innerW;
      const y = inset + (1 - norm(v)) * innerH;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Path
        d={d}
        stroke={color ?? colors.accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
