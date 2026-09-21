import { useI18n } from '../../i18n/react';
import { isLanguage, LOCALES, LANGUAGE_NAMES } from '../../i18n/core';
import type { MessageKey } from '../../i18n/en';
import { EFFECT_VARIANTS } from '../../effects/variants';
import { BOOKMARK_SORTS, isBookmarkSort, type BookmarkSort } from '../bookmarks/sorting';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { EFFECTS, type EffectId } from '../../effects/presets';
import { effectThumbnail } from './effect-thumbnails';
import type { Preferences } from '../preferences/model';
interface Props {
  preferences: Preferences;
  busy: boolean;
  onChange: (patch: Partial<Preferences>) => void;
}
export function AppearanceSettings({ preferences, busy, onChange }: Props) {
  const { t } = useI18n();
  const sortLabels: Record<BookmarkSort, MessageKey> = { chrome: 'sortChrome', 'name-asc': 'sortNameAsc', 'name-desc': 'sortNameDesc', newest: 'sortNewest', oldest: 'sortOldest', recent: 'sortRecent' };
  function selectEffect(id: EffectId) {
    if (!preferences.shuffle) { onChange({ activeEffect: id }); return; }
    const selected = preferences.effects.includes(id);
    if (selected && preferences.effects.length === 1) return;
    onChange({ effects: selected ? preferences.effects.filter((effect) => effect !== id) : [...preferences.effects, id] });
  }
  return <section className="settings-column appearance-settings" aria-labelledby="background-heading">
    <section className="language-settings" aria-labelledby="language-heading">
      <h2 id="language-heading">{t('language')}</h2>
      <div className="setting-row"><label htmlFor="interface-language">{t('interfaceLanguage')}</label><select id="interface-language" className="setting-select" value={preferences.language} disabled={busy} onChange={event => { if (isLanguage(event.target.value)) onChange({ language: event.target.value }); }}><option value="auto">{t('browserLanguage')}</option>{LOCALES.map(locale => <option key={locale} value={locale} lang={locale}>{LANGUAGE_NAMES[locale]}</option>)}</select></div>
      <p className="setting-note">{t('languageHint')}</p>
    </section>
    <section className="background-settings">
      <header className="section-heading"><h2 id="background-heading">{t('backgrounds')}</h2><p>{preferences.shuffle ? t('effectsPool', { count: EFFECTS.length }) : t('fixedEffectHint')}</p></header>
      <div className="effect-grid" role="group" aria-label={t('backgrounds')}>
        {EFFECTS.map((effect) => {
          const selected = preferences.shuffle ? preferences.effects.includes(effect.id) : preferences.activeEffect === effect.id;
          return <button key={effect.id} className="effect-card" type="button" aria-pressed={selected} aria-label={effect.name} title={`${t(`effect.${effect.id}`)} · ${t('variantsCount', { count: EFFECT_VARIANTS[effect.id].length })}`}
            disabled={busy} onClick={() => selectEffect(effect.id)}>
            <span className="effect-half" style={{ background: effectThumbnail(effect.id, 'day') }} /><span className="effect-half" style={{ background: effectThumbnail(effect.id, 'night') }} />
            <span className="effect-name">{effect.name}</span><span className="effect-check">{selected && <HugeiconsIcon aria-hidden="true" icon={Tick02Icon} size={12} strokeWidth={3} />}</span>
          </button>;
        })}
      </div>
      <div className="setting-row"><span><span>{t('shuffle')}</span><small>{t('shuffleHint')}</small></span>
        <button className="switch" role="switch" aria-label={t('shuffle')} aria-checked={preferences.shuffle} disabled={busy} onClick={() => onChange({ shuffle: !preferences.shuffle })}><span /></button>
      </div>
      <p className="setting-note">{t('shuffleNote')}</p>
    </section>
    <section className="navigation-settings" aria-labelledby="navigation-heading">
      <h2 id="navigation-heading">{t('navigation')}</h2>
      {([['showFavorites', 'favorites'], ['showBookmarks', 'systemBookmarks']] as const).map(([key, label]) => <div className="setting-row" key={key}><span>{t(label)}</span><button className="switch" role="switch" aria-label={t(key)} aria-checked={preferences[key]} disabled={busy} onClick={() => onChange({ [key]: !preferences[key] })}><span /></button></div>)}
    </section>
    <section className="bookmark-sort-settings" aria-labelledby="bookmark-sort-heading">
      <h2 id="bookmark-sort-heading">{t('bookmarkSort')}</h2>
      <div className="setting-row"><label htmlFor="bookmark-sort">{t('sortBy')}</label><select id="bookmark-sort" className="setting-select" value={preferences.bookmarkSort} disabled={busy} onChange={event => { if (isBookmarkSort(event.target.value)) onChange({ bookmarkSort: event.target.value }); }}>{BOOKMARK_SORTS.map(id => <option key={id} value={id}>{t(sortLabels[id])}</option>)}</select></div>
      <p className="setting-note">{t('sortNote')}</p>
    </section>
    <section className="appearance-section" aria-labelledby="appearance-heading">
      <h2 id="appearance-heading">{t('appearance')}</h2>
      <div className="setting-row theme-row"><span><span>{t('theme')}</span><small>{t('systemThemeHint')}</small></span>
        <div className="segmented" role="group" aria-label={t('appearanceMode')}>{(['system', 'day', 'night'] as const).map((value) => <button key={value} disabled={busy} aria-pressed={preferences.appearance === value} onClick={() => onChange({ appearance: value })}>{t(value)}</button>)}</div>
      </div>
      <div className="setting-row"><span>{t('idleHide')}</span>
        <div className="segmented" role="group" aria-label={t('idleDelay')}>{([1000, 2000, 5000] as const).map((value) => <button key={value} disabled={busy} aria-pressed={preferences.idleDelay === value} onClick={() => onChange({ idleDelay: value })}>{t('seconds', { count: value / 1000 })}</button>)}</div>
      </div>
    </section>
  </section>;
}
