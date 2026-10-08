export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkNode[];
  folderType?: string;
  dateAdded?: number;
  dateLastUsed?: number;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  folder: string[];
}

/** Web pages open as ordinary links; browser pages and local files are opened through the tabs API. */
const OPENABLE_PROTOCOLS = new Set(['https:', 'http:', 'chrome:', 'file:']);

/** Normalized URL for a bookmark the new tab can open, or undefined for script/data and malformed URLs. */
export function safeBookmarkUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return OPENABLE_PROTOCOLS.has(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** True for http(s) pages, which a plain link can open and the favicon API can describe. */
export function isWebUrl(value: string): boolean {
  return /^https?:/i.test(value);
}

/** Short location shown next to a bookmark: the host, or the file name / browser page. */
export function bookmarkHost(value: string): string {
  const url = new URL(value);
  if (url.hostname) return url.hostname;
  if (url.protocol === 'file:') {
    const name = url.pathname.split('/').filter(Boolean).pop();
    return name ? decodeURIComponent(name) : 'file://';
  }
  return url.protocol;
}

export function flattenBookmarks(nodes: BookmarkNode[], path: string[] = []): Bookmark[] {
  return nodes.flatMap((node) => {
    if (node.url !== undefined) {
      const url = safeBookmarkUrl(node.url);
      return url ? [{ id: node.id, title: node.title.trim() || bookmarkHost(url), url, folder: path }] : [];
    }
    return flattenBookmarks(node.children ?? [], node.title ? [...path, node.title] : path);
  });
}

export function matchesBookmark(bookmark: Bookmark, query: string): boolean {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/);
  const text = [bookmark.title, bookmark.url, ...bookmark.folder].join(' ').toLocaleLowerCase();
  return terms.every((term) => text.includes(term));
}

export type MenuEntry =
  | { type: 'divider'; id: string }
  | { type: 'link'; bookmark: Bookmark; id: string }
  | { type: 'folder'; id: string; title: string; children: MenuEntry[]; count: number };

function menuEntries(nodes: BookmarkNode[], untitledFolder: string, path: string[] = []): MenuEntry[] {
  return nodes.flatMap((node): MenuEntry[] => {
    if (node.url !== undefined) {
      const bookmark = flattenBookmarks([node], path)[0];
      return bookmark ? [{ type: 'link', id: node.id, bookmark }] : [];
    }
    const children = menuEntries(node.children ?? [], untitledFolder, [...path, node.title]);
    const count = children.reduce((sum, entry) => sum + (entry.type === 'link' ? 1 : entry.type === 'folder' ? entry.count : 0), 0);
    return [{ type: 'folder', id: node.id, title: node.title || untitledFolder, children, count }];
  });
}

export function rootMenu(tree: BookmarkNode[], untitledFolder = 'Untitled folder'): MenuEntry[] {
  const roots = tree.length === 1 && tree[0]?.id === '0' ? tree[0].children ?? [] : tree;
  const bar = roots.find((node) => node.id === '1' || node.folderType === 'bookmarks-bar');
  if (!bar) return menuEntries(roots, untitledFolder);
  const primary = menuEntries(bar.children ?? [], untitledFolder);
  const secondary = menuEntries(roots.filter((node) => node !== bar && flattenBookmarks([node]).length > 0), untitledFolder);
  return [...primary, ...(primary.length && secondary.length ? [{ type: 'divider' as const, id: 'root-divider' }] : []), ...secondary];
}
