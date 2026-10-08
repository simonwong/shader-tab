import { useCallback, useMemo, useState } from 'react';
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
  // `saved` lives in state next to the edits so a finishing save can record the data it saw.
  const [state, setState] = useState<{ saved: unknown; edits: Edit<T>[] }>({ saved, edits: [] });
  if (state.saved !== saved) {
    // Newer data arrived: drop the settled edits it replaces before this render shows them.
    setState(current => {
      const edits = current.edits.filter(edit => !edit.settled || edit.seen === saved);
      return { saved, edits: edits.length === current.edits.length ? current.edits : edits };
    });
  }

  const begin = useCallback((value: T) => {
    const id = ++nextId;
    setState(current => ({ ...current, edits: [...current.edits, { id, value, settled: false }] }));
    return (ok: boolean) => setState(current => ({
      ...current,
      edits: ok
        ? current.edits.map(edit => edit.id === id ? { ...edit, settled: true, seen: current.saved } : edit)
        : current.edits.filter(edit => edit.id !== id),
    }));
  }, []);

  const values = useMemo(() => state.edits.map(edit => edit.value), [state.edits]);
  return { values, begin };
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
