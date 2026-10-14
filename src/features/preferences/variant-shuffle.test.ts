import { expect, it } from 'vitest';
import { variantIds } from '../../effects/variants';
import { EFFECT_IDS } from '../../effects/presets';
import { drawVariant, settleVariant } from './variant-shuffle';
import { readPreferences, PREFERENCE_PREFIX } from './model';

it.each(EFFECT_IDS)('%s draws all variants per round without repeating at the boundary', effect => {
  const choices = variantIds(effect);
  for (const seed of [0, 0.33, 0.7, 0.999]) {
    let saved: unknown;
    const draws = Array.from({ length: choices.length * 4 }, () => {
      const draw = drawVariant(effect, saved, () => seed);
      saved = draw.state;
      return draw.variant;
    });
    for (let i = 0; i < draws.length; i += choices.length) {
      expect(draws.slice(i, i + choices.length).toSorted()).toEqual([...choices].toSorted());
    }
    const repeats = draws.filter((variant, i) => i > 0 && variant === draws[i - 1]);
    expect(repeats).toHaveLength(choices.length > 1 ? 0 : draws.length - 1);
  }
});

it('recovers invalid storage and keeps unrelated families out of a shuffle bag', () => {
  for (const saved of [
    null,
    'blob',
    { remaining: ['invalid', 'blob', 'blob', 2] },
    { remaining: false },
  ]) {
    const draw = drawVariant('grain-gradient', saved);
    expect(variantIds('grain-gradient')).toContain(draw.variant);
    expect(new Set(draw.state.remaining).size).toBe(draw.state.remaining.length);
  }
});

it('keeps one 8x8 dithering variant per shape, plus the 4x4 Orb', () => {
  const ids = variantIds('dithering').filter(value => value !== 'sphere:4x4');
  expect(ids.every(value => value.endsWith(':8x8'))).toBe(true);
  expect(new Set(ids.map(value => value.split(':')[0])).size).toBe(6);
  expect(variantIds('dithering')).toContain('sphere:4x4');
});

it.each([
  ['dithering', 'ripple:4x4', 'ripple:8x8'],
  ['dithering', 'dots:8x8', 'swirl:8x8'],
  ['grain-gradient', 'truchet', 'blob'],
  ['shader-gradient', 'waterPlane', 'ocean'],
  ['data-pixel-arc', 'halftone-flow', 'ribbon-field'],
] as const)(
  'discards retired %s variants without losing the supported queue',
  (effect, retired, retained) => {
    const draw = drawVariant(effect, { remaining: [retired, retained] });
    expect(draw.variant).toBe(retained);
    expect(draw.state.remaining).toEqual([]);
  },
);

it('drops legacy Shader Gradient shapes and keeps the family selected', () => {
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

it.each(EFFECT_IDS)('%s: peeking then settling covers every variant per round', effect => {
  const choices = variantIds(effect);
  let saved: unknown;
  const shown: string[] = [];
  for (let i = 0; i < choices.length * 3; i++) {
    const { variant } = drawVariant(effect, saved);
    shown.push(variant);
    saved = settleVariant(effect, saved, variant);
  }
  for (let i = 0; i < shown.length; i += choices.length) {
    expect(shown.slice(i, i + choices.length).toSorted()).toEqual([...choices].toSorted());
  }
});

it('settles against a bag another tab already advanced', () => {
  // This tab peeked "circle"; another tab drew it first and left only "diamond".
  expect(
    settleVariant('pixel-blast', { remaining: ['diamond'], last: 'circle' }, 'circle'),
  ).toEqual({ remaining: ['diamond'], last: 'circle' });
  // The bag is used up: a new round starts without the variant on screen.
  const fresh = settleVariant('pixel-blast', { remaining: [], last: 'square' }, 'square');
  expect(fresh.remaining.toSorted()).toEqual(['circle', 'diamond', 'triangle']);
  expect(fresh.last).toBe('square');
});

it('leaves hidden variants out of the bag and of new rounds', () => {
  const ids = variantIds('dithering');
  const hidden = ids.slice(0, 2).map(id => `dithering/${id}`);
  let saved: unknown = { remaining: [...ids] };
  for (let i = 0; i < ids.length * 2; i++) {
    const draw = drawVariant('dithering', saved, Math.random, hidden);
    expect(ids.slice(0, 2)).not.toContain(draw.variant);
    saved = draw.state;
  }
  const state = settleVariant('dithering', undefined, ids[2]!, Math.random, hidden);
  expect(state.remaining).toHaveLength(ids.length - 3);
  expect(state.remaining.some(id => ids.slice(0, 2).includes(id))).toBe(false);
});
