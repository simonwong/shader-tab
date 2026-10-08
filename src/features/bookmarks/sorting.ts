import { bookmarkHost, safeBookmarkUrl, type BookmarkNode } from './model';

export const BOOKMARK_SORTS = ['chrome', 'name-asc', 'name-desc', 'newest', 'oldest', 'recent'] as const;
export type BookmarkSort = typeof BOOKMARK_SORTS[number];
export function isBookmarkSort(value: unknown): value is BookmarkSort {
  return BOOKMARK_SORTS.includes(value as BookmarkSort);
}
const title = (node: BookmarkNode) => {
  const url = node.url === undefined ? undefined : safeBookmarkUrl(node.url);
  return node.title.trim() || (url ? bookmarkHost(url) : '');
};
/** `locale` should be the UI locale; undefined falls back to the runtime default. */
export function sortBookmarkTree(tree: BookmarkNode[], sort: BookmarkSort, locale?: string): BookmarkNode[] {
  if (sort === 'chrome') return tree;
  const names = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  const sortChildren = (nodes: BookmarkNode[]): BookmarkNode[] => nodes.map(node => ({
    ...node, ...(node.children ? { children: sortChildren(node.children) } : {}),
  })).sort((left, right) => {
    if (Boolean(left.url) !== Boolean(right.url)) return left.url ? 1 : -1;
    if (sort === 'name-asc' || sort === 'name-desc') return names.compare(title(left), title(right)) * (sort === 'name-asc' ? 1 : -1);
    if (!left.url && !right.url) return 0;
    const field = sort === 'recent' ? 'dateLastUsed' : 'dateAdded';
    const a = left[field], b = right[field];
    const hasA = typeof a === 'number' && Number.isFinite(a) && a > 0;
    const hasB = typeof b === 'number' && Number.isFinite(b) && b > 0;
    if (!hasA || !hasB) return hasA ? -1 : hasB ? 1 : 0;
    return sort === 'oldest' ? a - b : b - a;
  });
  const sortRoot = (node: BookmarkNode): BookmarkNode => ({ ...node, ...(node.children ? { children: sortChildren(node.children) } : {}) });
  return tree.map(node => node.id === '0' ? { ...node, children: node.children?.map(sortRoot) } : sortRoot(node));
}
