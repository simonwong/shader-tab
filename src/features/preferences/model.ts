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
  /** Whether the first-run hint is still pending. Only a fresh install starts with it. */
  onboarding: boolean;
}
export const DEFAULT_PREFERENCES: Preferences = {
  language: 'auto', appearance: 'system', effects: [...EFFECT_IDS], activeEffect: 'grain-gradient', shuffle: true,
  bookmarkSort: 'chrome', showFavorites: true, showBookmarks: true, idleDelay: 2000, onboarding: false,
};
/** A preference update: a patch, or a function of the latest stored preferences. */
export type PreferenceUpdate = Partial<Preferences> | ((current: Preferences) => Partial<Preferences>);

export function readPreferences(data: Record<string, unknown>): Preferences {
  const get = (key: keyof Preferences) => data[PREFERENCE_PREFIX + key];
  const appearance = get('appearance');
  const effects = get('effects');
  const ids = Array.isArray(effects) ? [...new Set(effects.map(migrateEffect).filter((id): id is EffectId => id !== undefined))] : [];
  const activeEffect = get('activeEffect');
  const delay = get('idleDelay');
  const onboarding = get('onboarding');
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
    // Empty storage means a fresh install; anything stored means the extension was used before.
    // Fresh install: no saved preference or favorite yet. Shuffle-bag keys written on the first page don't count.
    onboarding: typeof onboarding === 'boolean' ? onboarding : Object.keys(data).every(key => !key.startsWith(PREFERENCE_PREFIX) && !key.startsWith('favorite')),
  };
}
/** Storage entries for a resolved preference patch. */
export function preferenceEntries(patch: Partial<Preferences>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(patch).map(([key, value]) => [PREFERENCE_PREFIX + key, value]));
}
/** Resolves an update against `current`, dropping fields that would not change. */
export function resolvePreferenceUpdate(current: Preferences, update: PreferenceUpdate): Partial<Preferences> {
  const patch = typeof update === 'function' ? update(current) : update;
  return Object.fromEntries(Object.entries(patch).filter(([key, value]) =>
    JSON.stringify(current[key as keyof Preferences]) !== JSON.stringify(value))) as Partial<Preferences>;
}
export function chooseEffect(preferences: Preferences, random: number): EffectId {
  if (!preferences.shuffle) return preferences.activeEffect;
  return preferences.effects[Math.min(preferences.effects.length - 1, Math.max(0, Math.floor(random * preferences.effects.length)))] ?? 'grain-gradient';
}
/** Toggles `id` in the shuffle pool; the last remaining effect stays selected. */
export function toggleEffect(effects: readonly EffectId[], id: EffectId): EffectId[] {
  if (!effects.includes(id)) return [...effects, id];
  return effects.length === 1 ? [...effects] : effects.filter(effect => effect !== id);
}
