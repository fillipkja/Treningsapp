import type { AppLanguage } from '@/lib/store/settings';
import type { Exercise } from '@/types';
import { exerciseTextEn1 } from './exercise-i18n-1';
import { exerciseTextEn2 } from './exercise-i18n-2';

const EN: Record<string, { instructions: string[]; tips?: string[] }> = {
  ...exerciseTextEn1,
  ...exerciseTextEn2,
};

/** Øvelsesnavn på aktivt språk. Egendefinerte øvelser vises som skrevet. */
export function exerciseDisplayName(exercise: Exercise, lang: AppLanguage): string {
  return lang === 'en' ? (exercise.englishName ?? exercise.name) : exercise.name;
}

/** Navn, instruksjoner og tips på aktivt språk (fallback: norsk) */
export function getExerciseText(
  exercise: Exercise,
  lang: AppLanguage,
): { name: string; instructions: string[]; tips?: string[] } {
  if (lang === 'en') {
    const en = EN[exercise.id];
    return {
      name: exercise.englishName ?? exercise.name,
      instructions: en?.instructions ?? exercise.instructions,
      tips: en?.tips ?? exercise.tips,
    };
  }
  return { name: exercise.name, instructions: exercise.instructions, tips: exercise.tips };
}
