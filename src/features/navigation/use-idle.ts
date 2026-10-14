import { useEffect, useState } from 'react';

/** How long the controls stay up after the page opens, so first-time users see where they are. */
const FIRST_LOOK = 3000;
/**
 * Mouse movement only wakes the controls in the bottom band of the page, where
 * they live: the bottom 30 % of the viewport, at least 160 px. A pointer on its
 * way to the tab strip or the address bar leaves them asleep.
 */
const WAKE_BAND = 0.3;
const WAKE_BAND_MIN = 160;

/** Whether a pointer move should wake the controls. Touch and pen have no hover, so they always do. */
export function wakesControls(
  event: Pick<PointerEvent, 'pointerType' | 'clientY'>,
  viewportHeight: number,
) {
  return (
    event.pointerType !== 'mouse' ||
    event.clientY >= viewportHeight - Math.max(WAKE_BAND_MIN, viewportHeight * WAKE_BAND)
  );
}

/**
 * Whether the page controls are shown. A key press, a pointer press, or mouse
 * movement in the bottom band (see `wakesControls`) wakes them; they fade
 * after `delay` ms without such activity unless `held`. A focused control
 * fades with the rest; the next key press brings everything back.
 */
export function useIdleControls(delay: number, held: boolean) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    // Hidden controls become `visibility: hidden`, which blurs a focused one;
    // that focusout must not wake them again.
    let asleep = false;
    const hide = () => {
      if (held) return;
      asleep = true;
      setVisible(false);
    };
    const schedule = (wait: number) => {
      clearTimeout(timer);
      timer = setTimeout(hide, wait);
    };
    const wake = () => {
      asleep = false;
      setVisible(true);
      schedule(delay);
    };
    const focusOut = () => {
      if (!asleep) wake();
    };
    const move = (event: PointerEvent) => {
      if (wakesControls(event, window.innerHeight)) wake();
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', wake, { passive: true });
    window.addEventListener('keydown', wake);
    window.addEventListener('blur', hide);
    document.addEventListener('focusout', focusOut);
    schedule(Math.max(delay, FIRST_LOOK - performance.now()));
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
      window.removeEventListener('blur', hide);
      document.removeEventListener('focusout', focusOut);
    };
  }, [delay, held]);
  return visible || held;
}
