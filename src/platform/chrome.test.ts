import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FAVORITES_KEY } from '../features/favorites/model';
import type { BookmarkNode } from '../features/bookmarks/model';

function fakeEvent<Args extends unknown[] = []>() {
  const listeners = new Set<(...args: Args) => void>();
  return {
    addListener: (listener: (...args: Args) => void) => listeners.add(listener),
    removeListener: (listener: (...args: Args) => void) => listeners.delete(listener),
    fire: (...args: Args) => listeners.forEach(listener => listener(...args)),
  };
}

let store: Record<string, unknown>;
let tree: BookmarkNode[];
const storage = {
  get: vi.fn<(keys: string[] | null) => Promise<Record<string, unknown>>>(async keys =>
    structuredClone(
      keys === null
        ? store
        : Object.fromEntries(keys.filter(key => key in store).map(key => [key, store[key]])),
    ),
  ),
  set: vi.fn<(items: Record<string, unknown>) => Promise<void>>(async items => {
    Object.assign(store, structuredClone(items));
  }),
  remove: vi.fn<(keys: string[]) => Promise<void>>(async keys => {
    for (const key of keys) delete store[key];
  }),
};
const bookmarks = {
  getTree: vi.fn<() => Promise<BookmarkNode[]>>(async () => structuredClone(tree)),
  onCreated: fakeEvent(),
  onRemoved: fakeEvent(),
  onChanged: fakeEvent(),
  onMoved: fakeEvent(),
  onChildrenReordered: fakeEvent(),
  onImportBegan: fakeEvent(),
  onImportEnded: fakeEvent(),
};
const onChanged = fakeEvent<[Record<string, unknown>, string]>();
const tabs = {
  getCurrent: vi.fn<() => Promise<{ id: number }>>(async () => ({ id: 7 })),
  update: vi.fn<(...args: unknown[]) => Promise<object>>(async () => ({})),
  create: vi.fn<(properties: unknown) => Promise<object>>(async () => ({})),
};

beforeEach(() => {
  store = {};
  tree = [
    {
      id: '0',
      title: '',
      children: [
        {
          id: '1',
          title: 'Bar',
          children: [
            { id: 'a', title: 'A', url: 'https://a.example/' },
            { id: 'b', title: 'B', url: 'https://b.example/' },
          ],
        },
      ],
    },
  ];
  vi.clearAllMocks();
  vi.stubGlobal('chrome', { storage: { local: storage, onChanged }, bookmarks, tabs });
  // Exclusive per-name locks, like the Web Locks API.
  const queues = new Map<string, Promise<unknown>>();
  vi.stubGlobal('navigator', {
    locks: {
      request: (name: string, task: () => Promise<unknown>) => {
        const run = (queues.get(name) ?? Promise.resolve()).then(task);
        queues.set(
          name,
          run.catch(() => {}),
        );
        return run;
      },
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

const platform = async () => (await import('./chrome')).chromePlatform;

it('reads and writes chrome.storage.local and watches only its local area', async () => {
  const chrome = await platform();
  const listener = vi.fn<() => void>();
  const stop = chrome.watchFavorites(listener);
  await chrome.updateFavorites({ type: 'add', id: 'a' });
  expect(store).toEqual({ [FAVORITES_KEY]: [{ id: 'a', url: 'https://a.example/' }] });
  const changed = { [FAVORITES_KEY]: { newValue: [] } };
  onChanged.fire(changed, 'sync');
  expect(listener).not.toHaveBeenCalled();
  onChanged.fire(changed, 'local');
  expect(listener).toHaveBeenCalledTimes(1);
  stop();
  onChanged.fire(changed, 'local');
  expect(listener).toHaveBeenCalledTimes(1);
});

it('refreshes once after a bookmark import instead of once per created bookmark', async () => {
  const listener = vi.fn<() => void>();
  const stop = (await platform()).watchBookmarks(listener);
  bookmarks.onImportBegan.fire();
  for (let i = 0; i < 50; i++) bookmarks.onCreated.fire();
  expect(listener).not.toHaveBeenCalled();
  bookmarks.onImportEnded.fire();
  expect(listener).toHaveBeenCalledTimes(1);
  bookmarks.onCreated.fire();
  expect(listener).toHaveBeenCalledTimes(2);
  stop();
  bookmarks.onCreated.fire();
  expect(listener).toHaveBeenCalledTimes(2);
});

it('opens browser pages in this tab, or in a background tab on request', async () => {
  const chrome = await platform();
  await chrome.openUrl('chrome://settings/', false);
  expect(tabs.update).toHaveBeenCalledWith(7, { url: 'chrome://settings/' });
  await chrome.openUrl('file:///tmp/a.html', true);
  expect(tabs.create).toHaveBeenCalledWith({ url: 'file:///tmp/a.html', active: false });
});
