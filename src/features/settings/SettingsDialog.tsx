import { useI18n } from '../../i18n/react';
import { legalPath } from '../../i18n/core';
import * as Dialog from '@radix-ui/react-dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import type { Bookmark, BookmarkNode } from '../bookmarks/model';
import type { FavoriteAction } from '../favorites/model';
import type { Preferences } from '../preferences/model';
import { FavoriteSettings } from './FavoriteSettings';
import { AppearanceSettings } from './AppearanceSettings';
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarks: Bookmark[];
  tree: BookmarkNode[];
  favorites: Bookmark[];
  preferences: Preferences;
  busy: boolean;
  error?: string;
  preview: boolean;
  onFavoriteChange: (action: FavoriteAction) => void;
  onPreferenceChange: (patch: Partial<Preferences>) => void;
  onCloseFocus: () => void;
}
export function SettingsDialog(props: Props) {
  const { locale, t } = useI18n();
  return <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}><Dialog.Portal>
    <Dialog.Overlay className="settings-overlay" />
    <Dialog.Content className="glass settings-dialog ui-surface" aria-describedby="settings-description"
      onCloseAutoFocus={(event) => { event.preventDefault(); props.onCloseFocus(); }}>
      <header className="settings-header"><Dialog.Title>{t('settings')}</Dialog.Title><Dialog.Close className="icon-button close-settings" aria-label={t('closeSettings')}><HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} size={16} /></Dialog.Close></header>
      <Dialog.Description id="settings-description" className="sr-only">{t('settingsDescription')}</Dialog.Description>
      {props.error && <p className="settings-error" role="alert">{props.error}</p>}
      <div className="settings-body">
        <FavoriteSettings tree={props.tree} bookmarks={props.bookmarks} favorites={props.favorites} busy={props.busy} onChange={props.onFavoriteChange} />
        <AppearanceSettings preferences={props.preferences} busy={props.busy} onChange={props.onPreferenceChange} />
      </div>
      <footer className="settings-legal"><a href={legalPath('privacy', locale)} target="_blank" rel="noopener noreferrer">{t('privacy')}</a><a href={legalPath('licenses', locale)} target="_blank" rel="noopener noreferrer">{t('licenses')}</a></footer>
      {props.preview && <p className="preview-note">{t('previewNote')}</p>}
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
