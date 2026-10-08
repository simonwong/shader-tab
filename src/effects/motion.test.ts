import { expect, it } from 'vitest';
import { breathingTime } from './motion';
it('moves forward slowly without a jump at the breathing cycle boundary', () => {
  expect(breathingTime(0)).toBe(0);
  for (let t = .01; t <= 36; t += .01) {
    const speed = (breathingTime(t) - breathingTime(t - .01)) / .01;
    expect(speed).toBeGreaterThanOrEqual(.079);
    expect(speed).toBeLessThanOrEqual(.161);
  }
  expect(breathingTime(12)).toBeCloseTo(1.44);
  expect(breathingTime(24)).toBeCloseTo(2.88);
});
