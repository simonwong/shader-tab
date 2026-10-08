import { useEffect, useEffectEvent } from 'react';

interface Handlers {
  /** Cmd/Ctrl + , */
  onOpenSettings: () => void;
  onEscape: () => void;
}

/** Page-wide keyboard shortcuts. Handlers may change every render; the listener is registered once. */
export function useGlobalShortcuts(handlers: Handlers) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === ',') {
      event.preventDefault();
      handlers.onOpenSettings();
    }
    if (event.key === 'Escape') handlers.onEscape();
  });
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);
}
