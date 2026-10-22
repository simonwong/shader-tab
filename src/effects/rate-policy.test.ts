import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BATTERY_DENSITY,
  IDLE_FREEZE_MS,
  IDLE_SLOW_MS,
  MOTION_RATES,
  POINTER_BURST_MS,
  RATES,
  UNFOCUSED_GRACE_MS,
  WATCH_SLOW_WINDOWS,
  WATCH_WARMUP_MS,
  WATCH_WINDOW_MS,
  createRateMonitor,
  createRateWatch,
  planRate,
  type RateConditions,
  type RatePlan,
  type RateWatch,
} from './rate-policy';

const awake: RateConditions = {
  idleMs: 0,
  unfocusedMs: 0,
  onBattery: false,
  dialogOpen: false,
  pointerActive: false,
  motion: 'soft',
};
const fps = (patch: Partial<RateConditions>) => planRate({ ...awake, ...patch }).fps;

describe('planRate', () => {
  it('sets the base rate by motion level', () => {
    expect(fps({ motion: 'still' })).toBe(MOTION_RATES.still);
    expect(fps({ motion: 'soft' })).toBe(RATES.base);
    expect(fps({ motion: 'lively' })).toBe(MOTION_RATES.lively);
    expect(fps({ motion: 'lively', dialogOpen: true })).toBe(RATES.dialog);
  });

  it('runs at the base rate and bursts only for pointer-reactive movement', () => {
    expect(fps({})).toBe(RATES.base);
    expect(fps({ pointerActive: true })).toBe(RATES.pointer);
  });

  it('slows down when idle and holds the frame after a long idle', () => {
    expect(fps({ idleMs: IDLE_SLOW_MS - 1 })).toBe(RATES.base);
    expect(fps({ idleMs: IDLE_SLOW_MS })).toBe(RATES.idle);
    expect(fps({ idleMs: IDLE_FREEZE_MS })).toBe(0);
    expect(fps({ idleMs: IDLE_FREEZE_MS, dialogOpen: true, onBattery: true })).toBe(0);
  });

  it('slows an unfocused window only after the grace period', () => {
    expect(fps({ unfocusedMs: UNFOCUSED_GRACE_MS - 1 })).toBe(RATES.base);
    expect(fps({ unfocusedMs: UNFOCUSED_GRACE_MS })).toBe(RATES.unfocused);
  });

  it('caps rate and density on battery, and caps the rate under the settings dialog', () => {
    expect(planRate({ ...awake, onBattery: true })).toEqual({
      fps: RATES.battery,
      densityCap: BATTERY_DENSITY,
    });
    expect(planRate({ ...awake, onBattery: true, pointerActive: true }).fps).toBe(RATES.battery);
    expect(planRate(awake).densityCap).toBeUndefined();
    expect(fps({ dialogOpen: true, pointerActive: true })).toBe(RATES.dialog);
  });

  it('takes the lowest applicable cap', () => {
    expect(fps({ onBattery: true, unfocusedMs: UNFOCUSED_GRACE_MS })).toBe(RATES.unfocused);
    expect(fps({ dialogOpen: true, idleMs: IDLE_SLOW_MS })).toBe(RATES.idle);
  });
});

describe('createRateMonitor', () => {
  let win: EventTarget & { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout };
  let doc: EventTarget & { hidden: boolean; hasFocus: () => boolean };
  let battery: EventTarget & { charging: boolean };
  let focused: boolean;

  beforeEach(() => {
    vi.useFakeTimers();
    focused = true;
    win = Object.assign(new EventTarget(), {
      setTimeout: ((...args: Parameters<typeof setTimeout>) =>
        setTimeout(...args)) as typeof setTimeout,
      clearTimeout: ((id: ReturnType<typeof setTimeout>) =>
        clearTimeout(id)) as typeof clearTimeout,
    });
    doc = Object.assign(new EventTarget(), { hidden: false, hasFocus: () => focused });
    battery = Object.assign(new EventTarget(), { charging: true });
    vi.stubGlobal('window', win);
    vi.stubGlobal('document', doc);
    vi.stubGlobal('navigator', { getBattery: () => Promise.resolve(battery) });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('steps down while idle and restores on the first input', () => {
    const changes: number[] = [];
    const monitor = createRateMonitor(plan => changes.push(plan.fps));
    expect(monitor.plan.fps).toBe(RATES.base);
    vi.advanceTimersByTime(IDLE_SLOW_MS + 10);
    expect(monitor.plan.fps).toBe(RATES.idle);
    vi.advanceTimersByTime(IDLE_FREEZE_MS - IDLE_SLOW_MS);
    expect(monitor.plan.fps).toBe(0);
    win.dispatchEvent(new Event('pointermove'));
    expect(monitor.plan.fps).toBe(RATES.base);
    expect(changes).toEqual([RATES.idle, 0, RATES.base]);
    monitor.dispose();
  });

  it('input while awake postpones the idle step without re-planning per event', () => {
    const onChange = vi.fn<(plan: RatePlan) => void>();
    const monitor = createRateMonitor(onChange);
    vi.advanceTimersByTime(IDLE_SLOW_MS - 1000);
    win.dispatchEvent(new Event('keydown'));
    vi.advanceTimersByTime(2000);
    expect(monitor.plan.fps).toBe(RATES.base);
    vi.advanceTimersByTime(IDLE_SLOW_MS);
    expect(monitor.plan.fps).toBe(RATES.idle);
    expect(onChange).toHaveBeenCalledTimes(1);
    monitor.dispose();
  });

  it('slows an unfocused window after the grace period and recovers on focus', () => {
    focused = false;
    const monitor = createRateMonitor(() => {});
    expect(monitor.plan.fps).toBe(RATES.base);
    vi.advanceTimersByTime(UNFOCUSED_GRACE_MS + 10);
    expect(monitor.plan.fps).toBe(RATES.unfocused);
    win.dispatchEvent(new Event('focus'));
    expect(monitor.plan.fps).toBe(RATES.base);
    win.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(UNFOCUSED_GRACE_MS + 10);
    expect(monitor.plan.fps).toBe(RATES.unfocused);
    monitor.dispose();
  });

  it('follows the battery charging state', async () => {
    battery.charging = false;
    const monitor = createRateMonitor(() => {});
    await vi.waitFor(() =>
      expect(monitor.plan).toEqual({ fps: RATES.battery, densityCap: BATTERY_DENSITY }),
    );
    battery.charging = true;
    battery.dispatchEvent(new Event('chargingchange'));
    expect(monitor.plan).toEqual({ fps: RATES.base, densityCap: undefined });
    monitor.dispose();
  });

  it('bursts for pointer movement, caps under the dialog, and stops all timers on dispose', () => {
    const monitor = createRateMonitor(() => {});
    monitor.notePointer();
    expect(monitor.plan.fps).toBe(RATES.pointer);
    vi.advanceTimersByTime(POINTER_BURST_MS + 10);
    expect(monitor.plan.fps).toBe(RATES.base);
    monitor.setDialogOpen(true);
    expect(monitor.plan.fps).toBe(RATES.dialog);
    monitor.setDialogOpen(false);
    expect(monitor.plan.fps).toBe(RATES.base);
    monitor.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});

/** Feeds frames at `rate` fps from `from` to `to` ms; returns the first time the watch reports slow. */
const feed = (watch: RateWatch, planned: number, rate: number, from: number, to: number) => {
  for (let at = from; at <= to; at += 1000 / rate) if (watch.frame(at, planned)) return at;
  return undefined;
};

describe('createRateWatch', () => {
  it('stays quiet when the delivered rate is near plan', () => {
    const watch = createRateWatch();
    watch.reset(0);
    expect(feed(watch, 20, 20, 0, 60_000)).toBeUndefined();
    expect(feed(watch, 20, 13, 60_000, 120_000)).toBeUndefined();
  });

  it('reports after consecutive slow windows past the warm-up', () => {
    const watch = createRateWatch();
    watch.reset(0);
    const at = feed(watch, 20, 7, 0, 60_000);
    expect(at).toBeGreaterThanOrEqual(WATCH_WARMUP_MS + WATCH_WINDOW_MS * WATCH_SLOW_WINDOWS);
    expect(at).toBeLessThan(WATCH_WARMUP_MS + WATCH_WINDOW_MS * WATCH_SLOW_WINDOWS + 1000);
  });

  it('ignores the warm-up and low plans', () => {
    const watch = createRateWatch();
    watch.reset(0);
    // A stall at start-up (shader compile) followed by a normal rate.
    expect(feed(watch, 20, 2, 0, WATCH_WARMUP_MS - 1)).toBeUndefined();
    expect(feed(watch, 20, 20, WATCH_WARMUP_MS, 30_000)).toBeUndefined();
    expect(feed(watch, RATES.idle, 1, 30_000, 90_000)).toBeUndefined();
  });

  it('treats throttled rAF as a stall, not a slow GPU', () => {
    const watch = createRateWatch();
    watch.reset(0);
    // Headless Chrome and long tasks can hold rAF to about one frame a second.
    expect(feed(watch, 20, 1, 0, 60_000)).toBeUndefined();
    // CPU rendering delivers late but steady frames.
    expect(feed(watch, 20, 4, 60_000, 90_000)).toBeDefined();
  });

  it('needs the slow windows to be consecutive', () => {
    const watch = createRateWatch();
    watch.reset(0);
    let at = WATCH_WARMUP_MS;
    for (let round = 0; round < 5; round++) {
      expect(feed(watch, 20, 7, at, at + WATCH_WINDOW_MS + 200)).toBeUndefined();
      at += WATCH_WINDOW_MS + 200;
      expect(feed(watch, 20, 20, at, at + WATCH_WINDOW_MS + 200)).toBeUndefined();
      at += WATCH_WINDOW_MS + 200;
    }
  });

  it('starts over on reset', () => {
    const watch = createRateWatch();
    watch.reset(0);
    expect(feed(watch, 20, 7, 0, WATCH_WARMUP_MS + WATCH_WINDOW_MS * 1.5)).toBeUndefined();
    watch.reset(10_000);
    expect(feed(watch, 20, 7, 10_000, 10_000 + WATCH_WARMUP_MS + WATCH_WINDOW_MS)).toBeUndefined();
  });
});
