import { en } from './en';
import { pt, type StringKey } from './pt';

export type Lang = 'pt' | 'en';
export const LANGS: readonly Lang[] = ['pt', 'en'];

const TABLES: Record<Lang, Record<StringKey, string>> = { pt, en };

let current: Lang = 'pt';

export function detectLang(): Lang {
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'pt';
  return nav.startsWith('pt') ? 'pt' : 'en';
}

export function setLang(lang: Lang): void {
  current = lang;
}

export function getLang(): Lang {
  return current;
}

/** Translates a key, replacing `{name}` placeholders with values from `params`. */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  let s: string = TABLES[current][key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export type { StringKey };
