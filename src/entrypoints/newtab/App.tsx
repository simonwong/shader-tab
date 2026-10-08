import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { I18nContext, useLanguage } from '../../i18n/react';
import { errorMessage, MessageError } from '../../i18n/core';
import { GlassPanel } from '../../components/GlassPanel';
import { SettingsBoundary, SettingsLoading } from '../../components/SettingsBoundary';
import { AmbientBackground } from '../../effects/AmbientBackground';
import { SourceBadge } from '../../effects/SourceBadge';
import { resolveVariant } from '../../effects/variants';
import { flattenBookmarks, rootMenu } from '../../features/bookmarks/model';
import { sortBookmarkTree } from '../../features/bookmarks/sorting';
import { changeFavorites, resolveFavorites, type FavoriteAction, type FavoriteRef } from '../../features/favorites/model';
import { DEFAULT_PREFERENCES, resolvePreferenceUpdate, type PreferenceUpdate, type Preferences } from '../../features/preferences/model';
import { useEffectSelection } from '../../features/preferences/use-effect-selection';
import { useTheme } from '../../features/preferences/use-theme';
import { Dock, SettingsDock } from '../../features/navigation/Dock';
import { useDockPanels } from '../../features/navigation/use-dock-panels';
import { useGlobalShortcuts } from '../../features/navigation/use-global-shortcuts';
import { useIdleControls } from '../../features/navigation/use-idle';
import type { Platform } from '../../platform/types';
import { useLiveQuery } from '../../platform/use-live-query';
import { defaultTone, writeBoot, type BootState } from './boot';
import { useOptimistic, useSaveQueue } from './use-saves';

// A new lazy component per attempt: React caches a failed import, so a retry needs a fresh one.
const loadSettings = () => lazy(() => import('../../features/settings/SettingsDialog').then(module => ({ default: module.SettingsDialog })));

const sameOrder = (a: readonly { id: string }[], b: readonly { id: string }[]) =>
  a.length === b.length && a.every((item, index) => item.id === b[index]!.id);

interface Props {
  platform: Platform;
  /** Values cached from the previous page, used until saved preferences load. */
  boot: Partial<BootState>;
}

export function App({ platform, boot }: Props) {
  const tree = useLiveQuery(platform.getTree, platform.watchBookmarks);
  const savedFavorites = useLiveQuery(platform.getFavorites, platform.watchFavorites);
  const savedPreferences = useLiveQuery(platform.getPreferences, platform.watchPreferences);
  const saves = useSaveQueue();
  const preferenceEdits = useOptimistic<Partial<Preferences>>(savedPreferences.data);
  const favoriteEdits = useOptimistic<FavoriteRef[]>(savedFavorites.data);

  const basePreferences = useMemo<Preferences>(() => savedPreferences.data ?? {
    ...DEFAULT_PREFERENCES,
    appearance: boot.appearance ?? DEFAULT_PREFERENCES.appearance,
    language: boot.language ?? DEFAULT_PREFERENCES.language,
  }, [savedPreferences.data, boot.appearance, boot.language]);
  const preferences = useMemo(
    () => preferenceEdits.values.reduce<Preferences>((current, patch) => ({ ...current, ...patch }), basePreferences),
    [basePreferences, preferenceEdits.values],
  );
  const i18n = useLanguage(preferences.language);
  const { locale, t } = i18n;
  const theme = useTheme(preferences.appearance);
  const preferencesReady = savedPreferences.data !== undefined;

  const [settings, setSettings] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [SettingsDialog, setSettingsDialog] = useState(loadSettings);
  const [notice, setNotice] = useState<Error>();
  const settingsButton = useRef<HTMLButtonElement>(null);
  const favoritesButton = useRef<HTMLButtonElement>(null);
  const settingsReturnFocus = useRef<HTMLElement | null>(null);

  const { effect, selection, reshuffle, canReshuffle } = useEffectSelection({
    platform,
    preferences,
    ready: preferencesReady,
    onDrawError: () => saves.setError(new MessageError('randomFailed')),
  });
  const onboarding = preferencesReady && preferences.onboarding && !settings;
  const dock = useDockPanels(preferences);
  const visible = useIdleControls(preferences.idleDelay, dock.inside || dock.panel !== null || settings || onboarding);
  const controlsVisible = visible && !settings;

  const bookmarks = useMemo(() => flattenBookmarks(tree.data ?? []), [tree.data]);
  const sortedTree = useMemo(
    () => sortBookmarkTree(tree.data ?? [], preferences.bookmarkSort, locale),
    [tree.data, preferences.bookmarkSort, locale],
  );
  const menu = useMemo(() => rootMenu(sortedTree, t('untitledFolder')), [sortedTree, t]);
  const favoriteRefs = favoriteEdits.values.at(-1) ?? savedFavorites.data ?? [];
  const favorites = useMemo(() => resolveFavorites(favoriteRefs, bookmarks), [favoriteRefs, bookmarks]);
  const readError = tree.error || savedFavorites.error || savedPreferences.error;
  const ready = tree.data !== undefined && savedFavorites.data !== undefined && preferencesReady;
  const shownError = readError || saves.error;
  const tone = selection
    ? resolveVariant(selection.effect, selection.variant).tone(theme)
    : boot.tone?.[theme] ?? defaultTone(theme);

  // Latest values for handlers that may run twice before the next render (fast double clicks).
  const latest = useRef({ preferences, favoriteRefs });
  latest.current = { preferences, favoriteRefs };

  useEffect(() => {
    document.title = platform.mode === 'preview' ? t('previewTitle') : t('newTab');
  }, [t, platform.mode]);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dataset.theme = theme;
    root.dataset.tone = tone;
  }, [locale, theme, tone]);
  // Mirror what the next page needs for its first paint.
  useEffect(() => {
    if (!preferencesReady || !selection) return;
    const variant = resolveVariant(selection.effect, selection.variant);
    writeBoot({
      appearance: preferences.appearance,
      language: preferences.language,
      locale,
      background: { day: variant.background('day'), night: variant.background('night') },
      tone: { day: variant.tone('day'), night: variant.tone('night') },
    });
  }, [preferencesReady, selection, preferences.appearance, preferences.language, locale]);

  const { closeNow, setPanel } = dock;
  const openSettings = useCallback(() => {
    const fromFavorites = document.activeElement instanceof HTMLElement && document.activeElement.closest('.favorites-tray');
    settingsReturnFocus.current = fromFavorites ? favoritesButton.current : settingsButton.current;
    closeNow();
    setSettingsLoaded(true);
    setSettings(true);
  }, [closeNow]);
  // The dialog and the bookmark menu handle Escape themselves; only the favorites tray needs it here.
  useGlobalShortcuts({
    onOpenSettings: openSettings,
    onEscape: () => {
      if (settings || dock.panel !== 'favorites') return;
      setPanel(null);
      favoritesButton.current?.focus();
    },
  });

  const onPreferenceChange = useCallback((update: PreferenceUpdate) => {
    const patch = resolvePreferenceUpdate(latest.current.preferences, update);
    if (!Object.keys(patch).length) return;
    latest.current.preferences = { ...latest.current.preferences, ...patch };
    const settle = preferenceEdits.begin(patch);
    void saves.run(() => platform.updatePreferences(update)).then(settle);
  }, [platform, preferenceEdits.begin, saves.run]);

  const onFavoriteChange = useCallback(async (action: FavoriteAction) => {
    const current = latest.current.favoriteRefs;
    let next: FavoriteRef[];
    try {
      next = changeFavorites(current, action, bookmarks);
    } catch (error) {
      saves.setError(error instanceof Error ? error : new MessageError('saveFailed'));
      return false;
    }
    // A repeated click (adding twice, removing twice) changes nothing and is not saved again.
    if (sameOrder(next, resolveFavorites(current, bookmarks))) return true;
    latest.current.favoriteRefs = next;
    const settle = favoriteEdits.begin(next);
    const saved = await saves.run(() => platform.updateFavorites(action));
    settle(saved);
    return saved;
  }, [platform, bookmarks, favoriteEdits.begin, saves]);

  const onOpenUrl = useCallback((url: string, background: boolean) => {
    platform.openUrl(url, background).catch((error: unknown) => {
      console.warn('Could not open bookmark.', error);
      setNotice(new MessageError('openFailed'));
    });
  }, [platform]);

  const closeSettings = () => setSettings(false);
  const returnFocus = () => settingsReturnFocus.current?.isConnected ? settingsReturnFocus.current : settingsButton.current;
  const notices = readError ?? (settings ? undefined : notice);

  return <I18nContext.Provider value={i18n}>
    <main
      inert={settings}
      className="new-tab"
      aria-label={t('newTab')}
      data-mode={platform.mode}
      data-effect={selection?.effect ?? effect}
      data-tone={tone}
    >
      {selection
        ? <AmbientBackground
          effect={selection.effect}
          variant={selection.variant}
          theme={theme}
          pointerBlocked={settings}
        />
        : <div className="ambient-background boot-background" aria-hidden="true" />}
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
        onOpenSettings={openSettings}
        onOpenUrl={onOpenUrl}
      />
      <SettingsDock visible={controlsVisible} onEnter={dock.enter} onLeave={dock.leave} button={settingsButton} onOpen={openSettings} />
      {selection && <SourceBadge
        effect={selection.effect}
        variant={selection.variant}
        visible={controlsVisible}
        onEnter={dock.enter}
        onLeave={dock.leave}
        onShuffle={canReshuffle ? reshuffle : undefined}
      />}
      {onboarding && dock.panel === null && <GlassPanel className="first-run ui-surface" role="status">
        <HugeiconsIcon aria-hidden="true" icon={InformationCircleIcon} size={16} strokeWidth={1.8} />
        <p>{t('firstRunHint')}</p>
        <button className="small-button" onClick={() => onPreferenceChange({ onboarding: false })}>{t('gotIt')}</button>
      </GlassPanel>}
      {settingsLoaded && <SettingsBoundary open={settings} onClose={closeSettings} onReset={() => setSettingsDialog(loadSettings())}>
        <Suspense fallback={settings ? <SettingsLoading onClose={closeSettings} /> : null}>
          <SettingsDialog
            open={settings}
            onOpenChange={setSettings}
            tree={sortedTree}
            bookmarks={bookmarks}
            favorites={favorites}
            preferences={preferences}
            saving={saves.busy}
            unavailable={!ready || Boolean(readError)}
            error={shownError ? errorMessage(shownError, t) : undefined}
            preview={platform.mode === 'preview'}
            onFavoriteChange={onFavoriteChange}
            onPreferenceChange={onPreferenceChange}
            returnFocus={returnFocus}
          />
        </Suspense>
      </SettingsBoundary>}
      {notices && <GlassPanel className="error-notice ui-surface" role="alert">
        {errorMessage(notices, t)}
        {readError
          ? <button className="small-button" onClick={() => { tree.retry(); savedFavorites.retry(); savedPreferences.retry(); }}>{t('retry')}</button>
          : <button className="small-button" onClick={() => setNotice(undefined)}>{t('close')}</button>}
      </GlassPanel>}
    </main>
  </I18nContext.Provider>;
}
