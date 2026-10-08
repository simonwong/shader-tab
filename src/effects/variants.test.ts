import { expect, it } from 'vitest';
import { EFFECT_IDS, effectBackground } from './presets';
import { EFFECT_VARIANTS, getVariant, resolveVariant, variantIdsByEffect } from './variants';

it('registers every effect with unique, non-empty variant ids', () => {
  expect(Object.keys(EFFECT_VARIANTS).toSorted()).toEqual([...EFFECT_IDS].toSorted());
  for (const effect of EFFECT_IDS) {
    const ids = EFFECT_VARIANTS[effect].map(variant => variant.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const variant of EFFECT_VARIANTS[effect]) expect(variant.effect).toBe(effect);
  }
});

it('keeps the live variant set', () => {
  expect(variantIdsByEffect()).toMatchObject({
    'grain-gradient': ['wave', 'dots', 'truchet', 'corners', 'ripple', 'blob', 'sphere'],
    'pixel-blast': ['square', 'circle', 'triangle', 'diamond'],
    'data-pixel-arc': ['data-pixel', 'predictive', 'signal-particles', 'override-grid', 'ribbon-field', 'void-field', 'amber-halftone'],
    'crt-terminal': ['terminal'],
    'shader-gradient': ['plane', 'sphere', 'waterPlane'],
  });
  expect(variantIdsByEffect().dithering).toHaveLength(27);
});

it('describes every variant completely for both themes', () => {
  for (const effect of EFFECT_IDS) for (const variant of EFFECT_VARIANTS[effect]) {
    expect(variant.label).not.toBe('');
    expect(variant.source).toMatch(/^https:\/\//);
    expect(typeof variant.load).toBe('function');
    if (variant.density !== undefined) expect(variant.density).toBeGreaterThan(0);
    // Only soft variants lower their density; pixel, dot and dither patterns keep the full budget.
    expect(variant.density === undefined).toBe(effect !== 'grain-gradient');
    for (const theme of ['day', 'night'] as const) {
      expect(variant.background(theme)).not.toBe('');
      expect(['light', 'dark']).toContain(variant.tone(theme));
    }
  }
});

it('marks backgrounds that stay dark in the day theme', () => {
  expect(resolveVariant('crt-terminal', 'terminal').tone('day')).toBe('dark');
  expect(resolveVariant('data-pixel-arc', 'void-field').tone('day')).toBe('dark');
  expect(resolveVariant('data-pixel-arc', 'ribbon-field').tone('day')).toBe('light');
  expect(resolveVariant('grain-gradient', 'wave').tone('night')).toBe('dark');
  expect(resolveVariant('dithering', 'ripple:8x8').tone('day')).toBe('dark');
  expect(resolveVariant('dithering', 'swirl:4x4').tone('day')).toBe('light');
  expect(resolveVariant('shader-gradient', 'waterPlane').tone('night')).toBe('light');
});

it('links each Arc variant to its own reference page and labels it', () => {
  const variant = resolveVariant('data-pixel-arc', 'signal-particles');
  expect(variant.source).toBe('https://threeui.com/backgrounds/predictive-arc/signal-particles');
  expect(variant.label).toBe('Signal Particles');
  expect(resolveVariant('dithering', 'swirl:4x4').label).toBe('Swirl · 4x4');
  expect(resolveVariant('shader-gradient', 'waterPlane').label).toBe('Water');
});

it('falls back to the first variant for unknown or missing ids', () => {
  expect(getVariant('data-pixel-arc', 'halftone-flow')).toBeUndefined();
  expect(resolveVariant('data-pixel-arc', 'halftone-flow').id).toBe('data-pixel');
  expect(resolveVariant('shader-gradient', undefined).id).toBe('plane');
  expect(resolveVariant('grain-gradient', undefined).background('day')).toBe(effectBackground('grain-gradient', 'day'));
});
