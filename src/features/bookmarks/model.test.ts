import { describe, expect, it } from 'vitest';
import { bookmarkHost, flattenBookmarks, isWebUrl, matchesBookmark, safeBookmarkUrl } from './model';

describe('bookmark projection', () => {
  it('keeps IDs and folder paths without changing the browser tree', () => {
    const tree = [{ id: '0', title: '', children: [{ id: '1', title: '工作', children: [
      { id: '2', title: '文档', url: 'https://example.com/docs' },
      { id: '3', title: '', url: 'https://example.com/other' },
    ] }] }];
    const before = structuredClone(tree);
    expect(flattenBookmarks(tree)).toEqual([
      { id: '2', title: '文档', url: 'https://example.com/docs', folder: ['工作'] },
      { id: '3', title: 'example.com', url: 'https://example.com/other', folder: ['工作'] },
    ]);
    expect(tree).toEqual(before);
  });
  it.each(['javascript:alert(1)', 'data:text/html,hello', 'invalid', 'blob:https://example.com/1', 'about:blank'])('does not expose unsupported URL %s', (url) => {
    expect(safeBookmarkUrl(url)).toBeUndefined();
    expect(flattenBookmarks([{ id: '1', title: 'unsafe', url }])).toEqual([]);
  });
  it('keeps browser pages and local files, which open through the tabs API', () => {
    expect(flattenBookmarks([
      { id: '1', title: '', url: 'chrome://settings/appearance' },
      { id: '2', title: 'Notes', url: 'file:///Users/me/notes%20today.html' },
      { id: '3', title: '', url: 'file:///tmp/report.pdf' },
    ])).toEqual([
      { id: '1', title: 'settings', url: 'chrome://settings/appearance', folder: [] },
      { id: '2', title: 'Notes', url: 'file:///Users/me/notes%20today.html', folder: [] },
      { id: '3', title: 'report.pdf', url: 'file:///tmp/report.pdf', folder: [] },
    ]);
    expect(bookmarkHost('file:///Users/me/notes%20today.html')).toBe('notes today.html');
    expect(isWebUrl('https://example.com')).toBe(true);
    expect(isWebUrl('chrome://settings')).toBe(false);
    expect(isWebUrl('file:///tmp/a')).toBe(false);
  });
  it('matches all search terms across name, URL and folder', () => {
    const bookmark = { id: '1', title: 'React', url: 'https://react.dev/', folder: ['开发'] };
    expect(matchesBookmark(bookmark, ' REACT 开发 ')).toBe(true);
    expect(matchesBookmark(bookmark, 'react missing')).toBe(false);
    expect(matchesBookmark(bookmark, '')).toBe(true);
  });
});

it('shows bookmark bar contents first and only nonempty secondary roots', async () => {
  const { rootMenu } = await import('./model');
  const entries = rootMenu([{ id: '0', title: '', children: [
    { id: '1', title: 'Bookmarks bar', children: [{ id: 'folder', title: 'Work', children: [{ id: 'a', title: 'A', url: 'https://a.example' }] }] },
    { id: '2', title: 'Other', children: [{ id: 'b', title: 'B', url: 'https://b.example' }] },
    { id: '3', title: 'Mobile', children: [] },
  ] }]);
  expect(entries.map((entry) => entry.id)).toEqual(['folder', 'root-divider', '2']);
  expect(entries[0]).toMatchObject({ type: 'folder', count: 1 });
});
