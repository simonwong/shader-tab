import { useI18n } from '../i18n/react';
import { Component, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called once the children fail; the parent retries by remounting the boundary with a new key. */
  onError?: () => void;
  children: ReactNode;
}

export function SettingsLoading({ onClose }: Pick<Props, 'onClose'>) {
  const { t } = useI18n();
  return createPortal(<div className="settings-loading">
    <p role="status">{t('loadingSettings')}</p>
    <button className="small-button" onClick={onClose}>{t('cancel')}</button>
  </div>, document.body);
}

/** Keeps a settings failure from taking down the page. Reopening settings tries again. */
export class SettingsBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch() { this.props.onError?.(); }
  override render() {
    if (!this.state.failed) return this.props.children;
    if (!this.props.open) return null;
    return <SettingsFailure onClose={this.props.onClose} />;
  }
}

function SettingsFailure({ onClose }: Pick<Props, 'onClose'>) {
  const { t } = useI18n();
  return createPortal(<div className="settings-loading">
    <p role="alert">{t('settingsFailed')}</p>
    <div className="recovery-actions">
      <button className="small-button" onClick={onClose}>{t('close')}</button>
      <button className="small-button" onClick={() => window.location.reload()}>{t('reload')}</button>
    </div>
  </div>, document.body);
}
