import type { Listener, Unsubscribe } from './types';
export function watchLiveResource<T>(
  load: () => Promise<T>,
  subscribe: (listener: Listener) => Unsubscribe,
  onData: (data: T) => void,
  onError: (error: unknown) => void,
) {
  let disposed = false,
    running = false,
    dirty = true;
  let revision = 0;
  let timer: ReturnType<typeof setTimeout>;
  const queue = () => {
    clearTimeout(timer);
    if (!document.hidden && !disposed)
      timer = setTimeout(() => {
        void refresh();
      }, 60);
  };
  const refresh = async () => {
    if (disposed || running || document.hidden || !dirty) return;
    dirty = false;
    running = true;
    const request = revision;
    try {
      const data = await load();
      if (!disposed && request === revision) onData(data);
    } catch (error) {
      if (!disposed && request === revision) onError(error);
    } finally {
      running = false;
      if (dirty) queue();
    }
  };
  const unsubscribe = subscribe(() => {
    dirty = true;
    revision++;
    queue();
  });
  const visibility = () => {
    clearTimeout(timer);
    if (!document.hidden) void refresh();
  };
  document.addEventListener('visibilitychange', visibility);
  void refresh();
  return () => {
    disposed = true;
    clearTimeout(timer);
    unsubscribe();
    document.removeEventListener('visibilitychange', visibility);
  };
}
