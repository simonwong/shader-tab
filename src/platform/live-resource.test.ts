import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { watchLiveResource } from './live-resource';
const noop = () => {};
let documentStub: EventTarget & { hidden: boolean };
beforeEach(() => {
  vi.useFakeTimers();
  documentStub = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('document', documentStub);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('coalesces a bookmark import burst and defers background-tab reads until visible', async () => {
  let notify: () => void = noop;
  const load = vi.fn<() => Promise<string>>().mockResolvedValue('tree');
  const data = vi.fn<(data: string) => void>();
  const stop = watchLiveResource(
    load,
    listener => {
      notify = listener;
      return () => {};
    },
    data,
    vi.fn<(error: unknown) => void>(),
  );
  await vi.advanceTimersByTimeAsync(0);
  for (let i = 0; i < 1000; i++) notify();
  await vi.advanceTimersByTimeAsync(100);
  expect(load).toHaveBeenCalledTimes(2);
  documentStub.hidden = true;
  documentStub.dispatchEvent(new Event('visibilitychange'));
  for (let i = 0; i < 1000; i++) notify();
  await vi.advanceTimersByTimeAsync(1000);
  expect(load).toHaveBeenCalledTimes(2);
  documentStub.hidden = false;
  documentStub.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(0);
  expect(load).toHaveBeenCalledTimes(3);
  stop();
  notify();
  await vi.advanceTimersByTimeAsync(100);
  expect(load).toHaveBeenCalledTimes(3);
});
it('discards an obsolete in-flight result and performs one replacement read', async () => {
  let notify: () => void = noop;
  let resolve: (value: string) => void = noop;
  const load = vi
    .fn<() => Promise<string>>()
    .mockImplementationOnce(
      () =>
        new Promise<string>(done => {
          resolve = done;
        }),
    )
    .mockResolvedValue('new');
  const data = vi.fn<(data: string) => void>();
  const stop = watchLiveResource(
    load,
    listener => {
      notify = listener;
      return () => {};
    },
    data,
    vi.fn<(error: unknown) => void>(),
  );
  notify();
  await vi.advanceTimersByTimeAsync(100);
  expect(load).toHaveBeenCalledTimes(1);
  resolve('stale');
  await vi.advanceTimersByTimeAsync(100);
  expect(data.mock.calls).toEqual([['new']]);
  stop();
});
it('does not load a new hidden tab or publish after disposal', async () => {
  documentStub.hidden = true;
  let resolve: (value: string) => void = noop;
  const load = vi.fn<() => Promise<string>>(
    () =>
      new Promise<string>(done => {
        resolve = done;
      }),
  );
  const data = vi.fn<(data: string) => void>();
  const stop = watchLiveResource(load, () => () => {}, data, vi.fn<(error: unknown) => void>());
  expect(load).not.toHaveBeenCalled();
  documentStub.hidden = false;
  documentStub.dispatchEvent(new Event('visibilitychange'));
  stop();
  resolve('late');
  await vi.advanceTimersByTimeAsync(0);
  expect(data).not.toHaveBeenCalled();
});
