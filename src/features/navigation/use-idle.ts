import { useEffect, useState } from 'react';

/** How long the controls stay up after the page opens, so first-time users see where they are. */
const FIRST_LOOK = 3000;

/**
 * Whether the page controls are shown. Any pointer or keyboard activity wakes
 * them; they fade after `delay` ms of inactivity unless `held`. A focused
 * control fades with the rest; the next key press brings everything back.
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
    window.addEventListener('pointermove', wake, { passive: true });
    window.addEventListener('pointerdown', wake, { passive: true });
    window.addEventListener('keydown', wake);
    window.addEventListener('blur', hide);
    document.addEventListener('focusout', focusOut);
    schedule(Math.max(delay, FIRST_LOOK - performance.now()));
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
      window.removeEventListener('blur', hide);
      document.removeEventListener('focusout', focusOut);
    };
  }, [delay, held]);
  return visible || held;
}
