import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { I18nContext, useLanguage } from '../../i18n/react';
import { asError, errorMessage, MessageError } from '../../i18n/core';
import { SettingsBoundary, SettingsLoading } from '../../components/SettingsBoundary';
import { AmbientBackground } from '../../effects/AmbientBackground';
import { SourceBadge } from '../../effects/SourceBadge';
import { flattenBookmarks, rootMenu } from '../../features/bookmarks/model';
import { sortBookmarkTree } from '../../features/bookmarks/sorting';
import type { FavoriteAction } from '../../features/favorites/model';
import { DEFAULT_PREFERENCES, type Preferences } from '../../features/preferences/model';
import { useEffectSelection } from '../../features/preferences/use-effect-selection';
import { useTheme } from '../../features/preferences/use-theme';
import { Dock, SettingsDock } from '../../features/navigation/Dock';
import { useDockPanels } from '../../features/navigation/use-dock-panels';
import { useGlobalShortcuts } from '../../features/navigation/use-global-shortcuts';
import { useIdleControls } from '../../features/navigation/use-idle';
import type { Platform } from '../../platform/types';
import { useLiveQuery } from '../../platform/use-live-query';

const SettingsDialog = lazy(() => import('../../features/settings/SettingsDialog').then(module => ({ default: module.SettingsDialog })));

export function App({ platform }: { platform: Platform }) {
  const tree = useLiveQuery(platform.getTree, platform.watchBookmarks);
  const savedFavorites = useLiveQuery(platform.getFavorites, platform.watchFavorites);
  const savedPreferences = useLiveQuery(platform.getPreferences, platform.watchPreferences);
  const preferences = savedPreferences.data ?? DEFAULT_PREFERENCES;
  const i18n = useLanguage(preferences.language);
  const { locale, t } = i18n;
  const theme = useTheme(preferences.appearance);

  const [settings, setSettings] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [writeError, setWriteError] = useState<Error>();
  const settingsButton = useRef<HTMLButtonElement>(null);
  const favoritesButton = useRef<HTMLButtonElement>(null);
  const settingsReturnFocus = useRef<HTMLElement | null>(null);

  const { effect, variant } = useEffectSelection({
    platform,
    preferences,
    ready: savedPreferences.data !== undefined,
    onDrawError: () => setWriteError(new MessageError('randomFailed')),
  });
  const dock = useDockPanels(preferences);
  const visible = useIdleControls(preferences.idleDelay, dock.inside || dock.panel !== null || settings);
  const controlsVisible = visible && !settings;

  const bookmarks = useMemo(() => flattenBookmarks(tree.data ?? []), [tree.data]);
  const sortedTree = useMemo(
    () => sortBookmarkTree(tree.data ?? [], preferences.bookmarkSort, locale),
    [tree.data, preferences.bookmarkSort, locale],
  );
  const menu = useMemo(() => rootMenu(sortedTree, t('untitledFolder')), [sortedTree, t]);
  const favorites = useMemo(() => (savedFavorites.data ?? []).flatMap(id => {
    const bookmark = bookmarks.find(item => item.id === id);
    return bookmark ? [bookmark] : [];
  }), [bookmarks, savedFavorites.data]);
  const readError = tree.error || savedFavorites.error || savedPreferences.error;
  const ready = tree.data !== undefined && savedFavorites.data !== undefined && savedPreferences.data !== undefined;
  const shownError = readError || writeError;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = platform.mode === 'preview' ? t('previewTitle') : 'Shader Tab';
  }, [locale, t, platform.mode]);
  useLayoutEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const { closeNow, setPanel } = dock;
  const openSettings = useCallback(() => {
    const fromFavorites = document.activeElement instanceof HTMLElement && document.activeElement.closest('.favorites-tray');
    settingsReturnFocus.current = fromFavorites ? favoritesButton.current : settingsButton.current;
    closeNow();
    setSettingsLoaded(true);
    setSettings(true);
  }, [closeNow]);
  useGlobalShortcuts({
    onOpenSettings: openSettings,
    onEscape: () => {
      if (settings) {
        setSettings(false);
        settingsReturnFocus.current?.focus();
      } else if (dock.panel === 'favorites') {
        setPanel(null);
        favoritesButton.current?.focus();
      }
    },
  });

  async function save(task: () => Promise<void>) {
    setBusy(true);
    setWriteError(undefined);
    try { await task(); }
    catch (error) { setWriteError(asError(error, 'saveFailed')); }
    finally { setBusy(false); }
  }
  const onFavoriteChange = (action: FavoriteAction) => { void save(() => platform.updateFavorites(action)); };
  const onPreferenceChange = (patch: Partial<Preferences>) => { void save(() => platform.updatePreferences(patch)); };
  const closeSettings = () => setSettings(false);
  const restoreFocus = () => (settingsReturnFocus.current?.isConnected ? settingsReturnFocus.current : settingsButton.current)?.focus();

  return <I18nContext.Provider value={i18n}>
    <main inert={settings} className="new-tab" aria-label={t('newTab')} data-mode={platform.mode} data-effect={effect}>
      <AmbientBackground effect={effect} variant={variant} theme={theme} interactive={visible} pointerBlocked={settings} />
      <Dock
        showFavorites={preferences.showFavorites}
        showBookmarks={preferences.showBookmarks}
        suspended={settings}
        visible={controlsVisible}
        panel={dock.panel}
        onPanelChange={setPanel}
        onEnter={dock.enter}
        onLeave={dock.leave}
        favorites={favorites}
        menu={menu}
        favoritesButton={favoritesButton}
      />
      <SettingsDock visible={controlsVisible} onEnter={dock.enter} onLeave={dock.leave} button={settingsButton} onOpen={openSettings} />
      <SourceBadge effect={effect} variant={variant} visible={controlsVisible} onEnter={dock.enter} onLeave={dock.leave} />
      {settingsLoaded && <SettingsBoundary open={settings} onClose={closeSettings}>
        <Suspense fallback={settings ? <SettingsLoading onClose={closeSettings} /> : null}>
          <SettingsDialog
            open={settings}
            onOpenChange={setSettings}
            tree={sortedTree}
            bookmarks={bookmarks}
            favorites={favorites}
            preferences={preferences}
            busy={busy || !ready || Boolean(readError)}
            error={shownError ? errorMessage(shownError, t) : undefined}
            preview={platform.mode === 'preview'}
            onFavoriteChange={onFavoriteChange}
            onPreferenceChange={onPreferenceChange}
            onCloseFocus={restoreFocus}
          />
        </Suspense>
      </SettingsBoundary>}
      {readError && !settings && <div className="error-notice glass ui-surface" role="alert">
        {errorMessage(readError, t)}
        <button className="small-button" onClick={() => { tree.retry(); savedFavorites.retry(); savedPreferences.retry(); }}>{t('retry')}</button>
      </div>}
    </main>
  </I18nContext.Provider>;
}
