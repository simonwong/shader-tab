import { describe, expect, it } from 'vitest';
import { createGlassField, glassNormal, glassProfile } from './glass-optics';
const shape = { width: 120, height: 60, radius: 30, bevel: 12 };
describe('glass optics', () => {
  it('keeps the center flat and limits refraction to the bevel', () => {
    expect(glassProfile(0, 12).shift).toBe(0);
    expect(glassProfile(12, 12).shift).toBe(0);
    expect(glassProfile(30, 12).shift).toBe(0);
    for (let depth = .1; depth < 12; depth += .1) {
      const sample = glassProfile(depth, 12);
      expect(sample.shift).toBeGreaterThanOrEqual(0);
      expect(sample.shift).toBeLessThan(4);
    }
  });
  it('uses symmetric outward normals on sides and rounded corners', () => {
    const left = glassNormal(5, 30, shape), right = glassNormal(115, 30, shape);
    expect(left.depth).toBe(right.depth); expect(left.nx).toBe(-right.nx);
    const topLeft = glassNormal(12, 12, shape), bottomRight = glassNormal(108, 48, shape);
    expect(topLeft.depth).toBeCloseTo(bottomRight.depth);
    expect(topLeft.nx).toBeCloseTo(-bottomRight.nx); expect(topLeft.ny).toBeCloseTo(-bottomRight.ny);
    expect(Math.hypot(topLeft.nx, topLeft.ny)).toBeCloseTo(1);
  });
  it('makes opposing edges bend in opposite directions without moving the center', () => {
    const field = createGlassField(120, 60, 30);
    const pixel = (x: number, y: number) => Array.from(field.displacement.slice((y * 120 + x) * 4, (y * 120 + x) * 4 + 4));
    expect(pixel(60, 30)).toEqual([128, 128, 0, 255]);
    expect(pixel(4, 30)[0]).toBeGreaterThan(128);
    expect(pixel(115, 30)[0]).toBeLessThan(128);
    expect(pixel(4, 30)[0]! + pixel(115, 30)[0]!).toBeCloseTo(255, 0);
  });
  it('bounds texture allocation and handles tiny or invalid geometry', () => {
    for (const [w, h, r] of [[8000, 900, 999], [1, 1, 999], [0, -1, 0], [NaN, Infinity, NaN]]) {
      const field = createGlassField(w!, h!, r!);
      expect(Math.max(field.width, field.height)).toBeLessThanOrEqual(768);
      expect(field.displacement.length).toBe(field.width * field.height * 4);
      expect(field.highlight.length).toBe(field.displacement.length);
    }
  });
});

it('lights the upper rim without adding a highlight over the flat center', () => {
  const field = createGlassField(120, 60, 30);
  const alpha = (x: number, y: number) => field.highlight[(y * 120 + x) * 4 + 3]!;
  expect(alpha(60, 1)).toBeGreaterThan(alpha(60, 58));
  expect(alpha(60, 30)).toBe(0);
  expect(alpha(0, 0)).toBe(0);
});
