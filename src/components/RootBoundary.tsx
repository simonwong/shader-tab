import { Component, type ReactNode } from 'react';
import type { Translator } from '../i18n/core';

interface Props {
  t: Translator;
  children: ReactNode;
}

/**
 * Last-resort boundary around the whole new tab. A render error leaves the
 * static background, a short message and a reload button instead of a blank
 * page. React reports the error through the root's error callbacks.
 */
export class RootBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() {
    if (!this.state.failed) return this.props.children;
    const { t } = this.props;
    return <main className="new-tab crash-screen" aria-label={t('newTab')}>
      <div className="ambient-background crash-background" aria-hidden="true" />
      <div className="crash-notice glass ui-surface" role="alert">
        <p>{t('startupFailed')}</p>
        <button className="small-button" onClick={() => window.location.reload()}>{t('reload')}</button>
      </div>
    </main>;
  }
}
