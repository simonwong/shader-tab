import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FAVORITES_KEY } from '../features/favorites/model';
import { PREFERENCE_PREFIX } from '../features/preferences/model';
import { variantShuffleKey } from '../features/preferences/variant-shuffle';
import type { BookmarkNode } from '../features/bookmarks/model';

function fakeEvent() {
  const listeners = new Set<() => void>();
  return {
    addListener: (listener: () => void) => listeners.add(listener),
    removeListener: (listener: () => void) => listeners.delete(listener),
    fire: () => listeners.forEach(listener => listener()),
  };
}

let store: Record<string, unknown>;
let tree: BookmarkNode[];
const storage = {
  get: vi.fn(async (keys: string[] | null) => structuredClone(keys === null ? store : Object.fromEntries(keys.filter(key => key in store).map(key => [key, store[key]])))),
  set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(store, structuredClone(items)); }),
  remove: vi.fn(async (keys: string[]) => { for (const key of keys) delete store[key]; }),
};
const bookmarks = {
  getTree: vi.fn(async () => structuredClone(tree)),
  onCreated: fakeEvent(), onRemoved: fakeEvent(), onChanged: fakeEvent(), onMoved: fakeEvent(),
  onChildrenReordered: fakeEvent(), onImportBegan: fakeEvent(), onImportEnded: fakeEvent(),
};
const tabs = { getCurrent: vi.fn(async () => ({ id: 7 })), update: vi.fn(async () => ({})), create: vi.fn(async () => ({})) };

beforeEach(() => {
  store = {};
  tree = [{ id: '0', title: '', children: [{ id: '1', title: 'Bar', children: [
    { id: 'a', title: 'A', url: 'https://a.example/' },
    { id: 'b', title: 'B', url: 'https://b.example/' },
  ] }] }];
  vi.clearAllMocks();
  vi.stubGlobal('chrome', { storage: { local: storage, onChanged: fakeEvent() }, bookmarks, tabs });
  // Exclusive per-name locks, like the Web Locks API.
  const queues = new Map<string, Promise<unknown>>();
  vi.stubGlobal('navigator', { locks: { request: (name: string, task: () => Promise<unknown>) => {
    const run = (queues.get(name) ?? Promise.resolve()).then(task);
    queues.set(name, run.catch(() => {}));
    return run;
  } } });
});
afterEach(() => vi.unstubAllGlobals());

const platform = async () => (await import('./chrome')).chromePlatform;

it('never writes storage for a single-variant effect', async () => {
  const draw = await (await platform()).nextEffectVariant('crt-terminal');
  await draw.saved;
  expect(draw.variant).toBe('terminal');
  expect(storage.get).not.toHaveBeenCalled();
  expect(storage.set).not.toHaveBeenCalled();
});

it('returns the bag head after one read and records it in the background', async () => {
  store[variantShuffleKey('pixel-blast')] = { remaining: ['circle', 'diamond'], last: 'square' };
  const draw = await (await platform()).nextEffectVariant('pixel-blast');
  expect(draw.variant).toBe('circle');
  await draw.saved;
  expect(store[variantShuffleKey('pixel-blast')]).toEqual({ remaining: ['diamond'], last: 'circle' });
});

it('shares one full storage read between favorites and preferences at startup', async () => {
  const chrome = await platform();
  await Promise.all([chrome.getFavorites(), chrome.getPreferences()]);
  expect(storage.get).toHaveBeenCalledTimes(1);
});

it('writes favorites with URLs and removes legacy keys on the first ordered write', async () => {
  store = { 'favorite:v1:a': true, 'favorite:v1:gone': true };
  await (await platform()).updateFavorites({ type: 'add', id: 'b' });
  expect(store).toEqual({ [FAVORITES_KEY]: [{ id: 'a', url: 'https://a.example/' }, { id: 'b', url: 'https://b.example/' }] });
});

it('applies functional preference updates to the latest stored value', async () => {
  store[PREFERENCE_PREFIX + 'effects'] = ['dithering'];
  const chrome = await platform();
  await Promise.all([
    chrome.updatePreferences(current => ({ effects: [...current.effects, 'pixel-blast'] })),
    chrome.updatePreferences(current => ({ effects: [...current.effects, 'crt-terminal'] })),
  ]);
  expect(store[PREFERENCE_PREFIX + 'effects']).toEqual(['dithering', 'pixel-blast', 'crt-terminal']);
});

it('refreshes once after a bookmark import instead of once per created bookmark', async () => {
  const listener = vi.fn();
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
