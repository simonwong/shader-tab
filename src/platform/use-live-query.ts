import { asError } from '../i18n/core';
import { useCallback, useEffect, useState } from 'react';
import type { Listener, Unsubscribe } from './types';
import { watchLiveResource } from './live-resource';
export function useLiveQuery<T>(load: () => Promise<T>, subscribe: (listener: Listener) => Unsubscribe) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => watchLiveResource(load, subscribe, (next) => { setData(next); setError(undefined); },
    (cause) => setError(asError(cause, 'readFailed'))), [load, subscribe, revision]);
  return { data, error, retry };
}
