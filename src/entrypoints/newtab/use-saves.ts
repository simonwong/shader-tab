import { useCallback, useEffect, useRef, useState } from 'react';
import { asError } from '../../i18n/core';

interface Edit<T> {
  id: number;
  value: T;
  settled: boolean;
  /** Saved data at the moment the save finished; the edit is dropped once newer data arrives. */
  seen?: unknown;
}

let nextId = 0;

/**
 * Edits shown before storage confirms them. Each edit appears at once, is
 * dropped if its save fails, and after a successful save stays until the
 * live query delivers newer data, so the UI never flips back in between.
 */
export function useOptimistic<T>(saved: unknown) {
  const [edits, setEdits] = useState<Edit<T>[]>([]);
  const latestSaved = useRef(saved);
  latestSaved.current = saved;

  useEffect(() => {
    setEdits(list => {
      const next = list.filter(edit => !edit.settled || edit.seen === saved);
      return next.length === list.length ? list : next;
    });
  }, [saved]);

  const begin = useCallback((value: T) => {
    const id = ++nextId;
    setEdits(list => [...list, { id, value, settled: false }]);
    return (saved: boolean) => setEdits(list => saved
      ? list.map(edit => edit.id === id ? { ...edit, settled: true, seen: latestSaved.current } : edit)
      : list.filter(edit => edit.id !== id));
  }, []);

  return { values: edits.map(edit => edit.value), begin };
}

/**
 * Runs saves without blocking the UI. `busy` counts saves in flight (so an
 * early finisher does not clear it for a later one); `run` resolves false and
 * records the error when a save fails.
 */
export function useSaveQueue() {
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<Error>();
  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(count => count + 1);
    setError(undefined);
    try {
      await task();
      return true;
    } catch (cause) {
      setError(asError(cause, 'saveFailed'));
      return false;
    } finally {
      setBusy(count => count - 1);
    }
  }, []);
  return { busy: busy > 0, error, setError, run };
}
