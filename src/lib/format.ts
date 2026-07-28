import { format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

/** 1234.5 -> "1 234,5" (norsk tallformat) */
export function formatNumber(value: number, decimals = 0): string {
  const fixed = value.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart ? `${grouped},${decPart}` : grouped;
}

/** Vekt med enhet: 102.5 -> "102,5 kg" */
export function formatKg(kg: number): string {
  const decimals = Number.isInteger(kg) ? 0 : 1;
  return `${formatNumber(kg, decimals)} kg`;
}

/** Kompakt volum: 12480 -> "12,5 tonn", 850 -> "850 kg" */
export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${formatNumber(kg / 1000, 1)} tonn`;
  return formatKg(kg);
}

/** Kompakt tall til statistikk-fliser: 12480 -> "12,5k" */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)}M`;
  if (value >= 10_000) return `${formatNumber(value / 1000, 1)}k`;
  return formatNumber(value);
}

/** "I dag", "I går", ellers "12. mars" */
export function formatRelativeDate(iso: string): string {
  const date = parseISO(iso);
  if (isToday(date)) return 'I dag';
  if (isYesterday(date)) return 'I går';
  return format(date, 'd. MMMM', { locale: nb });
}

/** "for 2 timer siden" */
export function formatTimeAgo(iso: string): string {
  return `for ${formatDistanceToNowStrict(parseISO(iso), { locale: nb })} siden`;
}

/** "mandag 12. mars" */
export function formatFullDate(iso: string): string {
  return format(parseISO(iso), 'EEEE d. MMMM', { locale: nb });
}

/** Kort dato til akser: "12. mar" */
export function formatShortDate(iso: string): string {
  return format(parseISO(iso), 'd. MMM', { locale: nb });
}

/** 73 -> "1 t 13 min", 45 -> "45 min" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h} t ${m} min` : `${m} min`;
}

/** Nøkkel for kalender/dagsoppslag: "2026-07-28" */
export function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
