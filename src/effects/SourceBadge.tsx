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
 * hide, pin and shuffle buttons. At rest it is faint text without glass and
 * without the variant name; hovering or focusing it shows the full pill. A
 * pinned background keeps its pin button showing.
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
  const preset = getEffect(effect);
  const label = getVariant(effect, variant)?.label;
  return (
    <div
      className="source-zone dock-zone"
      data-visible={visible}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <LiquidGlassPanel className="source-glass ui-surface">
        {onHide && (
          <button
            className="source-action source-hide"
            aria-label={t('hideVariant')}
            title={t('hideVariant')}
            onClick={onHide}
          >
            <HugeiconsIcon aria-hidden="true" icon={ViewOffSlashIcon} size={13} strokeWidth={1.9} />
          </button>
        )}
        <button
          className="source-action source-pin"
          aria-label={t('pinVariant')}
          aria-pressed={pinned}
          title={pinned ? t('unpinVariant') : t('pinVariant')}
          onClick={() => onPinChange(!pinned)}
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
            onClick={onShuffle}
          >
            <HugeiconsIcon aria-hidden="true" icon={RefreshIcon} size={13} strokeWidth={1.9} />
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
