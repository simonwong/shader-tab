import { useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { Menu } from '@base-ui/react/menu';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, Folder01Icon, GridViewIcon } from '@hugeicons/core-free-icons';
import { useI18n } from '../../i18n/react';
import { SiteMark } from '../../components/SiteMark';
import type { MenuEntry } from '../bookmarks/model';
import { bookmarkClick, type OpenUrl } from './open-bookmark';

/** Rows rendered per page; long folders grow by this much on "Show more". */
const PAGE = 80;

interface ItemsProps {
  entries: MenuEntry[];
  onEnter: () => void;
  onLeave: () => void;
  onOpenUrl: OpenUrl;
}

function Items({ entries, onEnter, onLeave, onOpenUrl }: ItemsProps) {
  const { t } = useI18n();
  const [limit, setLimit] = useState(PAGE);
  if (!entries.length) return <Menu.Item disabled className="menu-empty">{t('noBookmarks')}</Menu.Item>;
  return <>
    {entries.slice(0, limit).map(entry => {
      if (entry.type === 'divider') return <Menu.Separator className="menu-separator" key={entry.id} />;
      if (entry.type === 'link') return <Menu.LinkItem
        key={entry.id}
        className="menu-row"
        href={entry.bookmark.url}
        title={entry.bookmark.title}
        label={entry.bookmark.title}
        onClick={bookmarkClick(entry.bookmark.url, onOpenUrl)}
      >
        <SiteMark bookmark={entry.bookmark} size="menu" />
        <span className="truncate">{entry.bookmark.title}</span>
      </Menu.LinkItem>;
      return <Menu.SubmenuRoot key={entry.id}>
        <Menu.SubmenuTrigger className="menu-row" label={entry.title}>
          <HugeiconsIcon aria-hidden="true" icon={Folder01Icon} size={16} strokeWidth={1.8} />
          <span className="truncate">{entry.title}</span>
          <span className="folder-count">{entry.count}</span>
          <HugeiconsIcon aria-hidden="true" icon={ArrowRight01Icon} size={14} />
        </Menu.SubmenuTrigger>
        <Menu.Portal>
          <Menu.Positioner className="menu-positioner" sideOffset={13} collisionPadding={16}>
            <Menu.Popup className="glass bookmark-menu submenu ui-surface" onPointerEnter={onEnter} onPointerLeave={onLeave}>
              <Items entries={entry.children} onEnter={onEnter} onLeave={onLeave} onOpenUrl={onOpenUrl} />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.SubmenuRoot>;
    })}
    {entries.length > limit && <Menu.Item
      className="menu-row menu-more"
      closeOnClick={false}
      onClick={() => setLimit(limit + PAGE)}
    >
      {t('showMore', { count: entries.length - limit })}
    </Menu.Item>}
  </>;
}

interface Props extends ItemsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The placeholder dock button this trigger replaces; focus moves over if it had it. */
  placeholder: RefObject<HTMLButtonElement | null>;
  onTriggerPointerEnter: (event: PointerEvent) => void;
}

/**
 * Every Chrome bookmark as a nested menu above the dock. This chunk loads
 * after the page; until then the dock shows a plain placeholder button, which
 * this component's trigger replaces. Base UI needs a real Menu.Trigger: it
 * registers the root menu in the floating tree, without which opening a
 * submenu would close the root menu as a "sibling".
 */
export function BookmarkMenu({ open, onOpenChange, placeholder, onTriggerPointerEnter, ...items }: Props) {
  const { t } = useI18n();
  const button = useRef<HTMLButtonElement>(null);
  // Read during the first render, while the placeholder is still in the document.
  const [takeFocus] = useState(() => placeholder.current !== null && document.activeElement === placeholder.current);
  useLayoutEffect(() => { if (takeFocus) button.current?.focus(); }, [takeFocus]);

  return <Menu.Root
    open={open}
    modal={false}
    onOpenChange={(next, details) => {
      // A mouse click on a menu that hover already opened keeps it open; keyboard activation toggles.
      const event = details.event;
      if (!next && details.reason === 'trigger-press' && event instanceof MouseEvent && event.detail > 0) return;
      onOpenChange(next);
    }}
  >
    <Menu.Trigger
      ref={button}
      className="dock-button"
      aria-label={t('allBookmarks')}
      onPointerEnter={onTriggerPointerEnter}
    >
      <HugeiconsIcon aria-hidden="true" icon={GridViewIcon} size={17} strokeWidth={1.7} />
    </Menu.Trigger>
    <Menu.Portal>
      <Menu.Positioner className="menu-positioner" side="top" align="center" sideOffset={19} collisionPadding={16}>
        <Menu.Popup
          className="glass bookmark-menu ui-surface"
          id="bookmark-menu"
          aria-label={t('allBookmarks')}
          // Escape returns focus to the dock button; pointer dismissals leave focus alone.
          finalFocus={closeType => closeType === 'keyboard'}
          onPointerEnter={items.onEnter}
          onPointerLeave={items.onLeave}
        >
          <Items {...items} />
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  </Menu.Root>;
}
