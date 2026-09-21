import { expect, it } from 'vitest';
import { chooseEffect, DEFAULT_PREFERENCES, PREFERENCE_PREFIX, readPreferences } from './model';
import { EFFECTS, EFFECT_IDS } from '../../effects/presets';
const data = (values: Record<string, unknown>) => Object.fromEntries(Object.entries(values).map(([key, value]) => [PREFERENCE_PREFIX + key, value]));
it('recovers invalid preferences without accepting an empty shader pool', () => {
  expect(readPreferences(data({ appearance: 'invalid', effects: [], activeEffect: 'unknown', idleDelay: 0, shuffle: 'true' }))).toEqual(DEFAULT_PREFERENCES);
});
it('deduplicates known effects and preserves valid appearance settings', () => {
  expect(readPreferences(data({ appearance: 'night', effects: ['dithering', 'unknown', 'dithering', 'grain-gradient'], activeEffect: 'grain-gradient', idleDelay: 5000, shuffle: false }))).toEqual({ language: 'auto', appearance: 'night', effects: ['dithering', 'grain-gradient'], activeEffect: 'grain-gradient', idleDelay: 5000, shuffle: false, bookmarkSort: 'chrome', showFavorites: true, showBookmarks: true });
});
it('chooses only enabled effects per opening and preserves a fixed selection', () => {
  const preferences = { ...DEFAULT_PREFERENCES, effects: ['data-pixel-arc', 'pixel-blast'] as const };
  expect(chooseEffect({ ...preferences, effects: [...preferences.effects] }, 0)).toBe('data-pixel-arc');
  expect(chooseEffect({ ...preferences, effects: [...preferences.effects] }, .99)).toBe('pixel-blast');
  expect(chooseEffect({ ...DEFAULT_PREFERENCES, shuffle: false, activeEffect: 'dithering' }, .8)).toBe('dithering');
});
it('has six unique effects with complete day and night palettes', () => {
  expect(EFFECTS.map((effect) => effect.id)).toEqual([...EFFECT_IDS]);
  for (const effect of EFFECTS) for (const color of [...effect.day, ...effect.night]) expect(color).toMatch(/^#[0-9a-f]{6}$/);
});

it('maps old effect selections while preserving fixed mode and deduplicating the pool', () => {
  expect(readPreferences(data({ effects: ['mist', 'tide', 'ripple', 'paper', 'silk', 'ink', 'moss', 'glow'], activeEffect: 'silk', shuffle: false }))).toMatchObject({ effects: ['pixel-blast', 'grain-gradient', 'dithering', 'data-pixel-arc'], activeEffect: 'dithering', shuffle: false });
  expect(readPreferences(data({ effects: ['constructor', '__proto__'], activeEffect: 'toString' }))).toEqual(DEFAULT_PREFERENCES);
});
it('replaces retired backgrounds without changing the retained choices or fixed mode', () => {
  expect(readPreferences(data({ effects: ['eclipse', 'ribbon', 'facet', 'contour', 'caustic'], activeEffect: 'caustic', shuffle: false }))).toMatchObject({ effects: ['grain-gradient', 'dithering', 'data-pixel-arc', 'pixel-blast'], activeEffect: 'pixel-blast', shuffle: false });
});

it('defaults navigation entries to visible and preserves independent opt-outs', () => {
  expect(readPreferences({})).toMatchObject({ showFavorites: true, showBookmarks: true });
  expect(readPreferences(data({ showFavorites: false, showBookmarks: true }))).toMatchObject({ showFavorites: false, showBookmarks: true });
  expect(readPreferences(data({ showFavorites: true, showBookmarks: false }))).toMatchObject({ showFavorites: true, showBookmarks: false });
  expect(readPreferences(data({ showFavorites: false, showBookmarks: false }))).toMatchObject({ showFavorites: false, showBookmarks: false });
  expect(readPreferences(data({ showFavorites: 'false', showBookmarks: null }))).toMatchObject({ showFavorites: true, showBookmarks: true });
});

it('adds browser language to old preferences without resetting favorites or settings', () => {
  const original = { ...data({ appearance: 'night', shuffle: false, activeEffect: 'crt-terminal', bookmarkSort: 'recent', showFavorites: false, idleDelay: 5000 }), 'favorites:v2': ['3', '1'] };
  const before = structuredClone(original);
  const legacy = readPreferences(original);
  expect(legacy).toMatchObject({ language: 'auto', appearance: 'night', shuffle: false, activeEffect: 'crt-terminal', bookmarkSort: 'recent', showFavorites: false, idleDelay: 5000 });
  expect(readPreferences({ ...original, ...data({ language: 'ja' }) })).toEqual({ ...legacy, language: 'ja' });
  expect(readPreferences({ ...original, ...data({ language: 'invalid' }) })).toEqual(legacy);
  expect(original).toEqual(before);
  expect(chooseEffect({ ...legacy, language: 'en' }, .5)).toBe(chooseEffect(legacy, .5));
});
