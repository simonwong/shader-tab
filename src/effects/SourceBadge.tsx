import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon } from '@hugeicons/core-free-icons';
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
}

/** Corner link crediting the current background and its upstream source, with a shuffle button. */
export function SourceBadge({ effect, variant, visible, onEnter, onLeave, onShuffle }: Props) {
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
        {onShuffle && (
          <button
            className="source-shuffle"
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
          {label ? ` · ${label}` : ''}
        </a>
      </LiquidGlassPanel>
    </div>
  );
}
