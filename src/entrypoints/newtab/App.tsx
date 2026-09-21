import { I18nContext, useLanguage } from '../../i18n/react';
import { asError, errorMessage, MessageError } from '../../i18n/core';
import { variantLabel, variantSource } from '../../effects/variants';
import { sortBookmarkTree } from '../../features/bookmarks/sorting';
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { HugeiconsIcon } from '@hugeicons/react';
import { GridViewIcon, Settings01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { SiteMark } from '../../components/SiteMark';
import { GlassPanel } from '../../components/GlassPanel';
import { SettingsBoundary, SettingsLoading } from '../../components/SettingsBoundary';
import { AmbientBackground } from '../../effects/AmbientBackground';
import { getEffect, type EffectId, type ShaderGradientType } from '../../effects/presets';
import { flattenBookmarks, rootMenu } from '../../features/bookmarks/model';
import { chooseEffect, DEFAULT_PREFERENCES, type Preferences } from '../../features/preferences/model';
import { useTheme } from '../../features/preferences/use-theme';
import { BookmarkMenu } from '../../features/navigation/BookmarkMenu';
import { useIdleControls } from '../../features/navigation/use-idle';
const SettingsDialog = lazy(() => import('../../features/settings/SettingsDialog').then((module) => ({ default: module.SettingsDialog })));
import type { FavoriteAction } from '../../features/favorites/model';
import type { Platform } from '../../platform/types';
import { useLiveQuery } from '../../platform/use-live-query';

export function App({ platform }: { platform: Platform }) {
  const tree = useLiveQuery(platform.getTree, platform.watchBookmarks);
  const savedFavorites = useLiveQuery(platform.getFavorites, platform.watchFavorites);
  const savedPreferences = useLiveQuery(platform.getPreferences, platform.watchPreferences);
  const preferences = savedPreferences.data ?? DEFAULT_PREFERENCES;
  const i18n = useLanguage(preferences.language);
  const { locale, t } = i18n;
  const theme = useTheme(preferences.appearance);
  useEffect(() => { document.documentElement.lang = locale; document.title = platform.mode === 'preview' ? t('previewTitle') : 'Shader Tab'; }, [locale, t, platform.mode]);
  const [seed] = useState(Math.random);
  const [randomShape, setRandomShape] = useState<ShaderGradientType>();
  const shapeDraw = useRef<Promise<ShaderGradientType> | null>(null);
  const shaderGradientType = randomShape;
  const effect = chooseEffect(preferences, seed);
  const [variants, setVariants] = useState<Partial<Record<EffectId, string>>>({});
  const variantDraws = useRef<Partial<Record<EffectId, Promise<string>>>>({});
  const variant = effect === 'shader-gradient' ? shaderGradientType : variants[effect];
  useEffect(() => {
    if (!savedPreferences.data || effect === 'shader-gradient') return;
    let active = true;
    const draw = variantDraws.current[effect] ??= platform.nextEffectVariant(effect);
    void draw.then(value => { if (active) setVariants(previous => ({ ...previous, [effect]: value })); })
      .catch(() => { if (active) setWriteError(new MessageError('randomFailed')); });
    return () => { active = false; };
  }, [effect, savedPreferences.data, platform]);
  const [panel, setPanel] = useState<'favorites' | 'all' | null>(null);
  const [settings, setSettings] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [inside, setInside] = useState(false);
  const [busy, setBusy] = useState(false);
  const [writeError, setWriteError] = useState<Error>();
  const settingsButton = useRef<HTMLButtonElement>(null);
  const favoritesButton = useRef<HTMLButtonElement>(null);
  const settingsReturnFocus = useRef<HTMLElement | null>(null);
  const keyboardMode = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const visible = useIdleControls(preferences.idleDelay, inside || panel !== null || settings);
  const bookmarks = useMemo(() => flattenBookmarks(tree.data ?? []), [tree.data]);
  const sortedTree = useMemo(() => sortBookmarkTree(tree.data ?? [], preferences.bookmarkSort, locale), [tree.data, preferences.bookmarkSort, locale]);
  const menu = useMemo(() => rootMenu(sortedTree, t('untitledFolder')), [sortedTree, t]);
  const favorites = useMemo(() => (savedFavorites.data ?? []).flatMap((id) => {
    const bookmark = bookmarks.find((item) => item.id === id);
    return bookmark ? [bookmark] : [];
  }), [bookmarks, savedFavorites.data]);
  const readError = tree.error || savedFavorites.error || savedPreferences.error;
  const ready = tree.data !== undefined && savedFavorites.data !== undefined && savedPreferences.data !== undefined;

  useEffect(() => {
    if (!savedPreferences.data || effect !== 'shader-gradient') return;
    let active = true;
    shapeDraw.current ??= platform.nextShaderGradientType();
    void shapeDraw.current.then((shape) => { if (active) setRandomShape(shape); }).catch(() => { if (active) setWriteError(new MessageError('randomFailed')); });
    return () => { active = false; };
  }, [effect, savedPreferences.data, platform]);
  useEffect(() => {
    if (panel === 'favorites' && !preferences.showFavorites || panel === 'all' && !preferences.showBookmarks) { setPanel(null); setInside(false); }
  }, [panel, preferences.showFavorites, preferences.showBookmarks]);
  useLayoutEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const enter = useCallback(() => { clearTimeout(closeTimer.current); setInside(true); }, []);
  const leave = useCallback(() => {
    setInside(false);
    closeTimer.current = setTimeout(() => {
      if (!keyboardMode.current || !document.activeElement?.closest('.bookmark-menu, .favorites-tray')) setPanel(null);
    }, 220);
  }, []);
  const openSettings = useCallback(() => { settingsReturnFocus.current = document.activeElement instanceof HTMLElement && document.activeElement.closest('.favorites-tray') ? favoritesButton.current : settingsButton.current; clearTimeout(closeTimer.current); setPanel(null); setSettingsLoaded(true); setSettings(true); setInside(false); }, []);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    const pointer = () => { keyboardMode.current = false; };
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || event.target.closest('.ui-surface')) return;
      setPanel(null); setInside(false);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    };
    const keyboard = (event: KeyboardEvent) => {
      keyboardMode.current = true;
      if ((event.metaKey || event.ctrlKey) && event.key === ',') { event.preventDefault(); openSettings(); }
      if (event.key === 'Escape' && settings) { setSettings(false); settingsReturnFocus.current?.focus(); }
      else if (event.key === 'Escape' && panel === 'favorites') { setPanel(null); favoritesButton.current?.focus(); }
    };
    document.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('pointermove', pointer); document.removeEventListener('pointerdown', outside); window.removeEventListener('keydown', keyboard); };
  }, [openSettings, settings, panel]);
  async function save(task: () => Promise<void>) {
    setBusy(true); setWriteError(undefined);
    try { await task(); }
    catch (error) { setWriteError(asError(error, 'saveFailed')); }
    finally { setBusy(false); }
  }
  const onFavoriteChange = (action: FavoriteAction) => { void save(() => platform.updateFavorites(action)); };
  const onPreferenceChange = (patch: Partial<Preferences>) => { void save(() => platform.updatePreferences(patch)); };

  return <I18nContext.Provider value={i18n}><main inert={settings} className="new-tab" aria-label={t('newTab')} data-mode={platform.mode} data-effect={effect}>
    <AmbientBackground variant={variant} shaderGradientType={shaderGradientType} effect={effect} theme={theme} interactive={visible} />
    <Menu.Root open={preferences.showBookmarks && panel === 'all' && !settings} onOpenChange={(open) => setPanel(current => open ? 'all' : current === 'all' ? null : current)} modal={false}>
      {(preferences.showFavorites || preferences.showBookmarks) && <div className="dock-zone" data-visible={visible && !settings} onPointerEnter={enter} onPointerLeave={leave}>
        <GlassPanel className="dock ui-surface" role="navigation" aria-label={t('bookmarkNavigation')}>
          {preferences.showFavorites && <button ref={favoritesButton} className="dock-button" aria-label={t('favorites')} aria-expanded={panel === 'favorites'} aria-controls="favorites-tray" onPointerEnter={(event) => { if (event.pointerType === 'mouse') { enter(); setPanel('favorites'); } }} onClick={() => setPanel('favorites')}><HugeiconsIcon aria-hidden="true" icon={StarIcon} size={17} strokeWidth={1.7} /></button>}
          {preferences.showBookmarks && <Menu.Trigger asChild><button className="dock-button" aria-label={t('allBookmarks')} onPointerDown={(event) => { if (event.pointerType === 'mouse' && panel === 'all') event.preventDefault(); }} onPointerEnter={(event) => { if (event.pointerType === 'mouse') { enter(); setPanel('all'); } }}><HugeiconsIcon aria-hidden="true" icon={GridViewIcon} size={17} strokeWidth={1.7} /></button></Menu.Trigger>}
        </GlassPanel>
        {preferences.showFavorites && panel === 'favorites' && !settings && <GlassPanel id="favorites-tray" className="favorites-tray ui-surface" role="region" aria-label={t('favorites')}>
          <div className="favorite-items">
            {favorites.map(bookmark => <a key={bookmark.id} className="favorite-tile" href={bookmark.url} title={bookmark.title}><SiteMark bookmark={bookmark} /><span className="truncate">{bookmark.title}</span></a>)}
          </div>
        </GlassPanel>}
      </div>}
      <BookmarkMenu entries={menu} onEnter={enter} onLeave={leave} />
    </Menu.Root>
    <div className="dock-zone settings-zone" data-visible={visible && !settings} onPointerEnter={enter} onPointerLeave={leave}>
      <GlassPanel className="dock ui-surface">
        <button ref={settingsButton} className="dock-button" aria-label={t('settings')} onClick={openSettings}><HugeiconsIcon aria-hidden="true" icon={Settings01Icon} size={15} strokeWidth={1.7} /></button>
      </GlassPanel>
    </div>
    <div className="source-zone dock-zone" data-visible={visible && !settings} onPointerEnter={enter} onPointerLeave={leave}>
      <GlassPanel className="source-glass ui-surface"><a className="effect-source" href={variantSource(effect, variant)} target="_blank" rel="noopener noreferrer" title={`${getEffect(effect).name} · ${t('reference')}`}>{getEffect(effect).sourceName}{variant ? ` · ${variantLabel(variant)}` : ''}</a></GlassPanel>
    </div>
    {settingsLoaded && <SettingsBoundary open={settings} onClose={() => setSettings(false)}><Suspense fallback={settings ? <SettingsLoading onClose={() => setSettings(false)} /> : null}><SettingsDialog open={settings} onOpenChange={setSettings}
      tree={sortedTree} bookmarks={bookmarks} favorites={favorites} preferences={preferences} busy={busy || !ready || Boolean(readError)} error={readError || writeError ? errorMessage((readError || writeError)!, t) : undefined}
      preview={platform.mode === 'preview'} onFavoriteChange={onFavoriteChange} onPreferenceChange={onPreferenceChange}
      onCloseFocus={() => (settingsReturnFocus.current?.isConnected ? settingsReturnFocus.current : settingsButton.current)?.focus()} /></Suspense></SettingsBoundary>}
    {readError && !settings && <div className="error-notice glass ui-surface" role="alert">{errorMessage(readError, t)}<button className="small-button" onClick={() => { tree.retry(); savedFavorites.retry(); savedPreferences.retry(); }}>{t('retry')}</button></div>}
  </main></I18nContext.Provider>;
}
