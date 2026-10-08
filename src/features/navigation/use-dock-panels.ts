import { useCallback, useEffect, useRef, useState } from 'react';

export type DockPanel = 'favorites' | 'all';

const CLOSE_DELAY = 220;

/**
 * Hover/open state for the dock's favorites tray and bookmark menu.
 * Leaving the dock closes the open panel after a short delay unless keyboard
 * focus is still inside it; a pointer press outside any `.ui-surface` closes it
 * at once.
 */
export function useDockPanels({ showFavorites, showBookmarks }: { showFavorites: boolean; showBookmarks: boolean }) {
  const [panel, setPanel] = useState<DockPanel | null>(null);
  const [inside, setInside] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const keyboardMode = useRef(false);

  const enter = useCallback(() => {
    clearTimeout(closeTimer.current);
    setInside(true);
  }, []);
  const leave = useCallback(() => {
    setInside(false);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      const focusInPanel = document.activeElement?.closest('.bookmark-menu, .favorites-tray');
      if (!keyboardMode.current || !focusInPanel) setPanel(null);
    }, CLOSE_DELAY);
  }, []);
  /** Closes any panel immediately and cancels a pending delayed close. */
  const closeNow = useCallback(() => {
    clearTimeout(closeTimer.current);
    setPanel(null);
    setInside(false);
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (panel === 'favorites' && !showFavorites || panel === 'all' && !showBookmarks) {
      setPanel(null);
      setInside(false);
    }
  }, [panel, showFavorites, showBookmarks]);

  useEffect(() => {
    const pointer = () => { keyboardMode.current = false; };
    const keyboard = () => { keyboardMode.current = true; };
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || event.target.closest('.ui-surface')) return;
      setPanel(null);
      setInside(false);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    };
    document.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('pointermove', pointer);
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', keyboard);
    };
  }, []);

  return { panel, setPanel, inside, enter, leave, closeNow };
}
