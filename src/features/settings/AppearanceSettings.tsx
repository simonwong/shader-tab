import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { useI18n } from '../../i18n/react';
import { isLanguage, LOCALES, LANGUAGE_NAMES } from '../../i18n/core';
import type { MessageKey } from '../../i18n/en';
import { EFFECT_VARIANTS } from '../../effects/variants';
import { EFFECTS, type EffectId } from '../../effects/presets';
import { BOOKMARK_SORTS, isBookmarkSort, type BookmarkSort } from '../bookmarks/sorting';
import { toggleEffect, type PreferenceUpdate, type Preferences } from '../preferences/model';
import { effectThumbnail } from './effect-thumbnails';

interface Props {
  preferences: Preferences;
  disabled: boolean;
  /** Updates are functions of the latest stored preferences, so quick successive edits never drop each other. */
  onChange: (update: PreferenceUpdate) => void;
}

const SORT_LABELS: Record<BookmarkSort, MessageKey> = {
  chrome: 'sortChrome',
  'name-asc': 'sortNameAsc',
  'name-desc': 'sortNameDesc',
  newest: 'sortNewest',
  oldest: 'sortOldest',
  recent: 'sortRecent',
};

function EffectGrid({ preferences, disabled, onChange }: Props) {
  const { t } = useI18n();
  const shuffle = preferences.shuffle;
  const select = (id: EffectId) =>
    onChange(
      shuffle ? current => ({ effects: toggleEffect(current.effects, id) }) : { activeEffect: id },
    );
  return (
    <div
      className="effect-grid"
      role={shuffle ? 'group' : 'radiogroup'}
      aria-label={t('backgrounds')}
      data-mode={shuffle ? 'multiple' : 'single'}
    >
      {EFFECTS.map(effect => {
        const selected = shuffle
          ? preferences.effects.includes(effect.id)
          : preferences.activeEffect === effect.id;
        const variants = t('variantsCount', { count: EFFECT_VARIANTS[effect.id].length });
        return (
          <button
            key={effect.id}
            className="effect-card"
            type="button"
            role={shuffle ? 'checkbox' : 'radio'}
            aria-checked={selected}
            aria-label={`${effect.name}, ${variants}`}
            title={t(`effect.${effect.id}`)}
            disabled={disabled}
            onClick={() => select(effect.id)}
          >
            <span
              className="effect-half"
              style={{ background: effectThumbnail(effect.id, 'day') }}
            />
            <span
              className="effect-half"
              style={{ background: effectThumbnail(effect.id, 'night') }}
            />
            <span className="effect-label">
              <span className="effect-name">{effect.name}</span>
              <span className="effect-count">{variants}</span>
            </span>
            <span className="effect-check" aria-hidden="true">
              {selected &&
                (shuffle ? (
                  <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={3} />
                ) : (
                  <span className="effect-dot" />
                ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AppearanceSettings(props: Props) {
  const { preferences, disabled, onChange } = props;
  const { t } = useI18n();
  return (
    <section className="settings-column appearance-settings" aria-labelledby="background-heading">
      <section className="settings-section background-settings">
        <header className="section-heading">
          <h2 id="background-heading">{t('backgrounds')}</h2>
          <p>
            {preferences.shuffle
              ? t('effectsPool', { count: EFFECTS.length })
              : t('fixedEffectHint')}
          </p>
        </header>
        {preferences.shuffle && (
          <p className="selection-count" aria-live="polite">
            {t('selectedCount', { count: preferences.effects.length, total: EFFECTS.length })}
          </p>
        )}
        <EffectGrid {...props} />
        <div className="setting-row">
          <span className="setting-label">
            <span>{t('shuffle')}</span>
            <small>{t('shuffleHint')}</small>
          </span>
          <button
            className="switch"
            role="switch"
            aria-label={t('shuffle')}
            aria-checked={preferences.shuffle}
            disabled={disabled}
            onClick={() => onChange(current => ({ shuffle: !current.shuffle }))}
          >
            <span />
          </button>
        </div>
        <p className="setting-note">{t('shuffleNote')}</p>
      </section>

      <section className="settings-section" aria-labelledby="navigation-heading">
        <h2 id="navigation-heading">{t('navigation')}</h2>
        {(
          [
            ['showFavorites', 'favorites'],
            ['showBookmarks', 'systemBookmarks'],
          ] as const
        ).map(([key, label]) => (
          <div className="setting-row" key={key}>
            <span className="setting-label">{t(label)}</span>
            <button
              className="switch"
              role="switch"
              aria-label={t(key)}
              aria-checked={preferences[key]}
              disabled={disabled}
              onClick={() => onChange(current => ({ [key]: !current[key] }))}
            >
              <span />
            </button>
          </div>
        ))}
      </section>

      <section className="settings-section" aria-labelledby="bookmark-sort-heading">
        <h2 id="bookmark-sort-heading">{t('bookmarkSort')}</h2>
        <div className="setting-row">
          <label className="setting-label" htmlFor="bookmark-sort">
            {t('sortBy')}
          </label>
          <select
            id="bookmark-sort"
            className="setting-select"
            value={preferences.bookmarkSort}
            disabled={disabled}
            onChange={event => {
              if (isBookmarkSort(event.target.value))
                onChange({ bookmarkSort: event.target.value });
            }}
          >
            {BOOKMARK_SORTS.map(id => (
              <option key={id} value={id}>
                {t(SORT_LABELS[id])}
              </option>
            ))}
          </select>
        </div>
        <p className="setting-note">{t('sortNote')}</p>
      </section>

      <section className="settings-section" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading">{t('appearance')}</h2>
        <div className="setting-row">
          <span className="setting-label">
            <span>{t('theme')}</span>
            <small>{t('systemThemeHint')}</small>
          </span>
          <div className="segmented" role="group" aria-label={t('appearanceMode')}>
            {(['system', 'day', 'night'] as const).map(value => (
              <button
                key={value}
                disabled={disabled}
                aria-pressed={preferences.appearance === value}
                onClick={() => onChange({ appearance: value })}
              >
                {t(value)}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <span className="setting-label">{t('idleHide')}</span>
          <div className="segmented" role="group" aria-label={t('idleDelay')}>
            {([1000, 2000, 5000] as const).map(value => (
              <button
                key={value}
                disabled={disabled}
                aria-pressed={preferences.idleDelay === value}
                onClick={() => onChange({ idleDelay: value })}
              >
                {t('seconds', { count: value / 1000 })}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="language-heading">
        <h2 id="language-heading">{t('language')}</h2>
        <div className="setting-row">
          <label className="setting-label" htmlFor="interface-language">
            {t('interfaceLanguage')}
          </label>
          <select
            id="interface-language"
            className="setting-select"
            value={preferences.language}
            disabled={disabled}
            onChange={event => {
              if (isLanguage(event.target.value)) onChange({ language: event.target.value });
            }}
          >
            <option value="auto">{t('browserLanguage')}</option>
            {LOCALES.map(locale => (
              <option key={locale} value={locale} lang={locale}>
                {LANGUAGE_NAMES[locale]}
              </option>
            ))}
          </select>
        </div>
        <p className="setting-note">{t('languageHint')}</p>
      </section>
    </section>
  );
}
