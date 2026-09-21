import { isLanguage, type Language } from '../../i18n/core';
import { isBookmarkSort, type BookmarkSort } from '../bookmarks/sorting';
import { EFFECT_IDS, migrateEffect, type EffectId } from '../../effects/presets';
export const PREFERENCE_PREFIX = 'preference:v1:';
export interface Preferences {
  language: Language;
  appearance: 'system' | 'day' | 'night';
  effects: EffectId[];
  activeEffect: EffectId;
  shuffle: boolean;
  bookmarkSort: BookmarkSort;
  showFavorites: boolean;
  showBookmarks: boolean;
  idleDelay: 1000 | 2000 | 5000;
}
export const DEFAULT_PREFERENCES: Preferences = {
  language: 'auto', appearance: 'system', effects: [...EFFECT_IDS], activeEffect: 'grain-gradient', shuffle: true, bookmarkSort: 'chrome', showFavorites: true, showBookmarks: true, idleDelay: 2000,
};
export function readPreferences(data: Record<string, unknown>): Preferences {
  const get = (key: keyof Preferences) => data[PREFERENCE_PREFIX + key];
  const appearance = get('appearance');
  const effects = get('effects');
  const ids = Array.isArray(effects) ? [...new Set(effects.map(migrateEffect).filter((id): id is EffectId => id !== undefined))] : [];
  const activeEffect = get('activeEffect');
  const delay = get('idleDelay');
  return {
    language: isLanguage(get('language')) ? get('language') as Language : 'auto',
    appearance: appearance === 'day' || appearance === 'night' ? appearance : 'system',
    effects: ids.length ? ids : [...DEFAULT_PREFERENCES.effects],
    activeEffect: migrateEffect(activeEffect) ?? 'grain-gradient',
    shuffle: typeof get('shuffle') === 'boolean' ? get('shuffle') as boolean : true,
    bookmarkSort: isBookmarkSort(get('bookmarkSort')) ? get('bookmarkSort') as BookmarkSort : 'chrome',
    showFavorites: get('showFavorites') !== false,
    showBookmarks: get('showBookmarks') !== false,
    idleDelay: delay === 1000 || delay === 5000 ? delay : 2000,
  };
}
export function chooseEffect(preferences: Preferences, random: number): EffectId {
  if (!preferences.shuffle) return preferences.activeEffect;
  return preferences.effects[Math.min(preferences.effects.length - 1, Math.max(0, Math.floor(random * preferences.effects.length)))] ?? 'grain-gradient';
}
