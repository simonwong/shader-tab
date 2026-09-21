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

export function safeBookmarkUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function flattenBookmarks(nodes: BookmarkNode[], path: string[] = []): Bookmark[] {
  return nodes.flatMap((node) => {
    if (node.url !== undefined) {
      const url = safeBookmarkUrl(node.url);
      return url ? [{ id: node.id, title: node.title.trim() || new URL(url).hostname, url, folder: path }] : [];
    }
    return flattenBookmarks(node.children ?? [], node.title ? [...path, node.title] : path);
  });
}

export function matchesBookmark(bookmark: Bookmark, query: string): boolean {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/);
  const text = [bookmark.title, bookmark.url, ...bookmark.folder].join(' ').toLocaleLowerCase();
  return terms.every((term) => text.includes(term));
}

export type MenuEntry = { type: 'divider'; id: string } | { type: 'link'; bookmark: Bookmark; id: string } | { type: 'folder'; id: string; title: string; children: MenuEntry[]; count: number };
function menuEntries(nodes: BookmarkNode[], untitledFolder: string, path: string[] = []): MenuEntry[] {
  return nodes.flatMap((node): MenuEntry[] => {
    if (node.url !== undefined) {
      const bookmark = flattenBookmarks([node], path)[0];
      return bookmark ? [{ type: 'link', id: node.id, bookmark }] : [];
    }
    const children = menuEntries(node.children ?? [], untitledFolder, [...path, node.title]);
    return [{ type: 'folder', id: node.id, title: node.title || untitledFolder, children, count: children.reduce((count, entry) => count + (entry.type === 'link' ? 1 : entry.type === 'folder' ? entry.count : 0), 0) }];
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
