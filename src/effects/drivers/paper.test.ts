import { expect, it } from 'vitest';
import { PAPER_PALETTES } from '../presets';
import { PAPER_SHADERS } from './paper';

it('gives every Paper family with its own palettes a shader', () => {
  const missing = Object.keys(PAPER_PALETTES).filter(effect => !(effect in PAPER_SHADERS));
  expect(missing).toEqual([]);
});
