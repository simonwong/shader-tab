import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createFrameLoop } from './frame-loop';
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('window', globalThis);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('keeps one low-rate clock and stops all work when paused', () => {
  const draw = vi.fn(); const loop = createFrameLoop(draw, 8);
  loop.start(); loop.start(); vi.advanceTimersByTime(1000);
  expect(draw.mock.calls.length).toBeGreaterThanOrEqual(7);
  expect(draw.mock.calls.length).toBeLessThanOrEqual(9);
  loop.stop(); const count = draw.mock.calls.length;
  vi.advanceTimersByTime(10000); expect(draw).toHaveBeenCalledTimes(count); expect(vi.getTimerCount()).toBe(0);
  loop.start(); vi.advanceTimersByTime(20); expect(draw).toHaveBeenCalledTimes(count + 1); loop.stop();
});
it('changing frame rate inside a draw never creates duplicate loops', () => {
  const draw = vi.fn(() => loop.setFps(8)); const loop = createFrameLoop(draw, 30);
  loop.start(); vi.advanceTimersByTime(2000);
  expect(draw.mock.calls.length).toBeLessThanOrEqual(17);
  expect(vi.getTimerCount()).toBe(1); loop.stop();
});

it('caps interactive work even when rAF timestamps lag the callback clock', () => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now() - 40), 16));
  const draw = vi.fn(); const loop = createFrameLoop(draw, 30);
  loop.start(); vi.advanceTimersByTime(1000);
  expect(draw.mock.calls.length).toBeLessThanOrEqual(30);
  expect(draw.mock.calls.length).toBeGreaterThan(15);
  loop.stop();
});
