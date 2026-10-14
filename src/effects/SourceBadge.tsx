import { useState, type FocusEvent, type MouseEvent, type PointerEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PinIcon, PinOffIcon, RefreshIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import { useI18n } from '../i18n/react';
import { LiquidGlassPanel } from '../components/LiquidGlassPanel';
import { getEffect, type EffectId } from './presets';
import { getVariant, resolveVariant } from './variants';

interface Props {
  effect: EffectId;
  variant: string | undefined;
  visible: boolean;
  onEnter: () => void;
  onLeave: () => void;
  /** Shows the next background; omitted when there is nothing else to show. */
  onShuffle?: () => void;
  /** Whether this variant is shown on every page instead of a draw. */
  pinned: boolean;
  onPinChange: (pinned: boolean) => void;
  /** Leaves this variant out of future draws; omitted when it is the last one left. */
  onHide?: () => void;
}

/**
 * Corner link crediting the current background and its upstream source, with
 * pin, shuffle and hide buttons. At rest it is faint text without glass and
 * without the variant name; hovering or focusing it shows the full pill. A
 * pinned background keeps its pin button showing.
 *
 * The pill is anchored at its right edge and the buttons sit left of the text,
 * so a new background name would move them. After a button is used the pill
 * keeps its width, truncating the name, until the pointer or focus leaves, so
 * repeated clicks land on the same button. The pin, always present, comes
 * first; buttons that come and go follow it.
 */
export function SourceBadge({
  effect,
  variant,
  visible,
  onEnter,
  onLeave,
  onShuffle,
  pinned,
  onPinChange,
  onHide,
}: Props) {
  const { t } = useI18n();
  const [lockedWidth, setLockedWidth] = useState<number>();
  const preset = getEffect(effect);
  const label = getVariant(effect, variant)?.label;

  const act = (action: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
    const pill = event.currentTarget.parentElement;
    if (pill) setLockedWidth(width => width ?? pill.getBoundingClientRect().width);
    action();
  };
  // A touch pointer leaves on every lift, so only a mouse or pen leaving ends the lock.
  const leave = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') setLockedWidth(undefined);
    onLeave();
  };
  const blur = (event: FocusEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setLockedWidth(undefined);
  };

  return (
    <div
      className="source-zone dock-zone"
      data-visible={visible}
      onPointerEnter={onEnter}
      onPointerLeave={leave}
      onBlur={blur}
    >
      <LiquidGlassPanel
        className="source-glass ui-surface"
        data-locked={lockedWidth !== undefined || undefined}
        style={lockedWidth === undefined ? undefined : { width: lockedWidth }}
      >
        <button
          className="source-action source-pin"
          aria-label={t('pinVariant')}
          aria-pressed={pinned}
          title={pinned ? t('unpinVariant') : t('pinVariant')}
          onClick={act(() => onPinChange(!pinned))}
        >
          <HugeiconsIcon
            aria-hidden="true"
            icon={pinned ? PinOffIcon : PinIcon}
            size={13}
            strokeWidth={1.9}
          />
        </button>
        {onShuffle && !pinned && (
          <button
            className="source-action source-shuffle"
            aria-label={t('shuffleBackground')}
            title={t('shuffleBackground')}
            onClick={act(onShuffle)}
          >
            <HugeiconsIcon aria-hidden="true" icon={RefreshIcon} size={13} strokeWidth={1.9} />
          </button>
        )}
        {onHide && (
          <button
            className="source-action source-hide"
            aria-label={t('hideVariant')}
            title={t('hideVariant')}
            onClick={act(onHide)}
          >
            <HugeiconsIcon aria-hidden="true" icon={ViewOffSlashIcon} size={13} strokeWidth={1.9} />
          </button>
        )}
        <a
          className="effect-source"
          href={resolveVariant(effect, variant).source}
          target="_blank"
          rel="noopener noreferrer"
          title={`${preset.name} · ${t('reference')}`}
        >
          {preset.sourceName}
          {label && <span className="source-variant">{` · ${label}`}</span>}
        </a>
      </LiquidGlassPanel>
    </div>
  );
}
