import { en, type MessageKey, type Messages } from './en';
export const LOCALES = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'de', 'es'] as const;
export type Locale = typeof LOCALES[number];
export type Language = 'auto' | Locale;
export const LANGUAGE_NAMES: Record<Locale, string> = { ja: '日本語', ko: '한국어', fr: 'Français', de: 'Deutsch', es: 'Español', en: 'English', 'zh-CN': '简体中文', 'zh-TW': '繁體中文' };
export const messages: Partial<Record<Locale, Messages>> = { en };
const loaders = {
  'zh-CN': () => import('./zh-CN').then(module => module.zhCN),
  'zh-TW': () => import('./zh-TW').then(module => module.zhTW),
  ja: () => import('./ja').then(module => module.ja),
  ko: () => import('./ko').then(module => module.ko),
  fr: () => import('./fr').then(module => module.fr),
  de: () => import('./de').then(module => module.de),
  es: () => import('./es').then(module => module.es),
};
const pending: Partial<Record<Locale, Promise<void>>> = {};
export function loadLocale(locale: Locale): Promise<void> {
  if (messages[locale] || locale === 'en') return Promise.resolve();
  return pending[locale] ??= loaders[locale]().then(dictionary => { messages[locale] = dictionary; })
    .finally(() => { delete pending[locale]; });
}
export type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;
export function isLanguage(value: unknown): value is Language {
  return value === 'auto' || typeof value === 'string' && LOCALES.includes(value as Locale);
}
export function matchLocale(value: string): Locale | undefined {
  const tag = value.replaceAll('_', '-').toLowerCase();
  const parts = tag.split('-');
  const base = parts[0] ?? '';
  if (['en', 'ja', 'ko', 'fr', 'de', 'es'].includes(base)) return base as Locale;
  if (parts[0] !== 'zh') return undefined;
  if (parts.includes('hans')) return 'zh-CN';
  if (parts.includes('hant') || parts.some(part => ['tw', 'hk', 'mo'].includes(part))) return 'zh-TW';
  return 'zh-CN';
}
export function resolveLocale(language: Language, browserLanguages: readonly string[]): Locale {
  if (language !== 'auto') return language;
  for (const tag of browserLanguages) { const locale = matchLocale(tag); if (locale) return locale; }
  return 'en';
}
export function browserLanguages(): string[] {
  const ui = typeof chrome !== 'undefined' ? chrome.i18n?.getUILanguage?.() : undefined;
  return [...(ui ? [ui] : []), ...(typeof navigator !== 'undefined' ? navigator.languages : [])];
}
export function createTranslator(locale: Locale): Translator {
  return (key, values = {}) => (messages[locale] ?? en)[key].replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder));
}
export function legalPath(page: 'privacy' | 'licenses', locale: Locale): string {
  return locale === 'zh-CN' ? `/${page}.html` : `/locales/${locale}/${page}.html`;
}
export class MessageError extends Error {
  constructor(readonly key: MessageKey) { super(key); this.name = 'MessageError'; }
}
export function errorMessage(error: Error, t: Translator): string {
  return error instanceof MessageError ? t(error.key) : error.message;
}
export function asError(error: unknown, fallback: MessageKey): Error {
  return error instanceof Error ? error : new MessageError(fallback);
}
