import { useCallback } from 'react';
import { useSettingsStore, type AppLanguage } from '@/lib/store/settings';
import { en } from './en';
import { nb } from './nb';

export type { AppLanguage } from '@/lib/store/settings';
export type TranslationKey = keyof typeof nb;

const dictionaries: Record<AppLanguage, Record<TranslationKey, string>> = { nb, en };

/** Interpolerer {navn}-plassholdere: translate('en', 'x', { name: 'Kari' }) */
export function translate(
  lang: AppLanguage,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  let text = dictionaries[lang][key] ?? dictionaries.nb[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

/** Oversettelse utenfor React (stores, hjelpere) — leser aktivt språk */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  return translate(useSettingsStore.getState().language, key, params);
}

/** Hook: re-rendrer når språket endres */
export function useT() {
  const lang = useSettingsStore((s) => s.language);
  return useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(lang, key, params),
    [lang],
  );
}

export function useLanguage(): AppLanguage {
  return useSettingsStore((s) => s.language);
}

/** Språk utenfor React */
export function getLanguage(): AppLanguage {
  return useSettingsStore.getState().language;
}
