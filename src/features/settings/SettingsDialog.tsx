import { Dialog } from '@base-ui/react/dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { useI18n } from '../../i18n/react';
import { legalPath } from '../../i18n/core';
import type { Bookmark, BookmarkNode } from '../bookmarks/model';
import type { FavoriteAction } from '../favorites/model';
import type { PreferenceUpdate, Preferences } from '../preferences/model';
import { FavoriteSettings } from './FavoriteSettings';
import { AppearanceSettings } from './AppearanceSettings';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarks: Bookmark[];
  tree: BookmarkNode[];
  favorites: Bookmark[];
  preferences: Preferences;
  /** Saves are in flight; controls stay usable and focused, the dialog reports aria-busy. */
  saving: boolean;
  /** Data has not loaded (or failed to); edits are not possible yet. */
  unavailable: boolean;
  error?: string;
  preview: boolean;
  onFavoriteChange: (action: FavoriteAction) => Promise<boolean>;
  onPreferenceChange: (update: PreferenceUpdate) => void;
  /** Element to focus once the dialog closes (the control that opened it). */
  returnFocus: () => HTMLElement | null;
}

export function SettingsDialog(props: Props) {
  const { locale, t } = useI18n();
  return <Dialog.Root open={props.open} onOpenChange={open => props.onOpenChange(open)}>
    <Dialog.Portal>
      <Dialog.Backdrop className="settings-overlay" />
      <Dialog.Popup className="glass settings-dialog ui-surface" finalFocus={props.returnFocus} aria-busy={props.saving}>
        <header className="settings-header">
          <Dialog.Title className="settings-title">{t('settings')}</Dialog.Title>
          <Dialog.Close className="icon-button close-settings" aria-label={t('closeSettings')}>
            <HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} size={16} />
          </Dialog.Close>
        </header>
        <Dialog.Description className="sr-only">{t('settingsDescription')}</Dialog.Description>
        {props.error && <p className="settings-error" role="alert">{props.error}</p>}
        <div className="settings-body">
          <FavoriteSettings
            tree={props.tree}
            bookmarks={props.bookmarks}
            favorites={props.favorites}
            disabled={props.unavailable}
            onChange={props.onFavoriteChange}
          />
          <AppearanceSettings preferences={props.preferences} disabled={props.unavailable} onChange={props.onPreferenceChange} />
        </div>
        <footer className="settings-footer">
          <p className="settings-restore">{t('restoreDefault')}</p>
          <nav className="settings-legal">
            <a href={legalPath('privacy', locale)} target="_blank" rel="noopener noreferrer">{t('privacy')}</a>
            <a href={legalPath('licenses', locale)} target="_blank" rel="noopener noreferrer">{t('licenses')}</a>
          </nav>
        </footer>
        {props.preview && <p className="preview-note">{t('previewNote')}</p>}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
