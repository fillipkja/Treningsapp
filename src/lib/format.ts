import { format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from 'date-fns';
import { enUS, nb } from 'date-fns/locale';
import { useSettingsStore } from '@/lib/store/settings';

function lang() {
  return useSettingsStore.getState().language;
}

function dateLocale() {
  return lang() === 'en' ? enUS : nb;
}

/** nb: "1 234,5" — en: "1,234.5" */
export function formatNumber(value: number, decimals = 0): string {
  const fixed = value.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  if (lang() === 'en') {
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart ? `${grouped}.${decPart}` : grouped;
  }
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart ? `${grouped},${decPart}` : grouped;
}

/** Vekt med enhet: 102.5 -> "102,5 kg" / "102.5 kg" */
export function formatKg(kg: number): string {
  const decimals = Number.isInteger(kg) ? 0 : 1;
  return `${formatNumber(kg, decimals)} kg`;
}

/** Kompakt volum: 12480 -> nb "12,5 tonn" / en "12.5 tonnes" */
export function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${formatNumber(kg / 1000, 1)} ${lang() === 'en' ? 'tonnes' : 'tonn'}`;
  }
  return formatKg(kg);
}

/** Kompakt tall til statistikk-fliser: 12480 -> "12,5k" */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)}M`;
  if (value >= 10_000) return `${formatNumber(value / 1000, 1)}k`;
  return formatNumber(value);
}

/** nb: "I dag" / "I går" / "12. mars" — en: "Today" / "Yesterday" / "March 12" */
export function formatRelativeDate(iso: string): string {
  const date = parseISO(iso);
  if (isToday(date)) return lang() === 'en' ? 'Today' : 'I dag';
  if (isYesterday(date)) return lang() === 'en' ? 'Yesterday' : 'I går';
  return lang() === 'en'
    ? format(date, 'MMMM d', { locale: enUS })
    : format(date, 'd. MMMM', { locale: nb });
}

/** nb: "for 2 timer siden" — en: "2 hours ago" */
export function formatTimeAgo(iso: string): string {
  return formatDistanceToNowStrict(parseISO(iso), { locale: dateLocale(), addSuffix: true });
}

/** nb: "mandag 12. mars" — en: "Monday, March 12" */
export function formatFullDate(iso: string): string {
  return lang() === 'en'
    ? format(parseISO(iso), 'EEEE, MMMM d', { locale: enUS })
    : format(parseISO(iso), 'EEEE d. MMMM', { locale: nb });
}

/** Kort dato til akser: nb "12. mar" — en "Mar 12" */
export function formatShortDate(iso: string): string {
  return lang() === 'en'
    ? format(parseISO(iso), 'MMM d', { locale: enUS })
    : format(parseISO(iso), 'd. MMM', { locale: nb });
}

/** 73 -> nb "1 t 13 min" / en "1 h 13 min" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const hourUnit = lang() === 'en' ? 'h' : 't';
  return h > 0 ? `${h} ${hourUnit} ${m} min` : `${m} min`;
}

/** Nøkkel for kalender/dagsoppslag: "2026-07-28" (språkuavhengig) */
export function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
