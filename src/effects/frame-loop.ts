/** rAF timestamps jitter by a millisecond or two; a frame this close to its slot still draws. */
const SLOT_TOLERANCE_MS = 2;
/** Waits longer than this sleep on a timer and only switch to rAF shortly before the slot. */
const TIMER_SLEEP_MIN_MS = 60;
/** How early the timer hands over to rAF: more than one 60 Hz vsync plus timer slop. */
const TIMER_WAKE_EARLY_MS = 25;

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
 * slipping one vsync per frame. Long waits (low rates) sleep on a timer first
 * so the page is not woken on every vsync just to skip it.
 */
export function createFrameLoop(draw: (time: number) => void, initialFps: number): FrameLoop {
  let running = false;
  let fps = initialFps;
  let frame = 0;
  let timer = 0;
  /** rAF time of the current slot; -Infinity draws on the next frame. */
  let slot = -Infinity;

  const cancel = () => {
    window.clearTimeout(timer);
    cancelAnimationFrame(frame);
    timer = frame = 0;
  };
  const schedule = (now: number) => {
    if (!running || fps <= 0) return;
    const wait = slot + 1000 / fps - now;
    if (wait > TIMER_SLEEP_MIN_MS) {
      timer = window.setTimeout(() => { timer = 0; frame = requestAnimationFrame(tick); }, wait - TIMER_WAKE_EARLY_MS);
    } else {
      frame = requestAnimationFrame(tick);
    }
  };
  const tick = (time: number) => {
    frame = 0;
    if (!running || fps <= 0) return;
    const interval = 1000 / fps;
    const elapsed = time - slot;
    if (elapsed >= interval - SLOT_TOLERANCE_MS) {
      // Keep the phase while on schedule; after a stall (or the first frame) restart from now.
      slot = elapsed < interval * 2 ? slot + interval : time;
      draw(time);
    }
    if (running && !frame && !timer) schedule(time);
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
