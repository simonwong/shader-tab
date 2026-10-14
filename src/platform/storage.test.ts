import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { BookmarkNode } from '../features/bookmarks/model';
import { FAVORITES_KEY, MAX_FAVORITES } from '../features/favorites/model';
import { PREFERENCE_PREFIX } from '../features/preferences/model';
import { variantShuffleKey } from '../features/preferences/variant-shuffle';
import { createStorage, type Store, type StorageOptions } from './storage';

function memoryStore(initial: Record<string, unknown> = {}) {
  const items: Record<string, unknown> = structuredClone(initial);
  const listeners = new Set<(keys: string[]) => void>();
  const notify = (keys: string[]) => listeners.forEach(listener => listener(keys));
  const store = {
    items,
    get: vi.fn<Store['get']>(async keys =>
      structuredClone(
        keys === null
          ? items
          : Object.fromEntries(keys.filter(key => key in items).map(key => [key, items[key]])),
      ),
    ),
    set: async (next: Record<string, unknown>) => {
      Object.assign(items, structuredClone(next));
      notify(Object.keys(next));
    },
    remove: async (keys: string[]) => {
      for (const key of keys) delete items[key];
      notify(keys);
    },
    watch: (matches: (key: string) => boolean, listener: () => void) => {
      const handle = (keys: string[]) => {
        if (keys.some(matches)) listener();
      };
      listeners.add(handle);
      return () => listeners.delete(handle);
    },
  } satisfies Store & { items: Record<string, unknown> };
  return store;
}

const link = (id: string): BookmarkNode => ({ id, title: id, url: `https://${id}.example/` });
let tree: BookmarkNode[];
const storage = (store: Store, options: Partial<StorageOptions> = {}) =>
  createStorage({
    store,
    getTree: async () => structuredClone(tree),
    lockPrefix: 'test:',
    ...options,
  });

beforeEach(() => {
  tree = [
    {
      id: '0',
      title: '',
      children: [{ id: '1', title: 'Bar', children: 'abcdefghijkl'.split('').map(link) }],
    },
  ];
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

it('returns the bag head after one read and records it in the background', async () => {
  const store = memoryStore({
    [variantShuffleKey('pixel-blast')]: { remaining: ['circle', 'diamond'], last: 'square' },
  });
  const draw = await storage(store).nextEffectVariant('pixel-blast', []);
  expect(draw.variant).toBe('circle');
  await draw.saved;
  expect(store.items[variantShuffleKey('pixel-blast')]).toEqual({
    remaining: ['diamond'],
    last: 'circle',
  });
});

it('shares one full read between favorites and preferences at startup only', async () => {
  const store = memoryStore();
  const platform = storage(store);
  await Promise.all([platform.getFavorites(), platform.getPreferences()]);
  expect(store.get).toHaveBeenCalledTimes(1);
  await Promise.all([platform.getFavorites(), platform.getPreferences()]);
  expect(store.get).toHaveBeenCalledTimes(3);
});

it('writes favorites with URLs and removes legacy keys on the first ordered write', async () => {
  const store = memoryStore({ 'favorite:v1:a': true, 'favorite:v1:gone': true });
  await storage(store).updateFavorites({ type: 'add', id: 'b' });
  expect(store.items).toEqual({
    [FAVORITES_KEY]: [
      { id: 'a', url: 'https://a.example/' },
      { id: 'b', url: 'https://b.example/' },
    ],
  });
});

it('lets only one of two concurrent adds take the last favorite slot', async () => {
  const ids = 'abcdefghi'.split('');
  const store = memoryStore({ [FAVORITES_KEY]: ids });
  const platform = storage(store);
  const results = await Promise.allSettled([
    platform.updateFavorites({ type: 'add', id: 'j' }),
    platform.updateFavorites({ type: 'add', id: 'k' }),
  ]);
  expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected']);
  expect(await platform.getFavorites()).toHaveLength(MAX_FAVORITES);
});

it('shows sample favorites until one is saved, without ending onboarding', async () => {
  const store = memoryStore();
  const platform = storage(store, { sampleFavorites: [{ id: 'a' }, { id: 'b' }] });
  expect(await platform.getFavorites()).toEqual([{ id: 'a' }, { id: 'b' }]);
  expect((await platform.getPreferences()).onboarding).toBe(true);
  await platform.updateFavorites({ type: 'remove', id: 'a' });
  expect(await platform.getFavorites()).toEqual([{ id: 'b', url: 'https://b.example/' }]);
});

it('applies functional preference updates to the latest stored value', async () => {
  const store = memoryStore({ [PREFERENCE_PREFIX + 'effects']: ['dithering'] });
  const platform = storage(store);
  await Promise.all([
    platform.updatePreferences(current => ({ effects: [...current.effects, 'pixel-blast'] })),
    platform.updatePreferences(current => ({ effects: [...current.effects, 'data-pixel-arc'] })),
  ]);
  expect(store.items[PREFERENCE_PREFIX + 'effects']).toEqual([
    'dithering',
    'pixel-blast',
    'data-pixel-arc',
  ]);
});

it('notifies favorites and preferences watchers only of their own keys', async () => {
  const platform = storage(memoryStore());
  const favorites = vi.fn<() => void>();
  const preferences = vi.fn<() => void>();
  platform.watchFavorites(favorites);
  platform.watchPreferences(preferences);
  await (
    await platform.nextEffectVariant('dithering', [])
  ).saved;
  expect(favorites).not.toHaveBeenCalled();
  expect(preferences).not.toHaveBeenCalled();
  await platform.updateFavorites({ type: 'add', id: 'a' });
  await platform.updatePreferences({ motion: 'still' });
  expect(favorites).toHaveBeenCalledTimes(1);
  expect(preferences).toHaveBeenCalledTimes(1);
});
