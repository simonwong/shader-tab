import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createFrameLoop } from './frame-loop';

const VSYNC = 1000 / 60;
let rafCalls = 0;
/** Fires rAF callbacks on the next vsync boundary (60 Hz by default), like a real display. */
const vsyncRaf = (lag = 0, vsync = VSYNC) => (callback: FrameRequestCallback) => {
  rafCalls++;
  const now = performance.now();
  const next = Math.floor(now / vsync + 1) * vsync;
  return setTimeout(() => callback(next - lag), Math.max(0, next - now));
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('requestAnimationFrame', vsyncRaf());
  vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
  rafCalls = 0;
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it.each([[20, 20], [30, 30], [15, 15], [10, 10], [5, 5]])('draws %i fps on a 60 Hz display without losing a vsync per frame', (fps, expected) => {
  const draw = vi.fn<(time: number) => void>();
  const loop = createFrameLoop(draw, fps);
  loop.start();
  vi.advanceTimersByTime(1000); // warm-up
  const before = draw.mock.calls.length;
  vi.advanceTimersByTime(5000);
  const rate = (draw.mock.calls.length - before) / 5;
  expect(rate).toBeGreaterThanOrEqual(expected - .4);
  expect(rate).toBeLessThanOrEqual(expected + .2);
  loop.stop();
});

it.each([120, 144])('averages 20 fps on a %i Hz display', hz => {
  vi.stubGlobal('requestAnimationFrame', vsyncRaf(0, 1000 / hz));
  const draw = vi.fn<(time: number) => void>();
  const loop = createFrameLoop(draw, 20);
  loop.start();
  vi.advanceTimersByTime(1000);
  const before = draw.mock.calls.length;
  vi.advanceTimersByTime(5000);
  expect((draw.mock.calls.length - before) / 5).toBeCloseTo(20, 0);
  loop.stop();
});

it('keeps an even cadence on whole vsyncs', () => {
  const times: number[] = [];
  const loop = createFrameLoop(time => times.push(time), 20);
  loop.start();
  vi.advanceTimersByTime(2000);
  loop.stop();
  const gaps = times.slice(1).map((time, index) => time - times[index]!);
  for (const gap of gaps) expect(gap).toBeCloseTo(VSYNC * 3, 3);
});

it('sleeps on a timer at low rates instead of waking every vsync', () => {
  const draw = vi.fn<(time: number) => void>();
  const loop = createFrameLoop(draw, 5);
  loop.start();
  vi.advanceTimersByTime(2000);
  loop.stop();
  expect(draw.mock.calls.length).toBeGreaterThanOrEqual(9);
  // ~3 rAF callbacks per drawn frame (timer wakes ~25 ms early), not 12.
  expect(rafCalls).toBeLessThanOrEqual(draw.mock.calls.length * 3);
});

it('keeps one clock and stops all work when paused', () => {
  const draw = vi.fn<(time: number) => void>();
  const loop = createFrameLoop(draw, 8);
  loop.start(); loop.start();
  vi.advanceTimersByTime(1000);
  expect(draw.mock.calls.length).toBeGreaterThanOrEqual(7);
  expect(draw.mock.calls.length).toBeLessThanOrEqual(9);
  loop.stop();
  const count = draw.mock.calls.length;
  vi.advanceTimersByTime(10000);
  expect(draw).toHaveBeenCalledTimes(count);
  expect(vi.getTimerCount()).toBe(0);
  loop.start();
  vi.advanceTimersByTime(20);
  expect(draw).toHaveBeenCalledTimes(count + 1);
  loop.stop();
});

it('changing frame rate inside a draw never creates duplicate loops', () => {
  const draw = vi.fn<(time: number) => void>(() => loop.setFps(8));
  const loop = createFrameLoop(draw, 30);
  loop.start();
  vi.advanceTimersByTime(2000);
  expect(draw.mock.calls.length).toBeLessThanOrEqual(17);
  expect(vi.getTimerCount()).toBe(1);
  loop.stop();
});

it('caps work even when rAF timestamps lag the callback clock', () => {
  vi.stubGlobal('requestAnimationFrame', vsyncRaf(40));
  const draw = vi.fn<(time: number) => void>();
  const loop = createFrameLoop(draw, 30);
  loop.start();
  vi.advanceTimersByTime(1000);
  expect(draw.mock.calls.length).toBeLessThanOrEqual(31);
  expect(draw.mock.calls.length).toBeGreaterThan(25);
  loop.stop();
});

it('holds the frame at 0 fps and resumes immediately when a rate returns', () => {
  const draw = vi.fn<(time: number) => void>();
  const loop = createFrameLoop(draw, 20);
  loop.start();
  vi.advanceTimersByTime(500);
  loop.setFps(0);
  const held = draw.mock.calls.length;
  vi.advanceTimersByTime(60_000);
  expect(draw).toHaveBeenCalledTimes(held);
  expect(vi.getTimerCount()).toBe(0);
  loop.setFps(20);
  vi.advanceTimersByTime(VSYNC + 1);
  expect(draw).toHaveBeenCalledTimes(held + 1);
  loop.stop();
});

it('raising the rate during a long low-rate sleep takes effect on the next vsync', () => {
  const draw = vi.fn<(time: number) => void>();
  const loop = createFrameLoop(draw, 5);
  loop.start();
  vi.advanceTimersByTime(VSYNC + 1);
  const count = draw.mock.calls.length;
  vi.advanceTimersByTime(60); // part-way into the 200 ms slot
  loop.setFps(20);
  vi.advanceTimersByTime(VSYNC + 1);
  expect(draw).toHaveBeenCalledTimes(count + 1);
  loop.stop();
});
