import { expect, it } from 'vitest';
import { EFFECT_IDS, effectBackground, PAPER_PALETTES, paletteBackground } from './presets';
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
    'grain-gradient': ['corners', 'ripple', 'blob', 'sphere'],
    'shader-gradient': ['dusk', 'ocean', 'sage'],
    dithering: [
      'simplex:8x8',
      'warp:8x8',
      'wave:8x8',
      'ripple:8x8',
      'swirl:8x8',
      'sphere:8x8',
      'sphere:4x4',
    ],
    'fluted-glass': ['default', 'abstract', 'waves'],
    'pixel-blast': ['square', 'circle', 'triangle', 'diamond'],
    'data-pixel-arc': [
      'data-pixel',
      'predictive',
      'signal-particles',
      'override-grid',
      'ribbon-field',
      'void-field',
      'amber-halftone',
    ],
    'mesh-gradient': ['tide', 'orchard', 'mist'],
    warp: ['marble', 'silk', 'check'],
    'simplex-noise': ['contour'],
    'perlin-noise': ['fog'],
    'neuro-noise': ['filament', 'nebula'],
    'dot-orbit': ['drift'],
    'smoke-ring': ['halo'],
    'god-rays': ['dawn'],
    water: ['pool'],
  });
});

it('describes every variant completely for both themes', () => {
  for (const effect of EFFECT_IDS)
    for (const variant of EFFECT_VARIANTS[effect]) {
      expect(variant.label).not.toBe('');
      expect(variant.source).toMatch(/^https:\/\//);
      expect(typeof variant.load).toBe('function');
      expect(variant.density ?? 1).toBeGreaterThan(0);
      // Only soft gradients lower their density; pixel, dot and dither patterns keep the full budget.
      expect(variant.density === undefined).toBe(
        !['grain-gradient', 'shader-gradient', 'mesh-gradient', 'perlin-noise'].includes(effect),
      );
      for (const theme of ['day', 'night'] as const) {
        expect(variant.background(theme)).not.toBe('');
        expect(['light', 'dark']).toContain(variant.tone(theme));
      }
    }
});

it('marks backgrounds that stay dark in the day theme', () => {
  expect(resolveVariant('data-pixel-arc', 'void-field').tone('day')).toBe('dark');
  expect(resolveVariant('data-pixel-arc', 'ribbon-field').tone('day')).toBe('light');
  expect(resolveVariant('grain-gradient', 'blob').tone('night')).toBe('dark');
  expect(resolveVariant('dithering', 'ripple:8x8').tone('day')).toBe('dark');
  expect(resolveVariant('dithering', 'swirl:8x8').tone('day')).toBe('light');
});

it('links each Arc variant to its own reference page and labels it', () => {
  const variant = resolveVariant('data-pixel-arc', 'signal-particles');
  expect(variant.source).toBe('https://threeui.com/backgrounds/predictive-arc/signal-particles');
  expect(variant.label).toBe('Signal Particles');
  expect(resolveVariant('dithering', 'swirl:8x8').label).toBe('Swirl');
  expect(resolveVariant('dithering', 'sphere:4x4').label).toBe('Orb');
  expect(resolveVariant('fluted-glass', 'abstract').source).toBe(
    'https://shaders.paper.design/fluted-glass',
  );
});

it('falls back to the first variant for unknown or missing ids', () => {
  expect(getVariant('data-pixel-arc', 'halftone-flow')).toBeUndefined();
  expect(resolveVariant('data-pixel-arc', 'halftone-flow').id).toBe('data-pixel');
  expect(resolveVariant('dithering', 'swirl:4x4').id).toBe('simplex:8x8');
  expect(resolveVariant('grain-gradient', undefined).background('day')).toBe(
    effectBackground('grain-gradient', 'day'),
  );
});

it('paints each palette variant from its own colours, not the family colours', () => {
  const orchard = resolveVariant('mesh-gradient', 'orchard');
  expect(orchard.background('night')).toBe(
    paletteBackground(PAPER_PALETTES['mesh-gradient']!.orchard!.night),
  );
  expect(orchard.background('night')).not.toBe(
    resolveVariant('mesh-gradient', 'tide').background('night'),
  );
  expect(resolveVariant('god-rays', 'dawn').source).toBe('https://shaders.paper.design/god-rays');
  expect(resolveVariant('warp', 'silk').label).toBe('Silk');
});
