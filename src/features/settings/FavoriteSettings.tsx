import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HugeiconsIcon } from '@hugeicons/react';
import { DragDropVerticalIcon, Search01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { useI18n } from '../../i18n/react';
import { SiteMark } from '../../components/SiteMark';
import type { Bookmark, BookmarkNode } from '../bookmarks/model';
import { MAX_FAVORITES, type FavoriteAction } from '../favorites/model';
import { BookmarkPicker } from './BookmarkPicker';
import { bookmarkPickerTree } from './bookmark-tree';

interface Props {
  bookmarks: Bookmark[];
  tree: BookmarkNode[];
  /** Favorites in display order; already reflects edits that are still saving. */
  favorites: Bookmark[];
  disabled: boolean;
  /** Resolves false when the save failed and the edit was rolled back. */
  onChange: (action: FavoriteAction) => Promise<boolean>;
}

function SortableRow({ bookmark, disabled, onRemove }: { bookmark: Bookmark; disabled: boolean; onRemove: () => void }) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: bookmark.id, disabled });
  return <li ref={setNodeRef} className={`pinned-row ${isDragging ? 'is-dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <button ref={setActivatorNodeRef} {...attributes} {...listeners} className="drag-handle" aria-label={t('dragLabel', { title: bookmark.title })}>
      <HugeiconsIcon aria-hidden="true" icon={DragDropVerticalIcon} size={16} />
    </button>
    <SiteMark bookmark={bookmark} size="small" />
    <span className="truncate">{bookmark.title}</span>
    <button className="icon-button remove-button" aria-label={t('removeLabel', { title: bookmark.title })} disabled={disabled} onClick={onRemove}>
      <HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} size={14} />
    </button>
  </li>;
}

export function FavoriteSettings({ bookmarks, tree, favorites, disabled, onChange }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const ids = useMemo(() => favorites.map(bookmark => bookmark.id), [favorites]);
  // Local order so a drop lands immediately; it follows saved data and rolls back if the save fails.
  const [order, setOrder] = useState(ids);
  useEffect(() => setOrder(ids), [ids]);
  const byId = useMemo(() => new Map(favorites.map(bookmark => [bookmark.id, bookmark])), [favorites]);
  const rows = order.flatMap(id => byId.get(id) ?? []);
  const titleOf = (id: unknown) => byId.get(String(id))?.title ?? '';
  const deferredQuery = useDeferredValue(query);
  const entries = useMemo(() => bookmarkPickerTree(tree, deferredQuery, t('untitledFolder')), [tree, deferredQuery, t]);
  const selected = useMemo(() => new Set(ids), [ids]);
  const full = favorites.length >= MAX_FAVORITES;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function dragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    const from = order.indexOf(id);
    const to = event.over ? order.indexOf(String(event.over.id)) : -1;
    if (from < 0 || to < 0 || from === to) return;
    setOrder(arrayMove(order, from, to));
    void onChange({ type: 'move', id, toIndex: to }).then(saved => { if (!saved) setOrder(ids); });
  }

  return <section className="settings-column favorites-settings" aria-labelledby="favorites-heading">
    <header className="section-heading">
      <h2 id="favorites-heading">{t('favorites')}</h2>
      <p>{t('favoritesHint')}</p>
    </header>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={dragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: t('dragInstructions') },
        announcements: {
          onDragStart: ({ active }) => t('dragStarted', { title: titleOf(active.id) }),
          onDragOver: ({ active, over }) => over ? t('dragOver', { title: titleOf(active.id), position: order.indexOf(String(over.id)) + 1, count: order.length }) : undefined,
          onDragEnd: ({ active, over }) => t(over ? 'dragEnded' : 'dragCancelled', { title: titleOf(active.id), position: order.indexOf(String(over?.id)) + 1, count: order.length }),
          onDragCancel: ({ active }) => t('dragCancelled', { title: titleOf(active.id) }),
        },
      }}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className="pinned-list">
          {rows.map(bookmark => <SortableRow
            key={bookmark.id}
            bookmark={bookmark}
            disabled={disabled}
            onRemove={() => { void onChange({ type: 'remove', id: bookmark.id }); }}
          />)}
        </ul>
      </SortableContext>
    </DndContext>
    {!favorites.length && <p className="quiet-state">{t('favoritesEmpty')}</p>}
    <div className="add-bookmarks">
      <p className="muted-label">{t('addFromChrome')} <span>{favorites.length}/{MAX_FAVORITES}</span></p>
      <label className="search-field">
        <HugeiconsIcon aria-hidden="true" icon={Search01Icon} size={15} />
        <span className="sr-only">{t('searchBookmarks')}</span>
        <input type="search" placeholder={t('searchPlaceholder', { count: bookmarks.length })} value={query} onChange={event => setQuery(event.target.value)} />
      </label>
      <div className="bookmark-picker" aria-label={t('bookmarkFolders')}>
        <BookmarkPicker
          key={deferredQuery}
          entries={entries}
          selected={selected}
          searching={Boolean(deferredQuery.trim())}
          disabled={disabled}
          full={full}
          onAdd={id => { void onChange({ type: 'add', id }); }}
        />
      </div>
      {!entries.length && <p className="quiet-state">{t(query ? 'noMatches' : 'addBookmarksHint')}</p>}
      {full && <p className="muted-label" role="status">{t('favoritesFull')}</p>}
    </div>
  </section>;
}
