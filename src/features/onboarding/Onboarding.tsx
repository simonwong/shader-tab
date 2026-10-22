import { useEffect, useMemo, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { GridViewIcon, StarIcon } from '@hugeicons/core-free-icons';
import { useI18n } from '../../i18n/react';
import { GlassPanel } from '../../components/GlassPanel';
import { SiteMark } from '../../components/SiteMark';
import type { BookmarkNode } from '../bookmarks/model';
import type { FavoriteAction } from '../favorites/model';
import type { FavoritesLayout, PreferenceUpdate } from '../preferences/model';
import { bookmarkBarPicks } from './bar-picks';

const LAYOUTS = [
  ['dock', 'layoutDock', 'layoutDockHint'],
  ['tray', 'layoutTray', 'layoutTrayHint'],
] as const;

interface Props {
  tree: BookmarkNode[];
  /** No favorites yet: after the layout, offer the bookmarks bar. */
  empty: boolean;
  /** Out of the way while a dock panel is open; the chosen step is kept. */
  hidden: boolean;
  onPreferenceChange: (update: PreferenceUpdate) => void;
  /** Resolves false when the save failed. */
  onFavoriteChange: (action: FavoriteAction) => Promise<boolean>;
}

/** A dock sketch: favorites as icons in it, or a tray above a star. */
function LayoutPreview({ layout }: { layout: FavoritesLayout }) {
  return (
    <span className="layout-preview" aria-hidden="true">
      {layout === 'tray' && (
        <span className="preview-tray">
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
      <span className="preview-dock">
        {layout === 'dock' ? (
          <>
            <i />
            <i />
            <i />
            <i />
            <b />
          </>
        ) : (
          <HugeiconsIcon icon={StarIcon} size={11} strokeWidth={2} />
        )}
        <HugeiconsIcon icon={GridViewIcon} size={11} strokeWidth={2} />
      </span>
    </span>
  );
}

/**
 * First-run card above the dock, in two steps: where favorites go, then, with
 * no favorites yet, the first links of the bookmarks bar as a starting set.
 * Finishing or skipping either step ends onboarding.
 */
export function Onboarding({ tree, empty, hidden, onPreferenceChange, onFavoriteChange }: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState<'layout' | 'import'>('layout');
  const [layout, setLayout] = useState<FavoritesLayout>('dock');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const picks = useMemo(() => bookmarkBarPicks(tree), [tree]);
  const primary = useRef<HTMLButtonElement>(null);
  // The layout is saved with the end of onboarding: on a fresh install any saved
  // preference would read as onboarding done and take the second step away.
  const finish = (patch: { favoritesLayout?: FavoritesLayout } = {}) =>
    onPreferenceChange({ ...patch, onboarding: false });

  // The first step's buttons are gone once the second shows; focus follows to its main action.
  useEffect(() => {
    if (step === 'import') primary.current?.focus();
  }, [step]);

  const importPicks = async () => {
    setSaving(true);
    setFailed(false);
    const saved = await onFavoriteChange({ type: 'import', ids: picks.map(pick => pick.id) });
    setSaving(false);
    if (saved) finish({ favoritesLayout: layout });
    else setFailed(true);
  };

  if (step === 'layout')
    return (
      <GlassPanel
        className="onboarding ui-surface"
        role="region"
        aria-labelledby="onboarding-title"
        hidden={hidden}
      >
        <h2 id="onboarding-title">{t('onboardingLayout')}</h2>
        <div className="layout-options" role="radiogroup" aria-labelledby="onboarding-title">
          {LAYOUTS.map(([value, label, hint]) => (
            <label key={value} className="layout-option">
              <input
                type="radio"
                name="onboarding-layout"
                value={value}
                className="sr-only"
                checked={layout === value}
                onChange={() => setLayout(value)}
              />
              <LayoutPreview layout={value} />
              <span className="layout-option-text">
                <span>{t(label)}</span>
                <small>{t(hint)}</small>
              </span>
            </label>
          ))}
        </div>
        <div className="onboarding-actions">
          <button className="text-button" onClick={() => finish()}>
            {t('skip')}
          </button>
          <button
            className="small-button primary-button"
            onClick={() => {
              if (empty) setStep('import');
              else finish({ favoritesLayout: layout });
            }}
          >
            {t(empty ? 'next' : 'gotIt')}
          </button>
        </div>
      </GlassPanel>
    );

  return (
    <GlassPanel
      className="onboarding ui-surface"
      role="region"
      aria-labelledby="onboarding-title"
      aria-busy={saving}
      hidden={hidden}
    >
      <h2 id="onboarding-title">{t('onboardingImport')}</h2>
      {picks.length ? (
        <ul className="onboarding-picks">
          {picks.map(bookmark => (
            <li key={bookmark.id} title={bookmark.title}>
              <SiteMark bookmark={bookmark} size="small" />
              <span className="sr-only">{bookmark.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="onboarding-note">{t('barEmpty')}</p>
      )}
      {failed && (
        <p className="onboarding-note" role="alert">
          {t('saveFailed')}
        </p>
      )}
      <div className="onboarding-actions">
        {picks.length ? (
          <>
            <button className="text-button" onClick={() => finish({ favoritesLayout: layout })}>
              {t('chooseLater')}
            </button>
            <button
              ref={primary}
              className="small-button primary-button"
              disabled={saving}
              onClick={() => void importPicks()}
            >
              {picks.length === 1
                ? t('importFromBarOne')
                : t('importFromBar', { count: picks.length })}
            </button>
          </>
        ) : (
          <button
            ref={primary}
            className="small-button"
            onClick={() => finish({ favoritesLayout: layout })}
          >
            {t('gotIt')}
          </button>
        )}
      </div>
    </GlassPanel>
  );
}
