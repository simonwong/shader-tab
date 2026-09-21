import { useEffect, useState } from 'react';
export function useIdleControls(delay: number, held: boolean) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let keyboard = false;
    const wake = (event?: Event) => {
      if (event?.type === 'keydown') keyboard = true;
      if (event?.type.startsWith('pointer')) keyboard = false;
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!held && !(keyboard && document.activeElement?.closest('.ui-surface'))) setVisible(false);
      }, delay);
    };
    const hide = () => { if (!held) setVisible(false); };
    window.addEventListener('pointermove', wake, { passive: true });
    window.addEventListener('pointerdown', wake, { passive: true });
    window.addEventListener('keydown', wake);
    window.addEventListener('blur', hide);
    document.addEventListener('focusout', wake);
    if (held) wake();
    else timer = setTimeout(() => setVisible(false), delay);
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
