import { useI18n } from '../../i18n/react';
import { useDeferredValue, useMemo, useState } from 'react';
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HugeiconsIcon } from '@hugeicons/react';
import { DragDropVerticalIcon, Search01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { SiteMark } from '../../components/SiteMark';
import { type Bookmark, type BookmarkNode } from '../bookmarks/model';
import { BookmarkPicker } from './BookmarkPicker';
import { bookmarkPickerTree } from './bookmark-tree';
import { MAX_FAVORITES, type FavoriteAction } from '../favorites/model';

interface Props {
  bookmarks: Bookmark[];
  tree: BookmarkNode[];
  favorites: Bookmark[];
  busy: boolean;
  onChange: (action: FavoriteAction) => void;
}
function SortableRow({ bookmark, busy, onChange }: { bookmark: Bookmark } & Pick<Props, 'busy' | 'onChange'>) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: bookmark.id, disabled: busy });
  return <li ref={setNodeRef} className={`pinned-row ${isDragging ? 'is-dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <button ref={setActivatorNodeRef} {...attributes} {...listeners} className="drag-handle" aria-label={t('dragLabel', { title: bookmark.title })}><HugeiconsIcon aria-hidden="true" icon={DragDropVerticalIcon} size={16} /></button>
    <SiteMark bookmark={bookmark} size="small" /><span className="truncate">{bookmark.title}</span>
    <button className="icon-button remove-button" aria-label={t('removeLabel', { title: bookmark.title })} disabled={busy} onClick={() => onChange({ type: 'remove', id: bookmark.id })}><HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} size={14} /></button>
  </li>;
}
export function FavoriteSettings({ bookmarks, tree, favorites, busy, onChange }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const ids = useMemo(() => favorites.map((bookmark) => bookmark.id), [favorites]);
  const deferredQuery = useDeferredValue(query);
  const entries = useMemo(() => bookmarkPickerTree(tree, deferredQuery, t('untitledFolder')), [tree, deferredQuery, t]);
  const selected = useMemo(() => new Set(ids), [ids]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function dragEnd(event: DragEndEvent) {
    if (event.over && event.active.id !== event.over.id) onChange({ type: 'move', id: String(event.active.id), toIndex: ids.indexOf(String(event.over.id)) });
  }
  return <section className="settings-column favorites-settings" aria-labelledby="favorites-heading">
    <header className="section-heading"><h2 id="favorites-heading">{t('favorites')}</h2><p>{t('favoritesHint')}</p></header>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}
      accessibility={{ screenReaderInstructions: { draggable: t('dragInstructions') }, announcements: {
        onDragStart: ({ active }) => t('dragStarted', { title: favorites.find(item => item.id === active.id)?.title ?? '' }),
        onDragOver: ({ active, over }) => over ? t('dragOver', { title: favorites.find(item => item.id === active.id)?.title ?? '', position: ids.indexOf(String(over.id)) + 1, count: ids.length }) : undefined,
        onDragEnd: ({ active, over }) => t(over ? 'dragEnded' : 'dragCancelled', { title: favorites.find(item => item.id === active.id)?.title ?? '', position: ids.indexOf(String(over?.id)) + 1, count: ids.length }),
        onDragCancel: ({ active }) => t('dragCancelled', { title: favorites.find(item => item.id === active.id)?.title ?? '' }),
      } }}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="pinned-list">{favorites.map((bookmark) => <SortableRow key={bookmark.id} bookmark={bookmark} busy={busy} onChange={onChange} />)}</ul>
      </SortableContext>
    </DndContext>
    {!favorites.length && <p className="quiet-state">{t('favoritesEmpty')}</p>}
    <div className="add-bookmarks">
      <p className="muted-label">{t('addFromChrome')} <span>{favorites.length}/{MAX_FAVORITES}</span></p>
      <label className="search-field"><HugeiconsIcon aria-hidden="true" icon={Search01Icon} size={15} /><span className="sr-only">{t('searchBookmarks')}</span>
        <input type="search" placeholder={t('searchPlaceholder', { count: bookmarks.length })} value={query} onChange={(event) => { setQuery(event.target.value); }} />
      </label>
      <div className="bookmark-picker" aria-label={t('bookmarkFolders')}>
        <BookmarkPicker key={deferredQuery} entries={entries} selected={selected} searching={Boolean(deferredQuery.trim())} disabled={busy || favorites.length >= MAX_FAVORITES} onAdd={id => onChange({ type: 'add', id })} />
      </div>
      {!entries.length && <p className="quiet-state">{t(query ? 'noMatches' : 'addBookmarksHint')}</p>}
      {favorites.length >= MAX_FAVORITES && <p className="muted-label" role="status">{t('favoritesFull')}</p>}
    </div>
  </section>;
}
