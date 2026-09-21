import { variantBackground } from './variants';
import { useEffect, useRef, useState } from 'react';
import { effectBackground, shaderGradientBackground, type EffectId, type ShaderGradientType, type Theme } from './presets';
import type { AmbientController } from './ambient';
export function AmbientBackground({ effect, theme, interactive, shaderGradientType, variant }: { effect: EffectId; theme: Theme; interactive: boolean; shaderGradientType: ShaderGradientType | undefined; variant: string | undefined }) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<AmbientController>(undefined);
  const latest = useRef({ effect, theme, interactive, shaderGradientType, variant });
  latest.current = { effect, theme, interactive, shaderGradientType, variant };
  const [renderer, setRenderer] = useState('static');
  useEffect(() => {
    if (!variant) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let generation = 0;
    let timer = 0;
    let idle = 0;
    let frame = 0;
    let failed = false;
    const dispose = () => { controller.current?.dispose(); controller.current = undefined; };
    const cancel = () => { generation++; window.clearTimeout(timer); window.cancelIdleCallback(idle); cancelAnimationFrame(frame); };
    const start = () => {
      cancel();
      if (motion.matches || failed) { dispose(); setRenderer('static'); return; }
      if (document.hidden) {
        controller.current?.pause();
        setRenderer(controller.current ? 'paused' : 'static');
        timer = window.setTimeout(() => { dispose(); setRenderer('suspended'); }, 30_000);
        return;
      }
      if (controller.current) { controller.current.resume(); setRenderer('live'); return; }
      const request = generation;
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
      idle = window.requestIdleCallback(() => {
        void import('./ambient').then(({ mountAmbient }) => {
          if (request !== generation || !host.current || document.hidden) return;
          controller.current = mountAmbient(host.current, latest.current.effect, latest.current.theme, () => { if (request === generation) setRenderer(document.hidden ? 'paused' : 'live'); }, () => { failed = true; controller.current = undefined; setRenderer('static'); }, latest.current.shaderGradientType, latest.current.variant);
          controller.current.setActive(latest.current.interactive);
        }).catch(() => { if (request === generation) { failed = true; setRenderer('static'); } });
      }, { timeout: 500 });
      }); });
    };
    motion.addEventListener('change', start);
    document.addEventListener('visibilitychange', start);
    setRenderer('static');
    start();
    return () => { cancel(); dispose(); motion.removeEventListener('change', start); document.removeEventListener('visibilitychange', start); };
  }, [effect, theme, shaderGradientType, variant]);
  useEffect(() => { controller.current?.setActive(interactive); }, [interactive]);
  return <div ref={host} className="ambient-background" aria-hidden="true" data-renderer={renderer} data-variant={variant} style={{ background: effect === 'shader-gradient' ? shaderGradientBackground(shaderGradientType) : variantBackground(effect, variant, theme) ?? effectBackground(effect, theme) }} />;
}
