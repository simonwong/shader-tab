import { useEffect, useRef } from 'react';

interface Handlers {
  /** Cmd/Ctrl + , */
  onOpenSettings: () => void;
  onEscape: () => void;
}

/** Page-wide keyboard shortcuts. Handlers may change every render; the listener is registered once. */
export function useGlobalShortcuts(handlers: Handlers) {
  const latest = useRef(handlers);
  latest.current = handlers;
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        latest.current.onOpenSettings();
      }
      if (event.key === 'Escape') latest.current.onEscape();
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);
}
