import {
  bookmarkRoots,
  flattenBookmarks,
  isWebUrl,
  type Bookmark,
  type BookmarkNode,
} from '../bookmarks/model';
import { MAX_FAVORITES } from '../favorites/model';

/**
 * Bookmarks to offer as a first set of favorites: web links on the bookmarks
 * bar, the ones directly on the bar before those in its folders, each URL once.
 */
export function bookmarkBarPicks(tree: BookmarkNode[], limit = MAX_FAVORITES): Bookmark[] {
  const { bar } = bookmarkRoots(tree);
  const children = bar?.children ?? [];
  const links = [
    ...flattenBookmarks(children.filter(node => node.url !== undefined)),
    ...flattenBookmarks(children.filter(node => node.url === undefined)),
  ];
  const urls = new Set<string>();
  return links
    .filter(bookmark => isWebUrl(bookmark.url) && !urls.has(bookmark.url) && urls.add(bookmark.url))
    .slice(0, Math.max(0, Math.min(limit, MAX_FAVORITES)));
}
