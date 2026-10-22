import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { GridViewIcon, Settings01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { useI18n } from '../../i18n/react';
import { GlassPanel } from '../../components/GlassPanel';
import { LiquidGlassPanel } from '../../components/LiquidGlassPanel';
import { SiteMark } from '../../components/SiteMark';
import type { Bookmark, MenuEntry } from '../bookmarks/model';
import type { FavoritesLayout } from '../preferences/model';
import { bookmarkClick, type OpenUrl } from './open-bookmark';
import type { DockPanel } from './use-dock-panels';

type BookmarkMenuComponent = typeof import('./BookmarkMenu').BookmarkMenu;

// The menu (and Base UI's menu code) stays out of the entry chunk; it loads on first hover/focus or when idle.
let menuModule: Promise<BookmarkMenuComponent> | undefined;
const loadBookmarkMenu = () =>
  (menuModule ??= import('./BookmarkMenu').then(module => module.BookmarkMenu));

/**
 * A dock button opens its panel after the pointer rests on it this long, so a
 * pointer crossing the dock (e.g. on its way to the macOS Dock) opens nothing.
 */
const HOVER_OPEN_DELAY = 140;

/**
 * Narrowest window that fits favorites tiled in the dock: each icon and the
 * menu button take 36 px, and 300 px stay clear on each side of the centered
 * dock for the settings button and the source pill, which widens on hover.
 */
const tiledQuery = (count: number) => `(min-width: ${(count + 1) * 36 + 16 + 600}px)`;

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    useCallback(
      (change: () => void) => {
        const list = matchMedia(query);
        list.addEventListener('change', change);
        return () => list.removeEventListener('change', change);
      },
      [query],
    ),
    () => matchMedia(query).matches,
  );
}

// Tab moves through the tiled icons as usual; Left/Right, Home and End move too.
function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(':scope > a, :scope > button'),
  );
  const from = items.indexOf(event.target as HTMLElement);
  // Keys from the menu popup bubble here through the portal; only the dock's own items move.
  if (from < 0) return;
  const to =
    event.key === 'ArrowLeft'
      ? from - 1
      : event.key === 'ArrowRight'
        ? from + 1
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : -1;
  const target = items[to];
  if (!target) return;
  event.preventDefault();
  target.focus();
}

interface HoverZone {
  /** Whether the zone is shown (controls are awake and no modal is open). */
  visible: boolean;
  onEnter: () => void;
  onLeave: () => void;
}

interface DockProps extends HoverZone {
  showFavorites: boolean;
  showBookmarks: boolean;
  favoritesLayout: FavoritesLayout;
  /** True while the settings dialog is open; panels stay closed meanwhile. */
  suspended: boolean;
  panel: DockPanel | null;
  onPanelChange: Dispatch<SetStateAction<DockPanel | null>>;
  favorites: Bookmark[];
  menu: MenuEntry[];
  favoritesButton: RefObject<HTMLButtonElement | null>;
  onOpenSettings: () => void;
  onOpenUrl: OpenUrl;
}

/**
 * Bottom dock with the favorites and the full bookmark menu. Favorites sit in
 * a tray behind the star, or as icons in the dock itself when that layout is
 * chosen and the window is wide enough; with no favorites the star stays.
 */
export function Dock(props: DockProps) {
  const { showFavorites, showBookmarks, suspended, panel, onPanelChange, onEnter, onLeave } = props;
  const { visible, favorites, menu, favoritesButton, onOpenSettings, onOpenUrl } = props;
  const { t } = useI18n();
  const fits = useMediaQuery(tiledQuery(favorites.length));
  const tiled = showFavorites && props.favoritesLayout === 'dock' && favorites.length > 0 && fits;
  const allButton = useRef<HTMLButtonElement>(null);
  const tray = useRef<HTMLDivElement>(null);
  const focusTray = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [BookmarkMenu, setBookmarkMenu] = useState<BookmarkMenuComponent>();
  const menuOpen = showBookmarks && panel === 'all' && !suspended;
  const trayOpen = showFavorites && !tiled && panel === 'favorites' && !suspended;
  const wantMenu = useCallback(() => {
    void loadBookmarkMenu().then(
      component => setBookmarkMenu(() => component),
      (error: unknown) => {
        menuModule = undefined;
        console.warn('Could not load the bookmark menu.', error);
      },
    );
  }, []);

  useEffect(() => {
    if (BookmarkMenu || !showBookmarks) return;
    const idle = requestIdleCallback(wantMenu, { timeout: 4000 });
    return () => cancelIdleCallback(idle);
  }, [BookmarkMenu, showBookmarks, wantMenu]);

  // A tray opened from the keyboard moves focus to its first entry.
  useEffect(() => {
    if (!trayOpen || !focusTray.current) return;
    focusTray.current = false;
    tray.current?.querySelector<HTMLElement>('a, button')?.focus();
  }, [trayOpen]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const openOnHover = (next: DockPanel) => (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    onEnter();
    clearTimeout(hoverTimer.current);
    // With a panel already open, moving to the other button switches at once.
    if (panel !== null) onPanelChange(next);
    else hoverTimer.current = setTimeout(() => onPanelChange(next), HOVER_OPEN_DELAY);
  };
  const cancelHover = () => clearTimeout(hoverTimer.current);
  const toggle = (next: DockPanel) => (event: MouseEvent) => {
    // detail is 0 for keyboard activation. A mouse click on a panel that hover already opened keeps it open.
    const keyboard = event.detail === 0;
    clearTimeout(hoverTimer.current);
    if (next === 'favorites') focusTray.current = keyboard;
    onPanelChange(current => (current === next && keyboard ? null : next));
  };
  // Placeholder only: once the menu chunk loads, its own trigger handles keys.
  const menuKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      onPanelChange('all');
    }
  };

  if (!showFavorites && !showBookmarks) return null;
  return (
    <div
      className="dock-zone bookmark-dock"
      data-visible={visible}
      onPointerEnter={() => {
        wantMenu();
        onEnter();
      }}
      onPointerLeave={onLeave}
      onFocus={wantMenu}
    >
      <LiquidGlassPanel
        className="dock ui-surface"
        role="navigation"
        aria-label={t('bookmarkNavigation')}
        data-layout={tiled ? 'dock' : 'tray'}
        onKeyDown={tiled ? moveFocus : undefined}
      >
        {tiled &&
          favorites.map(bookmark => (
            <a
              key={bookmark.id}
              className="dock-button dock-favorite"
              href={bookmark.url}
              aria-label={bookmark.title}
              {...bookmarkClick(bookmark.url, onOpenUrl)}
            >
              <SiteMark bookmark={bookmark} size="dock" />
            </a>
          ))}
        {tiled && showBookmarks && <span className="dock-divider" aria-hidden="true" />}
        {showFavorites && !tiled && (
          <button
            ref={favoritesButton}
            className="dock-button"
            aria-label={t('favorites')}
            aria-expanded={trayOpen}
            aria-controls="favorites-tray"
            onPointerEnter={openOnHover('favorites')}
            onPointerLeave={cancelHover}
            onClick={toggle('favorites')}
          >
            <HugeiconsIcon aria-hidden="true" icon={StarIcon} size={17} strokeWidth={1.7} />
          </button>
        )}
        {showBookmarks &&
          (BookmarkMenu ? (
            <BookmarkMenu
              open={menuOpen}
              onOpenChange={open =>
                onPanelChange(current => (open ? 'all' : current === 'all' ? null : current))
              }
              placeholder={allButton}
              onTriggerPointerEnter={openOnHover('all')}
              onTriggerPointerLeave={cancelHover}
              entries={menu}
              onEnter={onEnter}
              onLeave={onLeave}
              onOpenUrl={onOpenUrl}
            />
          ) : (
            <button
              ref={allButton}
              className="dock-button"
              aria-label={t('allBookmarks')}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onPointerEnter={openOnHover('all')}
              onPointerLeave={cancelHover}
              onClick={toggle('all')}
              onKeyDown={menuKey}
            >
              <HugeiconsIcon aria-hidden="true" icon={GridViewIcon} size={17} strokeWidth={1.7} />
            </button>
          ))}
      </LiquidGlassPanel>
      {trayOpen && (
        <GlassPanel
          ref={tray}
          id="favorites-tray"
          className="favorites-tray ui-surface"
          role="region"
          aria-label={t('favorites')}
        >
          {favorites.length ? (
            <div className="favorite-items">
              {favorites.map(bookmark => (
                <a
                  key={bookmark.id}
                  className="favorite-tile"
                  href={bookmark.url}
                  title={bookmark.title}
                  {...bookmarkClick(bookmark.url, onOpenUrl)}
                >
                  <SiteMark bookmark={bookmark} />
                  <span className="truncate">{bookmark.title}</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="favorites-empty">
              <p>{t('favoritesEmpty')}</p>
              <button className="small-button" onClick={onOpenSettings}>
                {t('openSettings')}
              </button>
            </div>
          )}
        </GlassPanel>
      )}
    </div>
  );
}

interface SettingsDockProps extends HoverZone {
  button: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
}

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Cmd/Ctrl + , opens settings while the page has focus. Chrome keeps the
 * shortcut for itself when the address bar is focused, which is the case on a
 * freshly opened tab until the page is clicked.
 */
export const SETTINGS_SHORTCUT = {
  label: MAC ? '⌘,' : 'Ctrl+,',
  aria: MAC ? 'Meta+Comma' : 'Control+Comma',
};

export function SettingsDock({ visible, onEnter, onLeave, button, onOpen }: SettingsDockProps) {
  const { t } = useI18n();
  return (
    <div
      className="dock-zone settings-zone"
      data-visible={visible}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <LiquidGlassPanel className="dock ui-surface">
        <button
          ref={button}
          className="dock-button"
          aria-label={t('settings')}
          aria-keyshortcuts={SETTINGS_SHORTCUT.aria}
          title={`${t('settings')} (${SETTINGS_SHORTCUT.label})`}
          onClick={onOpen}
        >
          <HugeiconsIcon aria-hidden="true" icon={Settings01Icon} size={15} strokeWidth={1.7} />
        </button>
      </LiquidGlassPanel>
    </div>
  );
}
