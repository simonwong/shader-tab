import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Tick02Icon,
  ArrowRight01Icon,
  Folder01Icon,
  FolderOpenIcon,
  Add01Icon,
} from '@hugeicons/core-free-icons';
import { useI18n } from '../../i18n/react';
import { SiteMark } from '../../components/SiteMark';
import { bookmarkHost } from '../bookmarks/model';
import type { PickerEntry } from './bookmark-tree';

interface Props {
  entries: PickerEntry[];
  selected: Set<string>;
  disabled: boolean;
  /** The favorites limit is reached; add buttons stay focusable but do nothing. */
  full: boolean;
  searching: boolean;
  onAdd: (id: string) => void;
  depth?: number;
}

type FolderProps = Omit<Props, 'entries' | 'depth'> & {
  entry: Extract<PickerEntry, { type: 'folder' }>;
  depth: number;
};

function FolderRow({ entry, depth, ...props }: FolderProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const open = props.searching || expanded;
  return (
    <li>
      <details
        open={open}
        onToggle={event => {
          if (!props.searching) setExpanded(event.currentTarget.open);
        }}
      >
        <summary className="picker-folder" style={{ paddingLeft: Math.min(depth, 5) * 12 + 6 }}>
          <HugeiconsIcon
            aria-hidden="true"
            icon={ArrowRight01Icon}
            className="folder-chevron"
            size={12}
          />
          <HugeiconsIcon aria-hidden="true" icon={open ? FolderOpenIcon : Folder01Icon} size={16} />
          <span className="truncate">{entry.title}</span>
          <small>{entry.count}</small>
        </summary>
        {open && <BookmarkPicker {...props} entries={entry.children} depth={depth + 1} />}
      </details>
    </li>
  );
}

export function BookmarkPicker({ entries, depth = 0, ...props }: Props) {
  const { t } = useI18n();
  const [limit, setLimit] = useState(40);
  return (
    <ul className="picker-branch">
      {entries.slice(0, limit).map(entry => {
        if (entry.type === 'folder')
          return <FolderRow key={entry.id} entry={entry} depth={depth} {...props} />;
        const selected = props.selected.has(entry.id);
        const { bookmark } = entry;
        return (
          <li
            className="picker-bookmark"
            key={entry.id}
            style={{ paddingLeft: Math.min(depth, 5) * 12 + 22 }}
          >
            <SiteMark bookmark={bookmark} size="menu" />
            <span className="candidate-copy">
              <span className="truncate">{bookmark.title}</span>
              <small className="truncate">{bookmarkHost(bookmark.url)}</small>
            </span>
            <button
              className="picker-add"
              aria-label={t(selected ? 'addedLabel' : 'addLabel', { title: bookmark.title })}
              aria-disabled={props.full && !selected ? true : undefined}
              disabled={selected || props.disabled}
              onClick={() => {
                if (!props.full) props.onAdd(entry.id);
              }}
            >
              <HugeiconsIcon
                aria-hidden="true"
                icon={selected ? Tick02Icon : Add01Icon}
                size={14}
              />
            </button>
          </li>
        );
      })}
      {entries.length > limit && (
        <li>
          <button className="text-button" onClick={() => setLimit(limit + 40)}>
            {t('showMore', { count: entries.length - limit })}
          </button>
        </li>
      )}
    </ul>
  );
}
