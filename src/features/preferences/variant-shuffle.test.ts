import { expect, it } from 'vitest';
import { variantIds } from '../../effects/variants';
import { EFFECT_IDS } from '../../effects/presets';
import { drawStoredVariant, drawVariant, LEGACY_SHUFFLE_KEYS, settleVariant, variantShuffleKey } from './variant-shuffle';
import { readPreferences, PREFERENCE_PREFIX } from './model';

it.each(EFFECT_IDS)('%s draws all variants per round without repeating at the boundary', effect => {
  const choices = variantIds(effect);
  for (const seed of [0, .33, .7, .999]) {
    let saved: unknown;
    const draws = Array.from({ length: choices.length * 4 }, () => {
      const draw = drawVariant(effect, saved, () => seed);
      saved = draw.state;
      return draw.variant;
    });
    for (let i = 0; i < draws.length; i += choices.length) {
      expect(draws.slice(i, i + choices.length).toSorted()).toEqual([...choices].toSorted());
    }
    if (choices.length > 1) for (let i = 1; i < draws.length; i++) expect(draws[i]).not.toBe(draws[i - 1]);
  }
});

it('recovers invalid storage and keeps unrelated families out of a shuffle bag', () => {
  for (const saved of [null, 'wave', { remaining: ['invalid', 'wave', 'wave', 2] }, { remaining: false }]) {
    const draw = drawVariant('grain-gradient', saved);
    expect(variantIds('grain-gradient')).toContain(draw.variant);
    expect(new Set(draw.state.remaining).size).toBe(draw.state.remaining.length);
  }
});

it('keeps every dithering shape and algorithm with the supported combinations', () => {
  const combinations = variantIds('dithering');
  expect(combinations).toHaveLength(27);
  expect(new Set(combinations).size).toBe(27);
  expect(new Set(combinations.map(value => value.split(':')[0])).size).toBe(7);
  expect(new Set(combinations.map(value => value.split(':')[1])).size).toBe(4);
});

it('discards retired CRT entries from an existing shuffle bag', () => {
  const draw = drawVariant('crt-terminal', { remaining: ['blue-screen', 'nintendo', 'cinematic', 'retro-game'], last: 'terminal' });
  expect(draw.variant).toBe('terminal');
  expect(draw.state.remaining).toEqual([]);
});

it.each([
  ['dithering', 'ripple:4x4', 'ripple:8x8'],
  ['data-pixel-arc', 'halftone-flow', 'ribbon-field'],
] as const)('discards retired %s variants without losing the supported queue', (effect, retired, retained) => {
  const draw = drawVariant(effect, { remaining: [retired, retained] });
  expect(draw.variant).toBe(retained);
  expect(draw.state.remaining).toEqual([]);
});

it('draws Shader Gradient shapes as ordinary variants', () => {
  expect(variantIds('shader-gradient')).toEqual(['plane', 'sphere', 'waterPlane']);
  for (const value of [null, 1, 'sphere', { remaining: ['invalid'] }, { remaining: null }]) {
    expect(variantIds('shader-gradient')).toContain(drawVariant('shader-gradient', value).variant);
  }
});

it('ignores legacy fixed shapes without changing the selected family', () => {
  for (const shape of ['plane', 'sphere', 'waterPlane', 'random']) {
    const preferences = readPreferences({
      [PREFERENCE_PREFIX + 'shaderGradientShape']: shape,
      [PREFERENCE_PREFIX + 'activeEffect']: 'shader-gradient',
      [PREFERENCE_PREFIX + 'shuffle']: false,
    });
    expect(preferences).not.toHaveProperty('shaderGradientShape');
    expect(preferences.activeEffect).toBe('shader-gradient');
    expect(preferences.shuffle).toBe(false);
  }
});

const LEGACY = LEGACY_SHUFFLE_KEYS['shader-gradient']!;
const KEY = variantShuffleKey('shader-gradient');

it('continues a legacy Shader Gradient queue and removes the old key', () => {
  const draw = drawStoredVariant('shader-gradient', { [LEGACY]: { remaining: ['waterPlane', 'plane'], last: 'sphere' } });
  expect(LEGACY).toBe('shader-gradient:shuffle:v1');
  expect(draw.variant).toBe('waterPlane');
  expect(draw.set).toEqual({ [KEY]: { remaining: ['plane'], last: 'waterPlane' } });
  expect(draw.remove).toEqual([LEGACY]);
});

it('starts a fresh round from a used-up legacy queue without repeating its last shape', () => {
  const draw = drawStoredVariant('shader-gradient', { [LEGACY]: { remaining: [], last: 'plane' } }, () => 0);
  expect(draw.variant).not.toBe('plane');
  expect(draw.set[KEY]!.remaining).toHaveLength(2);
  expect(draw.remove).toEqual([LEGACY]);
});

it('prefers the current bag over a leftover legacy bag but still removes the legacy key', () => {
  const draw = drawStoredVariant('shader-gradient', {
    [KEY]: { remaining: ['sphere'], last: 'plane' },
    [LEGACY]: { remaining: ['waterPlane'], last: 'plane' },
  });
  expect(draw.variant).toBe('sphere');
  expect(draw.remove).toEqual([LEGACY]);
});

it('drops malformed legacy data safely', () => {
  for (const legacy of [null, 'sphere', 3, { remaining: ['invalid', 7] }]) {
    const draw = drawStoredVariant('shader-gradient', { [LEGACY]: legacy });
    expect(variantIds('shader-gradient')).toContain(draw.variant);
    expect(draw.remove).toEqual([LEGACY]);
  }
});

it.each(EFFECT_IDS)('%s: peeking then settling covers every variant per round', effect => {
  const choices = variantIds(effect);
  let items: Record<string, unknown> = {};
  const shown: string[] = [];
  for (let i = 0; i < choices.length * 3; i++) {
    const { variant } = drawStoredVariant(effect, items);
    shown.push(variant);
    items = { ...items, ...settleVariant(effect, items, variant).set };
  }
  for (let i = 0; i < shown.length; i += choices.length) {
    expect(shown.slice(i, i + choices.length).toSorted()).toEqual([...choices].toSorted());
  }
});

it('settles against a bag another tab already advanced', () => {
  const key = variantShuffleKey('pixel-blast');
  // This tab peeked "circle"; another tab drew it first and left only "diamond".
  expect(settleVariant('pixel-blast', { [key]: { remaining: ['diamond'], last: 'circle' } }, 'circle').set[key])
    .toEqual({ remaining: ['diamond'], last: 'circle' });
  // The bag is used up: a new round starts without the variant on screen.
  const fresh = settleVariant('pixel-blast', { [key]: { remaining: [], last: 'square' } }, 'square').set[key]!;
  expect(fresh.remaining.toSorted()).toEqual(['circle', 'diamond', 'triangle']);
  expect(fresh.last).toBe('square');
});

it('moves a legacy Shader Gradient bag when settling', () => {
  const legacy = LEGACY_SHUFFLE_KEYS['shader-gradient']!;
  const draw = settleVariant('shader-gradient', { [legacy]: { remaining: ['waterPlane', 'plane'], last: 'sphere' } }, 'waterPlane');
  expect(draw.set).toEqual({ [variantShuffleKey('shader-gradient')]: { remaining: ['plane'], last: 'waterPlane' } });
  expect(draw.remove).toEqual([legacy]);
});

it('leaves storage alone for effects without a legacy bag', () => {
  const draw = drawStoredVariant('pixel-blast', { [LEGACY]: { remaining: ['plane'] } });
  expect(variantIds('pixel-blast')).toContain(draw.variant);
  expect(Object.keys(draw.set)).toEqual([variantShuffleKey('pixel-blast')]);
  expect(draw.remove).toEqual([]);
});
