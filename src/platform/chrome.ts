import { createStorage, type Store } from './storage';
import type { Platform } from './types';

const getTree = () => chrome.bookmarks.getTree();

const store: Store = {
  get: keys => chrome.storage.local.get(keys),
  set: items => chrome.storage.local.set(items),
  remove: keys => chrome.storage.local.remove(keys),
  watch: (matches, listener) => {
    const handle = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && Object.keys(changes).some(matches)) listener();
    };
    chrome.storage.onChanged.addListener(handle);
    return () => chrome.storage.onChanged.removeListener(handle);
  },
};

export const chromePlatform: Platform = {
  mode: 'extension',
  getTree,
  ...createStorage({ store, getTree, lockPrefix: 'glass-tab:' }),
  openUrl: async (url, background) => {
    if (background) {
      await chrome.tabs.create({ url, active: false });
      return;
    }
    const tab = await chrome.tabs.getCurrent();
    await (tab?.id === undefined
      ? chrome.tabs.update({ url })
      : chrome.tabs.update(tab.id, { url }));
  },
  watchBookmarks: listener => {
    // An import fires one onCreated per bookmark; skip those and refresh once when it ends.
    let importing = false;
    const changed = () => {
      if (!importing) listener();
    };
    const began = () => {
      importing = true;
    };
    const ended = () => {
      importing = false;
      listener();
    };
    const events = [
      chrome.bookmarks.onCreated,
      chrome.bookmarks.onRemoved,
      chrome.bookmarks.onChanged,
      chrome.bookmarks.onMoved,
      chrome.bookmarks.onChildrenReordered,
    ];
    events.forEach(event => event.addListener(changed));
    chrome.bookmarks.onImportBegan.addListener(began);
    chrome.bookmarks.onImportEnded.addListener(ended);
    return () => {
      events.forEach(event => event.removeListener(changed));
      chrome.bookmarks.onImportBegan.removeListener(began);
      chrome.bookmarks.onImportEnded.removeListener(ended);
    };
  },
};
