import { expect, it } from 'vitest';
import { drawShaderShape } from './shader-shuffle';
import { readPreferences, PREFERENCE_PREFIX } from './model';
it('draws every shape once per round and avoids repeat across rounds', () => {
  for (const seed of [0, .25, .5, .999]) {
    let state: unknown;
    const shapes = Array.from({ length: 30 }, () => {
      const draw = drawShaderShape(state, () => seed);
      state = draw.state;
      return draw.shape;
    });
    for (let index = 0; index < shapes.length; index += 3) expect(new Set(shapes.slice(index, index + 3)).size).toBe(3);
    for (let index = 1; index < shapes.length; index++) expect(shapes[index]).not.toBe(shapes[index - 1]);
  }
});
it('recovers malformed saved shuffle data', () => {
  for (const value of [null, 1, 'sphere', { remaining: ['invalid'] }, { remaining: null }]) expect(['plane', 'sphere', 'waterPlane']).toContain(drawShaderShape(value).shape);
});
it('ignores legacy fixed shapes without changing the selected family', () => {
  for (const shape of ['plane', 'sphere', 'waterPlane', 'random']) {
    const preferences = readPreferences({ [PREFERENCE_PREFIX + 'shaderGradientShape']: shape, [PREFERENCE_PREFIX + 'activeEffect']: 'shader-gradient', [PREFERENCE_PREFIX + 'shuffle']: false });
    expect(preferences).not.toHaveProperty('shaderGradientShape');
    expect(preferences.activeEffect).toBe('shader-gradient');
    expect(preferences.shuffle).toBe(false);
  }
});
