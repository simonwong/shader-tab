import { expect, it } from 'vitest';
import {
  canHideVariant,
  chooseEffect,
  DEFAULT_PREFERENCES,
  drawableVariants,
  REMOVED_EFFECTS_KEY,
  effectWeights,
  parseVariantKey,
  variantKey,
  PREFERENCE_PREFIX,
  preferenceEntries,
  readPreferences,
  resolvePreferenceUpdate,
  toggleEffect,
} from './model';
import { EFFECTS, EFFECT_IDS, FIRST_EFFECT_IDS, type EffectId } from '../../effects/presets';
import { variantIds } from '../../effects/variants';
const data = (values: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [PREFERENCE_PREFIX + key, value]),
  );
/** Families added after the first releases; pools saved without a known-effects list gain them. */
const LATER = EFFECT_IDS.filter(id => !FIRST_EFFECT_IDS.includes(id));
it('recovers invalid preferences without accepting an empty shader pool', () => {
  expect(
    readPreferences(
      data({
        appearance: 'invalid',
        effects: [],
        activeEffect: 'unknown',
        idleDelay: 0,
        shuffle: 'true',
      }),
    ),
  ).toEqual(DEFAULT_PREFERENCES);
});
it('deduplicates known effects and preserves valid appearance settings', () => {
  expect(
    readPreferences(
      data({
        appearance: 'night',
        effects: ['dithering', 'unknown', 'dithering', 'grain-gradient'],
        activeEffect: 'grain-gradient',
        idleDelay: 5000,
        shuffle: false,
      }),
    ),
  ).toEqual({
    language: 'auto',
    appearance: 'night',
    effects: ['dithering', 'grain-gradient', ...LATER],
    activeEffect: 'grain-gradient',
    idleDelay: 5000,
    shuffle: false,
    bookmarkSort: 'chrome',
    showFavorites: true,
    showBookmarks: true,
    favoritesLayout: 'tray',
    motion: 'soft',
    hiddenVariants: [],
    pinnedVariant: null,
    onboarding: false,
  });
});
it('chooses only enabled effects per opening and preserves a fixed selection', () => {
  const preferences = {
    ...DEFAULT_PREFERENCES,
    effects: ['data-pixel-arc', 'pixel-blast'] as const,
  };
  expect(chooseEffect({ ...preferences, effects: [...preferences.effects] }, 0)).toBe(
    'data-pixel-arc',
  );
  expect(chooseEffect({ ...preferences, effects: [...preferences.effects] }, 0.99)).toBe(
    'pixel-blast',
  );
  expect(
    chooseEffect({ ...DEFAULT_PREFERENCES, shuffle: false, activeEffect: 'dithering' }, 0.8),
  ).toBe('dithering');
});
it('has unique effects with complete day and night palettes', () => {
  expect(EFFECTS.map(effect => effect.id)).toEqual([...EFFECT_IDS]);
  for (const effect of EFFECTS)
    for (const color of [...effect.day, ...effect.night]) expect(color).toMatch(/^#[0-9a-f]{6}$/);
});

it('maps old effect selections while preserving fixed mode and deduplicating the pool', () => {
  expect(
    readPreferences(
      data({
        effects: ['mist', 'tide', 'ripple', 'paper', 'silk', 'ink', 'moss', 'glow'],
        activeEffect: 'silk',
        shuffle: false,
      }),
    ),
  ).toMatchObject({
    effects: ['pixel-blast', 'grain-gradient', 'dithering', 'data-pixel-arc', ...LATER],
    activeEffect: 'dithering',
    shuffle: false,
  });
  expect(
    readPreferences(data({ effects: ['constructor', '__proto__'], activeEffect: 'toString' })),
  ).toEqual(DEFAULT_PREFERENCES);
});
it('replaces retired backgrounds without changing the retained choices or fixed mode', () => {
  expect(
    readPreferences(
      data({
        effects: ['eclipse', 'ribbon', 'facet', 'contour', 'caustic'],
        activeEffect: 'caustic',
        shuffle: false,
      }),
    ),
  ).toMatchObject({
    effects: ['grain-gradient', 'dithering', 'data-pixel-arc', 'pixel-blast', ...LATER],
    activeEffect: 'pixel-blast',
    shuffle: false,
  });
});

it('adds families shipped after a pool was saved, but not ones the user took out', () => {
  // Saved by 0.6.0, before the removed list: every later family joins, a first family left out stays out.
  expect(readPreferences(data({ effects: ['dithering', 'grain-gradient'] })).effects).toEqual([
    'dithering',
    'grain-gradient',
    ...LATER,
  ]);
  // Saved with later families taken out: they stay out.
  expect(
    readPreferences(
      data({ effects: ['warp', 'dithering'], removedEffects: LATER.filter(id => id !== 'warp') }),
    ).effects,
  ).toEqual(['warp', 'dithering']);
  // A 0.6.0 tab saved its pool over a newer one: the list still says which later families were taken out.
  expect(
    readPreferences(data({ effects: ['grain-gradient'], removedEffects: ['dithering', 'water'] }))
      .effects,
  ).toEqual(['grain-gradient', ...LATER.filter(id => id !== 'water')]);
  // Names of families from later versions or junk entries change nothing.
  expect(
    readPreferences(data({ effects: [...EFFECT_IDS], removedEffects: ['future', 3, 'water'] }))
      .effects,
  ).toEqual([...EFFECT_IDS]);
  expect(readPreferences({}).effects).toEqual([...EFFECT_IDS]);
});

it('records the families left out with every pool write and only then', () => {
  const pool: EffectId[] = [...FIRST_EFFECT_IDS, 'warp'];
  expect(preferenceEntries({ effects: pool })).toEqual({
    [`${PREFERENCE_PREFIX}effects`]: pool,
    [REMOVED_EFFECTS_KEY]: LATER.filter(id => id !== 'warp'),
  });
  // Families a later version took out are kept, so they stay out when it reads the pool again.
  expect(
    preferenceEntries({ effects: [...EFFECT_IDS] }, data({ removedEffects: ['future', 'warp'] })),
  ).toEqual({
    [`${PREFERENCE_PREFIX}effects`]: [...EFFECT_IDS],
    [REMOVED_EFFECTS_KEY]: ['future'],
  });
  expect(preferenceEntries({ motion: 'still' })).toEqual({
    [`${PREFERENCE_PREFIX}motion`]: 'still',
  });
});

it('keeps the first families fixed', () => {
  expect(FIRST_EFFECT_IDS).toEqual(EFFECT_IDS.slice(0, 6));
});

it('defaults navigation entries to visible and preserves independent opt-outs', () => {
  expect(readPreferences({})).toMatchObject({ showFavorites: true, showBookmarks: true });
  expect(readPreferences(data({ showFavorites: false, showBookmarks: true }))).toMatchObject({
    showFavorites: false,
    showBookmarks: true,
  });
  expect(readPreferences(data({ showFavorites: true, showBookmarks: false }))).toMatchObject({
    showFavorites: true,
    showBookmarks: false,
  });
  expect(readPreferences(data({ showFavorites: false, showBookmarks: false }))).toMatchObject({
    showFavorites: false,
    showBookmarks: false,
  });
  expect(readPreferences(data({ showFavorites: 'false', showBookmarks: null }))).toMatchObject({
    showFavorites: true,
    showBookmarks: true,
  });
});

it('keeps existing installs on the favorites tray and drops unknown layouts', () => {
  expect(readPreferences({}).favoritesLayout).toBe('tray');
  expect(readPreferences({ 'favorites:v2': ['3'] }).favoritesLayout).toBe('tray');
  expect(readPreferences(data({ favoritesLayout: 'dock' })).favoritesLayout).toBe('dock');
  expect(readPreferences(data({ favoritesLayout: 'tray' })).favoritesLayout).toBe('tray');
  for (const value of ['grid', 'DOCK', true, null, 1])
    expect(readPreferences(data({ favoritesLayout: value })).favoritesLayout).toBe('tray');
  expect(preferenceEntries({ favoritesLayout: 'dock' })).toEqual({
    [`${PREFERENCE_PREFIX}favoritesLayout`]: 'dock',
  });
});

it('adds browser language to old preferences without resetting favorites or settings', () => {
  const original = {
    ...data({
      appearance: 'night',
      shuffle: false,
      activeEffect: 'dithering',
      bookmarkSort: 'recent',
      showFavorites: false,
      idleDelay: 5000,
    }),
    'favorites:v2': ['3', '1'],
  };
  const before = structuredClone(original);
  const legacy = readPreferences(original);
  expect(legacy).toMatchObject({
    language: 'auto',
    appearance: 'night',
    shuffle: false,
    activeEffect: 'dithering',
    bookmarkSort: 'recent',
    showFavorites: false,
    idleDelay: 5000,
  });
  expect(readPreferences({ ...original, ...data({ language: 'ja' }) })).toEqual({
    ...legacy,
    language: 'ja',
  });
  expect(readPreferences({ ...original, ...data({ language: 'invalid' }) })).toEqual(legacy);
  expect(original).toEqual(before);
  expect(chooseEffect({ ...legacy, language: 'en' }, 0.5)).toBe(chooseEffect(legacy, 0.5));
});

it('shows the first-run hint only for a fresh install until it is dismissed', () => {
  expect(readPreferences({}).onboarding).toBe(true);
  expect(readPreferences({ 'variant-bag:v1:dithering': ['a'] }).onboarding).toBe(true);
  expect(readPreferences({ 'favorite:v1:7': true }).onboarding).toBe(false);
  expect(readPreferences({ 'favorites:v2': [] }).onboarding).toBe(false);
  expect(readPreferences(data({ appearance: 'night' })).onboarding).toBe(false);
  expect(readPreferences(data({ onboarding: true, appearance: 'night' })).onboarding).toBe(true);
  expect(readPreferences(data({ onboarding: false })).onboarding).toBe(false);
});

it('resolves functional updates against the latest stored value and drops no-ops', () => {
  const stored = { ...DEFAULT_PREFERENCES, effects: ['dithering', 'data-pixel-arc'] as EffectId[] };
  // Two quick toggles built from the same stale props would lose one; functions see the latest value.
  const first = resolvePreferenceUpdate(stored, current => ({
    effects: toggleEffect(current.effects, 'pixel-blast'),
  }));
  const afterFirst = { ...stored, ...first };
  const second = resolvePreferenceUpdate(afterFirst, current => ({
    effects: toggleEffect(current.effects, 'grain-gradient'),
  }));
  expect({ ...afterFirst, ...second }.effects).toEqual([
    'dithering',
    'data-pixel-arc',
    'pixel-blast',
    'grain-gradient',
  ]);
  expect(resolvePreferenceUpdate(stored, { appearance: 'system', idleDelay: 5000 })).toEqual({
    idleDelay: 5000,
  });
  expect(preferenceEntries({ idleDelay: 5000 })).toEqual({
    [PREFERENCE_PREFIX + 'idleDelay']: 5000,
  });
});

it('keeps the last shuffled effect selected', () => {
  expect(toggleEffect(['dithering'], 'dithering')).toEqual(['dithering']);
  expect(toggleEffect(['dithering', 'data-pixel-arc'], 'dithering')).toEqual(['data-pixel-arc']);
});

it('moves retired CRT selections to the closest remaining family', () => {
  const preferences = readPreferences(
    data({
      effects: ['crt-terminal', 'shader-gradient', 'grain-gradient'],
      activeEffect: 'crt-terminal',
    }),
  );
  expect(preferences.effects).toEqual([
    'data-pixel-arc',
    'shader-gradient',
    'grain-gradient',
    ...LATER,
  ]);
  expect(preferences.activeEffect).toBe('data-pixel-arc');
});

it('reads motion, hidden and pinned variants, dropping unknown keys', () => {
  const [first, second] = variantIds('dithering');
  expect(
    readPreferences(
      data({
        motion: 'lively',
        hiddenVariants: [
          variantKey('dithering', first!),
          variantKey('dithering', first!),
          'dithering/retired',
          'unknown/x',
          42,
        ],
        pinnedVariant: variantKey('dithering', second!),
      }),
    ),
  ).toMatchObject({
    motion: 'lively',
    hiddenVariants: [variantKey('dithering', first!)],
    pinnedVariant: variantKey('dithering', second!),
  });
  expect(
    readPreferences(data({ motion: 'fast', hiddenVariants: 'x', pinnedVariant: 'dithering' })),
  ).toMatchObject({ motion: 'soft', hiddenVariants: [], pinnedVariant: null });
  expect(parseVariantKey(variantKey('dithering', second!))).toEqual({
    effect: 'dithering',
    variant: second,
  });
  expect(parseVariantKey('/dithering')).toBeUndefined();
});

it('leaves hidden variants out of draws until every one is hidden', () => {
  const ids = variantIds('fluted-glass');
  const hidden = ids.slice(1).map(id => variantKey('fluted-glass', id));
  expect(drawableVariants('fluted-glass', hidden)).toEqual([ids[0]]);
  expect(
    drawableVariants('fluted-glass', [...hidden, variantKey('fluted-glass', ids[0]!)]),
  ).toEqual(ids);
});

it('weights effects by the square root of their visible variants', () => {
  const weights = effectWeights(DEFAULT_PREFERENCES);
  for (const { effect, weight } of weights)
    expect(weight).toBeCloseTo(Math.sqrt(variantIds(effect).length));
  const allFluted = variantIds('fluted-glass').map(id => variantKey('fluted-glass', id));
  const preferences = { ...DEFAULT_PREFERENCES, hiddenVariants: allFluted };
  expect(effectWeights(preferences).find(entry => entry.effect === 'fluted-glass')?.weight).toBe(0);
  for (let random = 0; random < 1; random += 0.01)
    expect(chooseEffect(preferences, random)).not.toBe('fluted-glass');
  // A pool of only hidden variants ignores the hidden list.
  const fixed = { ...preferences, shuffle: false, activeEffect: 'fluted-glass' as const };
  expect(effectWeights(fixed)).toEqual([{ effect: 'fluted-glass', weight: 1 }]);
  expect(chooseEffect(fixed, 0.5)).toBe('fluted-glass');
});

it('refuses to hide the last visible variant of the pool', () => {
  const ids = variantIds('fluted-glass');
  const fixed = {
    ...DEFAULT_PREFERENCES,
    shuffle: false,
    activeEffect: 'fluted-glass' as const,
    hiddenVariants: ids.slice(1).map(id => variantKey('fluted-glass', id)),
  };
  expect(canHideVariant(fixed, variantKey('fluted-glass', ids[0]!))).toBe(false);
  expect(canHideVariant({ ...fixed, shuffle: true }, variantKey('fluted-glass', ids[0]!))).toBe(
    true,
  );
});
