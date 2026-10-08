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
    const schedule = (wait: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (!held) setVisible(false); }, wait);
    };
    const wake = () => {
      setVisible(true);
      schedule(delay);
    };
    const hide = () => { if (!held) setVisible(false); };
    window.addEventListener('pointermove', wake, { passive: true });
    window.addEventListener('pointerdown', wake, { passive: true });
    window.addEventListener('keydown', wake);
    window.addEventListener('blur', hide);
    document.addEventListener('focusout', wake);
    schedule(Math.max(delay, FIRST_LOOK - performance.now()));
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
      window.removeEventListener('blur', hide);
      document.removeEventListener('focusout', wake);
    };
  }, [delay, held]);
  return visible || held;
}
