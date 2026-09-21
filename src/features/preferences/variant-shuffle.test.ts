import { expect, it } from 'vitest';
import { EFFECT_VARIANTS } from '../../effects/variants';
import { EFFECT_IDS } from '../../effects/presets';
import { drawVariant } from './variant-shuffle';

it.each(EFFECT_IDS)('%s draws all variants per round without repeating at the boundary', effect => {
  const choices = EFFECT_VARIANTS[effect];
  for (const seed of [0, .33, .7, .999]) {
    let saved: unknown;
    const draws = Array.from({ length: choices.length * 4 }, () => {
      const draw = drawVariant(effect, saved, () => seed); saved = draw.state; return draw.variant;
    });
    for (let i = 0; i < draws.length; i += choices.length) expect(draws.slice(i, i + choices.length).toSorted()).toEqual([...choices].toSorted());
    for (let i = 1; i < draws.length; i++) expect(draws[i]).not.toBe(draws[i - 1]);
  }
});
it('recovers invalid storage and keeps unrelated families out of a shuffle bag', () => {
  for (const saved of [null, 'wave', { remaining: ['invalid', 'wave', 'wave', 2] }, { remaining: false }]) {
    const draw = drawVariant('grain-gradient', saved);
    expect(EFFECT_VARIANTS['grain-gradient']).toContain(draw.variant);
    expect(new Set(draw.state.remaining).size).toBe(draw.state.remaining.length);
  }
});
it('exposes every dithering shape and algorithm once', () => {
  const combinations = EFFECT_VARIANTS.dithering;
  expect(combinations).toHaveLength(28);
  expect(new Set(combinations).size).toBe(28);
  expect(new Set(combinations.map(value => value.split(':')[0])).size).toBe(7);
  expect(new Set(combinations.map(value => value.split(':')[1])).size).toBe(4);
});

it('discards retired CRT entries from an existing shuffle bag', () => {
  const draw = drawVariant('crt-terminal', { remaining: ['blue-screen', 'nintendo', 'cinematic'], last: 'terminal' });
  expect(draw.variant).toBe('cinematic');
  expect(draw.state.remaining).toEqual([]);
});
