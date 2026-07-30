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
  // Skjema-/kodeversjonssprik (Supabase-rader eldre/nyere enn bundelen) kan gi
  // undefined her — degrader til "0" i stedet for å velte hele render-treet
  if (!Number.isFinite(value)) return '0';
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

/**
 * Som formatRelativeDate, men for KALENDERDAG-kodede verdier (rekorddatoer
 * lagres som midt på dagen UTC — se parseDateInput i records/new). Leser
 * UTC-komponentene så liste, redigeringsskjema og lagring viser samme dag i
 * alle tidssoner; lokal tolkning ville vist dagen etter øst for UTC+11.
 * Ikke bruk den på ekte tidsstempler (øktenes date, achievedAt fra tavler).
 */
export function formatRecordDate(iso: string): string {
  const d = parseISO(iso);
  const local = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  if (isToday(local)) return lang() === 'en' ? 'Today' : 'I dag';
  if (isYesterday(local)) return lang() === 'en' ? 'Yesterday' : 'I går';
  return lang() === 'en'
    ? format(local, 'MMMM d', { locale: enUS })
    : format(local, 'd. MMMM', { locale: nb });
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

/** 73 -> nb "1 t 13 min" / en "1 h 13 min" (øktvarighet i minutter) */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const hourUnit = lang() === 'en' ? 'h' : 't';
  return h > 0 ? `${h} ${hourUnit} ${m} min` : `${m} min`;
}

/** Løpetid i sekunder som klokke: 1351 -> "22:31", 6312 -> "1:45:12" */
export function formatDuration(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/**
 * Tolker tidsinput til sekunder: "22:31" (mm:ss) eller "1:45:12" (t:mm:ss).
 * Rene sifre avvises bevisst — "2231" ment som 22:31 ville ellers blitt
 * stille feiltolket som minutter. null ved ugyldig eller null total.
 */
export function parseDurationInput(text: string): number | null {
  const input = text.trim();
  const mmss = /^(\d{1,3}):([0-5]\d)$/.exec(input);
  if (mmss) {
    const total = Number(mmss[1]) * 60 + Number(mmss[2]);
    return total > 0 ? total : null;
  }
  const hmmss = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(input);
  if (hmmss) {
    const total = Number(hmmss[1]) * 3600 + Number(hmmss[2]) * 60 + Number(hmmss[3]);
    return total > 0 ? total : null;
  }
  return null;
}

/** Nøkkel for kalender/dagsoppslag: "2026-07-28" (språkuavhengig) */
export function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
