import type { Dispatch, PointerEvent, Ref, SetStateAction } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { HugeiconsIcon } from '@hugeicons/react';
import { GridViewIcon, Settings01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { useI18n } from '../../i18n/react';
import { GlassPanel } from '../../components/GlassPanel';
import { SiteMark } from '../../components/SiteMark';
import type { Bookmark, MenuEntry } from '../bookmarks/model';
import { BookmarkMenu } from './BookmarkMenu';
import type { DockPanel } from './use-dock-panels';

interface HoverZone {
  /** Whether the zone is shown (controls are awake and no modal is open). */
  visible: boolean;
  onEnter: () => void;
  onLeave: () => void;
}

interface DockProps extends HoverZone {
  showFavorites: boolean;
  showBookmarks: boolean;
  /** True while the settings dialog is open; panels stay closed meanwhile. */
  suspended: boolean;
  panel: DockPanel | null;
  onPanelChange: Dispatch<SetStateAction<DockPanel | null>>;
  favorites: Bookmark[];
  menu: MenuEntry[];
  favoritesButton: Ref<HTMLButtonElement>;
}

/** Bottom dock with the favorites tray and the full bookmark menu. */
export function Dock(props: DockProps) {
  const { showFavorites, showBookmarks, suspended, panel, onPanelChange, onEnter, onLeave } = props;
  const { t } = useI18n();
  const openOnHover = (next: DockPanel) => (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    onEnter();
    onPanelChange(next);
  };
  return <Menu.Root
    open={showBookmarks && panel === 'all' && !suspended}
    onOpenChange={open => onPanelChange(current => open ? 'all' : current === 'all' ? null : current)}
    modal={false}
  >
    {(showFavorites || showBookmarks) && <div className="dock-zone" data-visible={props.visible} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <GlassPanel className="dock ui-surface" role="navigation" aria-label={t('bookmarkNavigation')}>
        {showFavorites && <button
          ref={props.favoritesButton}
          className="dock-button"
          aria-label={t('favorites')}
          aria-expanded={panel === 'favorites'}
          aria-controls="favorites-tray"
          onPointerEnter={openOnHover('favorites')}
          onClick={() => onPanelChange('favorites')}
        >
          <HugeiconsIcon aria-hidden="true" icon={StarIcon} size={17} strokeWidth={1.7} />
        </button>}
        {showBookmarks && <Menu.Trigger asChild>
          <button
            className="dock-button"
            aria-label={t('allBookmarks')}
            onPointerDown={event => { if (event.pointerType === 'mouse' && panel === 'all') event.preventDefault(); }}
            onPointerEnter={openOnHover('all')}
          >
            <HugeiconsIcon aria-hidden="true" icon={GridViewIcon} size={17} strokeWidth={1.7} />
          </button>
        </Menu.Trigger>}
      </GlassPanel>
      {showFavorites && panel === 'favorites' && !suspended && <GlassPanel
        id="favorites-tray"
        className="favorites-tray ui-surface"
        role="region"
        aria-label={t('favorites')}
      >
        <div className="favorite-items">
          {props.favorites.map(bookmark => <a key={bookmark.id} className="favorite-tile" href={bookmark.url} title={bookmark.title}>
            <SiteMark bookmark={bookmark} />
            <span className="truncate">{bookmark.title}</span>
          </a>)}
        </div>
      </GlassPanel>}
    </div>}
    <BookmarkMenu entries={props.menu} onEnter={onEnter} onLeave={onLeave} />
  </Menu.Root>;
}

interface SettingsDockProps extends HoverZone {
  button: Ref<HTMLButtonElement>;
  onOpen: () => void;
}

export function SettingsDock({ visible, onEnter, onLeave, button, onOpen }: SettingsDockProps) {
  const { t } = useI18n();
  return <div className="dock-zone settings-zone" data-visible={visible} onPointerEnter={onEnter} onPointerLeave={onLeave}>
    <GlassPanel className="dock ui-surface">
      <button ref={button} className="dock-button" aria-label={t('settings')} onClick={onOpen}>
        <HugeiconsIcon aria-hidden="true" icon={Settings01Icon} size={15} strokeWidth={1.7} />
      </button>
    </GlassPanel>
  </div>;
}
