import {
  flattenBookmarks,
  matchesBookmark,
  type Bookmark,
  type BookmarkNode,
} from '../bookmarks/model';
export type PickerEntry =
  | { type: 'bookmark'; id: string; bookmark: Bookmark }
  | { type: 'folder'; id: string; title: string; count: number; children: PickerEntry[] };
export function bookmarkPickerTree(
  tree: BookmarkNode[],
  query = '',
  untitledFolder = 'Untitled folder',
): PickerEntry[] {
  const roots = tree.length === 1 && tree[0]?.id === '0' ? (tree[0].children ?? []) : tree;
  function visit(nodes: BookmarkNode[], path: string[]): PickerEntry[] {
    return nodes.flatMap((node): PickerEntry[] => {
      if (node.url !== undefined) {
        const bookmark = flattenBookmarks([node], path)[0];
        return bookmark && matchesBookmark(bookmark, query)
          ? [{ type: 'bookmark', id: node.id, bookmark }]
          : [];
      }
      const title = node.title.trim() || untitledFolder;
      const children = visit(node.children ?? [], [...path, title]);
      return children.length
        ? [
            {
              type: 'folder',
              id: node.id,
              title,
              children,
              count: children.reduce(
                (sum, child) => sum + (child.type === 'bookmark' ? 1 : child.count),
                0,
              ),
            },
          ]
        : [];
    });
  }
  return visit(roots, []);
}
