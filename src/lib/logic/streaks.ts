import { differenceInCalendarDays, parseISO } from 'date-fns';
import { dateKey } from '@/lib/format';

/** Unike treningsdager (lokal yyyy-MM-dd), nyeste først */
function uniqueDays(dates: string[]): string[] {
  return [...new Set(dates.map((d) => dateKey(parseISO(d))))].sort().reverse();
}

/**
 * Antall sammenhengende treningsdager t.o.m. i dag eller i går.
 * (Streaken lever fortsatt hvis siste økt var i går.)
 */
export function currentStreak(workoutDates: string[], today: Date): number {
  const days = uniqueDays(workoutDates);
  if (days.length === 0) return 0;
  const gapToLast = differenceInCalendarDays(today, parseISO(days[0]));
  if (gapToLast > 1) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if (differenceInCalendarDays(parseISO(days[i - 1]), parseISO(days[i])) === 1) streak++;
    else break;
  }
  return streak;
}

export function longestStreak(workoutDates: string[]): number {
  const days = uniqueDays(workoutDates);
  if (days.length === 0) return 0;
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (differenceInCalendarDays(parseISO(days[i - 1]), parseISO(days[i])) === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  return longest;
}
