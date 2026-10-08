import { useI18n } from '../i18n/react';
import { GlassPanel } from '../components/GlassPanel';
import { getEffect, type EffectId } from './presets';
import { getVariant, resolveVariant } from './variants';

interface Props {
  effect: EffectId;
  variant: string | undefined;
  visible: boolean;
  onEnter: () => void;
  onLeave: () => void;
}

/** Corner link crediting the current background and its upstream source. */
export function SourceBadge({ effect, variant, visible, onEnter, onLeave }: Props) {
  const { t } = useI18n();
  const preset = getEffect(effect);
  const label = getVariant(effect, variant)?.label;
  return <div className="source-zone dock-zone" data-visible={visible} onPointerEnter={onEnter} onPointerLeave={onLeave}>
    <GlassPanel className="source-glass ui-surface">
      <a
        className="effect-source"
        href={resolveVariant(effect, variant).source}
        target="_blank"
        rel="noopener noreferrer"
        title={`${preset.name} · ${t('reference')}`}
      >
        {preset.sourceName}{label ? ` · ${label}` : ''}
      </a>
    </GlassPanel>
  </div>;
}
