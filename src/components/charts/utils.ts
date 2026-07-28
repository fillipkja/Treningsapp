// Interne hjelpere for grafkomponentene. Ikke eksportert fra barrelen.

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Hex (#rgb/#rrggbb) eller rgb()/rgba() → rgba-streng med gitt alpha. */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (match) {
    const [r = 0, g = 0, b = 0] = match[1].split(',').map((part) => parseFloat(part.trim()));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

/** Relativ luminans 0–1 for en hex-farge — til valg av tekstfarge oppå fyll. */
export function luminance(hexColor: string): number {
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Standardformatering av verdier: norsk tusenskille (mellomrom), desimalkomma. */
export function formatValue(value: number): string {
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  const [intPart, decPart] = String(rounded).split('.');
  const spaced = (intPart ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart ? `${spaced},${decPart}` : spaced;
}

function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range));
  const frac = range / 10 ** exp;
  let nice: number;
  if (round) {
    nice = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
  } else {
    nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  }
  return nice * 10 ** exp;
}

/** Neste «fine» steg (1 → 2 → 5 → 10 …) når vi må tynne ut ticks. */
function bumpStep(step: number): number {
  const exp = Math.floor(Math.log10(step));
  const frac = step / 10 ** exp;
  if (frac < 1.5) return 2 * 10 ** exp;
  if (frac < 3) return 5 * 10 ** exp;
  return 10 ** (exp + 1);
}

export interface NiceScale {
  ticks: number[];
  min: number;
  max: number;
}

/** Beregner runde y-ticks (2–4 stk) som dekker [rawMin, rawMax]. */
export function niceScale(rawMin: number, rawMax: number, tickCount = 3): NiceScale {
  let min = rawMin;
  let max = rawMax;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (min === max) {
    if (min === 0) {
      max = 1;
    } else {
      const pad = Math.abs(min) * 0.1;
      min -= pad;
      max += pad;
    }
  }

  let step = niceNum((max - min) / Math.max(1, tickCount - 1), true);
  for (let attempt = 0; attempt < 4; attempt++) {
    const niceMin = Math.floor(min / step) * step;
    const niceMax = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
      ticks.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toFixed(10)));
    }
    if (ticks.length <= 4 || attempt === 3) {
      return { ticks, min: niceMin, max: niceMax };
    }
    step = bumpStep(step);
  }
  return { ticks: [min, max], min, max };
}

/** Grov breddeestimering av tekst (systemfont, gitt fontstørrelse). */
export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.62;
}
