/** rAF timestamps jitter by a millisecond or two; a frame this close to its slot still draws. */
const SLOT_TOLERANCE_MS = 2;
/** How late a timer may fire: Windows' default timer resolution is 15.6 ms. */
const TIMER_SLOP_MS = 16;
/** Refresh interval assumed until rAF has measured one. */
const DEFAULT_VSYNC_MS = 1000 / 60;
/** Gaps between consecutive rAF frames outside this range are drops or stalls, not a refresh interval. */
const VSYNC_MIN_MS = 4;
const VSYNC_MAX_MS = 34;

export interface FrameLoop {
  /** Starts drawing; pass the time of a frame the caller just drew to wait one interval first. */
  start: (drawnAt?: number) => void;
  stop: () => void;
  /** Frames per second; 0 holds the current frame until a positive rate is set again. */
  setFps: (fps: number) => void;
}

/**
 * Draws on animation frames at no more than `fps`. Every draw happens inside
 * a rAF callback; frames that arrive before the next slot are skipped. Slots
 * advance by a fixed interval, so the cadence stays on whole vsyncs instead of
 * slipping one vsync per frame. Waits that span several vsyncs sleep on a
 * timer first, so the page is not woken on every vsync just to skip it; the
 * timer hands over to rAF one measured vsync plus timer slop before the slot.
 */
export function createFrameLoop(draw: (time: number) => void, initialFps: number): FrameLoop {
  let running = false;
  let fps = initialFps;
  let frame = 0;
  let timer = 0;
  /** rAF time of the current slot; -Infinity draws on the next frame. */
  let slot = -Infinity;
  /** Measured refresh interval: follows shorter gaps quickly and longer ones slowly, so dropped frames barely move it. */
  let vsync = DEFAULT_VSYNC_MS;
  /** rAF time of the tick that requested the pending frame directly, if one did. */
  let requestedAt: number | undefined;

  const cancel = () => {
    window.clearTimeout(timer);
    cancelAnimationFrame(frame);
    timer = frame = 0;
    requestedAt = undefined;
  };
  const schedule = (now: number, tickTime?: number) => {
    if (!running || fps <= 0) return;
    const sleep = slot + 1000 / fps - now - (vsync + TIMER_SLOP_MS);
    // Worth a timer only if it skips at least half a vsync of wake-ups.
    if (sleep > vsync / 2) {
      timer = window.setTimeout(() => {
        timer = 0;
        frame = requestAnimationFrame(tick);
      }, sleep);
    } else {
      requestedAt = tickTime;
      frame = requestAnimationFrame(tick);
    }
  };
  const measure = (gap: number) => {
    if (gap < VSYNC_MIN_MS || gap > VSYNC_MAX_MS) return;
    vsync = gap < vsync ? (vsync + gap) / 2 : vsync + (gap - vsync) * 0.05;
  };
  const tick = (time: number) => {
    frame = 0;
    if (requestedAt !== undefined) measure(time - requestedAt);
    requestedAt = undefined;
    if (!running || fps <= 0) return;
    const interval = 1000 / fps;
    const elapsed = time - slot;
    if (elapsed >= interval - SLOT_TOLERANCE_MS) {
      // Keep the phase while on schedule; after a stall (or the first frame) restart from now.
      slot = elapsed < interval * 2 ? slot + interval : time;
      draw(time);
    }
    if (running && !frame && !timer) schedule(time, time);
  };

  return {
    start(drawnAt) {
      if (running) return;
      running = true;
      slot = drawnAt ?? -Infinity;
      schedule(performance.now());
    },
    stop() {
      running = false;
      cancel();
    },
    setFps(next) {
      if (next === fps) return;
      fps = next;
      if (!running) return;
      // Re-plan the wait against the new interval (or wake from a 0 fps hold).
      // Inside a draw this leaves a pending frame, so tick() does not schedule a second one.
      cancel();
      schedule(performance.now());
    },
  };
}
