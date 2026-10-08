/*
 * Frame-rate policy for the ambient background. `planRate` is a pure function
 * of the page conditions; `createRateMonitor` tracks those conditions
 * (input, focus, battery, dialog) and reports a new plan when it changes.
 *
 * Motion is a slow "breathing" clock (see motion.ts) and the pointer is
 * followed with a ~0.8 s time constant, so 20 fps reads as smooth. Only
 * drivers that draw the pointer directly (a touch trail) get a short 30 fps
 * burst while the pointer moves over the background. Open dock panels no
 * longer raise the rate: the glass panels' backdrop blur re-filters every
 * frame the background draws.
 */

export const RATES = {
  base: 20,
  /** Pointer moving over a pointer-reactive background (e.g. a touch trail). */
  pointer: 30,
  /** Running on battery. */
  battery: 15,
  /** Window visible but not focused (another window or monitor has focus). */
  unfocused: 10,
  /** Settings dialog open: the background sits under a large blurred panel. */
  dialog: 10,
  /** No input for IDLE_SLOW_MS. */
  idle: 5,
} as const;

/** No input for this long drops to RATES.idle. */
export const IDLE_SLOW_MS = 2 * 60_000;
/** No input for this long holds the current frame. */
export const IDLE_FREEZE_MS = 10 * 60_000;
/**
 * The window must stay unfocused this long before slowing down. Chrome focuses
 * the omnibox when a new tab opens, so the page starts unfocused; the grace
 * period keeps the first seconds after opening a tab at the full rate.
 */
export const UNFOCUSED_GRACE_MS = 15_000;
/** How long a pointer move keeps the pointer rate. */
export const POINTER_BURST_MS = 1_000;
/** Battery power caps the render density at 1 device pixel per CSS pixel. */
export const BATTERY_DENSITY = 1;

export interface RateConditions {
  /** Time since the last pointer, wheel or keyboard input. */
  idleMs: number;
  /** Time the window has been unfocused; 0 while focused. */
  unfocusedMs: number;
  onBattery: boolean;
  dialogOpen: boolean;
  /** The pointer moved over a pointer-reactive background within POINTER_BURST_MS. */
  pointerActive: boolean;
}

export interface RatePlan {
  /** Frames per second; 0 holds the current frame. */
  fps: number;
  /** Extra cap on render density, or undefined for none. */
  densityCap: number | undefined;
}

export function planRate(conditions: RateConditions): RatePlan {
  const densityCap = conditions.onBattery ? BATTERY_DENSITY : undefined;
  if (conditions.idleMs >= IDLE_FREEZE_MS) return { fps: 0, densityCap };
  let fps: number = conditions.pointerActive ? RATES.pointer : RATES.base;
  if (conditions.onBattery) fps = Math.min(fps, RATES.battery);
  if (conditions.unfocusedMs >= UNFOCUSED_GRACE_MS) fps = Math.min(fps, RATES.unfocused);
  if (conditions.dialogOpen) fps = Math.min(fps, RATES.dialog);
  if (conditions.idleMs >= IDLE_SLOW_MS) fps = Math.min(fps, RATES.idle);
  return { fps, densityCap };
}

const samePlan = (a: RatePlan, b: RatePlan) => a.fps === b.fps && a.densityCap === b.densityCap;

interface BatteryLike extends EventTarget {
  charging: boolean;
}

export interface RateMonitor {
  readonly plan: RatePlan;
  setDialogOpen: (open: boolean) => void;
  /** Records pointer movement over a pointer-reactive background. */
  notePointer: () => void;
  dispose: () => void;
}

const INPUT_EVENTS = ['pointermove', 'pointerdown', 'wheel', 'keydown'] as const;
const now = () => performance.now();

/**
 * Watches input, focus and battery state and calls `onChange` whenever the
 * plan changes. Input handlers only store a timestamp; timers re-evaluate the
 * plan when a threshold can next be crossed.
 */
export function createRateMonitor(onChange: (plan: RatePlan) => void): RateMonitor {
  let lastInput = now();
  let unfocusedSince: number | undefined = document.hasFocus() ? undefined : now();
  let pointerUntil = 0;
  let onBattery = false;
  let dialogOpen = false;
  let disposed = false;
  let timer = 0;
  let battery: BatteryLike | undefined;

  const conditions = (at: number): RateConditions => ({
    idleMs: at - lastInput,
    unfocusedMs: unfocusedSince === undefined ? 0 : at - unfocusedSince,
    onBattery,
    dialogOpen,
    pointerActive: at < pointerUntil,
  });
  let plan = planRate(conditions(now()));

  /** Earliest future time at which a time-based condition flips. */
  const nextDeadline = (at: number) => {
    const deadlines = [lastInput + IDLE_SLOW_MS, lastInput + IDLE_FREEZE_MS, pointerUntil];
    if (unfocusedSince !== undefined) deadlines.push(unfocusedSince + UNFOCUSED_GRACE_MS);
    return Math.min(...deadlines.filter(deadline => deadline > at));
  };
  const update = () => {
    if (disposed) return;
    const at = now();
    window.clearTimeout(timer);
    const deadline = nextDeadline(at);
    if (Number.isFinite(deadline)) timer = window.setTimeout(update, deadline - at + 1);
    const next = planRate(conditions(at));
    if (samePlan(next, plan)) return;
    plan = next;
    onChange(plan);
  };

  // Input arrives at pointer rate: store the time, and only re-plan when the
  // current plan is degraded by idleness (otherwise the pending timer re-checks).
  const onInput = () => {
    lastInput = now();
    if (plan.fps <= RATES.idle) update();
  };
  const onFocus = () => {
    unfocusedSince = undefined;
    lastInput = now();
    update();
  };
  const onBlur = () => {
    unfocusedSince ??= now();
    update();
  };
  const onVisibility = () => {
    if (!document.hidden) {
      lastInput = now();
      update();
    }
  };
  const onCharging = () => {
    onBattery = battery ? !battery.charging : false;
    update();
  };

  for (const type of INPUT_EVENTS)
    window.addEventListener(type, onInput, { passive: true, capture: true });
  window.addEventListener('focus', onFocus);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);
  const getBattery = (navigator as Navigator & { getBattery?: () => Promise<BatteryLike> })
    .getBattery;
  if (typeof getBattery === 'function') {
    getBattery
      .call(navigator)
      .then(manager => {
        if (disposed) return;
        battery = manager;
        battery.addEventListener('chargingchange', onCharging);
        onCharging();
      })
      .catch(() => {});
  }
  update();

  return {
    get plan() {
      return plan;
    },
    setDialogOpen(open) {
      if (dialogOpen === open) return;
      dialogOpen = open;
      update();
    },
    notePointer() {
      const at = now();
      const wasActive = at < pointerUntil;
      pointerUntil = at + POINTER_BURST_MS;
      if (!wasActive) update();
    },
    dispose() {
      disposed = true;
      window.clearTimeout(timer);
      for (const type of INPUT_EVENTS) window.removeEventListener(type, onInput, { capture: true });
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      battery?.removeEventListener('chargingchange', onCharging);
    },
  };
}
