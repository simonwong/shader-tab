import { expect, it } from 'vitest';
import { bookmarkPickerTree } from './bookmark-tree';
const tree = [{ id: '0', title: '', children: [
  { id: '1', title: '书签栏', children: [
    { id: 'work', title: '工作', children: [{ id: 'a', title: '文档', url: 'https://a.example/docs' }] },
    { id: 'read', title: '阅读', children: [{ id: 'b', title: '文档', url: 'https://b.example' }] },
    { id: 'unsafe', title: '脚本', url: 'javascript:alert(1)' },
  ] },
  { id: '2', title: '其他书签', children: [{ id: 'c', title: '新闻', url: 'https://c.example' }] },
] }];
it('preserves folders, IDs and ordering without exposing unsafe URLs or mutating Chrome data', () => {
  const before = structuredClone(tree);
  const result = bookmarkPickerTree(tree);
  expect(result.map(x => x.id)).toEqual(['1', '2']);
  expect(result[0]).toMatchObject({ type: 'folder', count: 2, children: [{ id: 'work', count: 1 }, { id: 'read', count: 1 }] });
  expect(JSON.stringify(result)).not.toContain('javascript:');
  expect(tree).toEqual(before);
});
it('keeps the full ancestor chain when searching by title, domain or folder', () => {
  expect(bookmarkPickerTree(tree, '工作 文档')[0]).toMatchObject({ id: '1', children: [{ id: 'work', children: [{ id: 'a', bookmark: { folder: ['书签栏', '工作'] } }] }] });
  expect(bookmarkPickerTree(tree, 'b.example')[0]).toMatchObject({ id: '1', children: [{ id: 'read' }] });
  expect(bookmarkPickerTree(tree, '不存在')).toEqual([]);
});
