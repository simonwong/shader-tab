import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BATTERY_DENSITY, IDLE_FREEZE_MS, IDLE_SLOW_MS, POINTER_BURST_MS, RATES, UNFOCUSED_GRACE_MS,
  createRateMonitor, planRate, type RateConditions,
} from './rate-policy';

const awake: RateConditions = { idleMs: 0, unfocusedMs: 0, onBattery: false, dialogOpen: false, pointerActive: false };
const fps = (patch: Partial<RateConditions>) => planRate({ ...awake, ...patch }).fps;

describe('planRate', () => {
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
    expect(planRate({ ...awake, onBattery: true })).toEqual({ fps: RATES.battery, densityCap: BATTERY_DENSITY });
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
      setTimeout: ((...args: Parameters<typeof setTimeout>) => setTimeout(...args)) as typeof setTimeout,
      clearTimeout: ((id: ReturnType<typeof setTimeout>) => clearTimeout(id)) as typeof clearTimeout,
    });
    doc = Object.assign(new EventTarget(), { hidden: false, hasFocus: () => focused });
    battery = Object.assign(new EventTarget(), { charging: true });
    vi.stubGlobal('window', win);
    vi.stubGlobal('document', doc);
    vi.stubGlobal('navigator', { getBattery: () => Promise.resolve(battery) });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

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
    const onChange = vi.fn();
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
    await vi.waitFor(() => expect(monitor.plan).toEqual({ fps: RATES.battery, densityCap: BATTERY_DENSITY }));
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
