/*
 * First-paint cache. Saved preferences live in chrome.storage, which is async,
 * so the page would otherwise paint the default theme, browser language and a
 * default background before they load. The last resolved appearance, locale and
 * background are mirrored to localStorage (read synchronously) and applied
 * before React renders. CSP forbids inline scripts, so this runs at the top of
 * the entry module.
 */
import type { Theme } from '../../effects/presets';
import type { Tone } from '../../effects/variants';
import { isLanguage, LOCALES, type Language, type Locale } from '../../i18n/core';
import type { Preferences } from '../../features/preferences/model';

const KEY = 'shader-tab:boot:v1';

export interface BootState {
  appearance: Preferences['appearance'];
  language: Language;
  /** Locale the language resolved to, so its message pack can load before the first render. */
  locale: Locale;
  /** Static background of the last shown variant, per theme. */
  background: Record<Theme, string>;
  /** Whether that background reads light or dark, per theme. */
  tone: Record<Theme, Tone>;
}

const isTheme = (value: unknown): value is Theme => value === 'day' || value === 'night';
const isTone = (value: unknown): value is Tone => value === 'light' || value === 'dark';

function readStorage(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function readBoot(): Partial<BootState> {
  let raw: unknown;
  try { raw = JSON.parse(readStorage() ?? 'null'); } catch { return {}; }
  if (!raw || typeof raw !== 'object') return {};
  const value = raw as Record<string, unknown>;
  const boot: Partial<BootState> = {};
  if (value.appearance === 'system' || isTheme(value.appearance)) boot.appearance = value.appearance;
  if (isLanguage(value.language)) boot.language = value.language;
  if (LOCALES.includes(value.locale as Locale)) boot.locale = value.locale as Locale;
  const background = value.background as Record<string, unknown> | undefined;
  if (typeof background?.day === 'string' && typeof background.night === 'string') {
    boot.background = { day: background.day, night: background.night };
  }
  const tone = value.tone as Record<string, unknown> | undefined;
  if (isTone(tone?.day) && isTone(tone.night)) boot.tone = { day: tone.day, night: tone.night };
  return boot;
}

let written = readStorage();
export function writeBoot(state: BootState) {
  const next = JSON.stringify(state);
  if (next === written) return;
  written = next;
  try { localStorage.setItem(KEY, next); } catch { /* Private storage may be unavailable; the cache is optional. */ }
}

export function systemTheme(): Theme {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
}

export function themeFor(appearance: Preferences['appearance'] | undefined): Theme {
  return appearance === 'day' || appearance === 'night' ? appearance : systemTheme();
}

export function defaultTone(theme: Theme): Tone {
  return theme === 'day' ? 'light' : 'dark';
}

/** Applies the cached theme, language, background and tone to the document root. */
export function applyBoot(boot: Partial<BootState>, locale: Locale) {
  const root = document.documentElement;
  const theme = themeFor(boot.appearance);
  root.dataset.theme = theme;
  root.dataset.tone = boot.tone?.[theme] ?? defaultTone(theme);
  root.lang = locale;
  const background = boot.background?.[theme];
  if (background) root.style.setProperty('--boot-background', background);
}
