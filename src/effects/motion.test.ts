import { expect, it } from 'vitest';
import { breathingTime } from './motion';
it('moves forward slowly without a jump at the breathing cycle boundary', () => {
  expect(breathingTime(0)).toBe(0);
  for (let t = 0.01; t <= 36; t += 0.01) {
    const speed = (breathingTime(t) - breathingTime(t - 0.01)) / 0.01;
    expect(speed).toBeGreaterThanOrEqual(0.079);
    expect(speed).toBeLessThanOrEqual(0.161);
  }
  expect(breathingTime(12)).toBeCloseTo(1.44);
  expect(breathingTime(24)).toBeCloseTo(2.88);
});
