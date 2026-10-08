import { useEffect, useRef, useState } from 'react';
import { resolveVariant } from './variants';
import type { EffectId, Theme } from './presets';
import type { AmbientController } from './ambient';

interface Props {
  effect: EffectId;
  /** Variant id from the registry; undefined until the shuffle draw resolves. */
  variant: string | undefined;
  theme: Theme;
  interactive: boolean;
  pointerBlocked: boolean;
}

export function AmbientBackground({ effect, variant, theme, interactive, pointerBlocked }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<AmbientController>(undefined);
  const latest = useRef({ interactive, pointerBlocked });
  latest.current = { interactive, pointerBlocked };
  const [renderer, setRenderer] = useState('static');
  useEffect(() => {
    if (!variant) return;
    const definition = resolveVariant(effect, variant);
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let generation = 0;
    let timer = 0;
    let idle = 0;
    let frame = 0;
    let failed = false;
    const dispose = () => {
      controller.current?.dispose();
      controller.current = undefined;
    };
    const cancel = () => {
      generation++;
      window.clearTimeout(timer);
      window.cancelIdleCallback(idle);
      cancelAnimationFrame(frame);
    };
    const mount = (request: number) => {
      void import('./ambient').then(({ mountAmbient }) => {
        if (request !== generation || !host.current || document.hidden) return;
        const onReady = () => { if (request === generation) setRenderer(document.hidden ? 'paused' : 'live'); };
        const onFailure = () => {
          failed = true;
          controller.current = undefined;
          setRenderer('static');
        };
        controller.current = mountAmbient(host.current, definition, theme, onReady, onFailure);
        controller.current.setActive(latest.current.interactive);
        controller.current.setPointerBlocked(latest.current.pointerBlocked);
      }).catch(() => {
        if (request === generation) {
          failed = true;
          setRenderer('static');
        }
      });
    };
    const start = () => {
      cancel();
      if (motion.matches || failed) {
        dispose();
        setRenderer('static');
        return;
      }
      if (document.hidden) {
        controller.current?.pause();
        setRenderer(controller.current ? 'paused' : 'static');
        timer = window.setTimeout(() => { dispose(); setRenderer('suspended'); }, 30_000);
        return;
      }
      if (controller.current) {
        controller.current.resume();
        setRenderer('live');
        return;
      }
      const request = generation;
      // Wait two frames and an idle slot so the first paint of the page is never blocked.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          idle = window.requestIdleCallback(() => mount(request), { timeout: 500 });
        });
      });
    };
    motion.addEventListener('change', start);
    document.addEventListener('visibilitychange', start);
    setRenderer('static');
    start();
    return () => {
      cancel();
      dispose();
      motion.removeEventListener('change', start);
      document.removeEventListener('visibilitychange', start);
    };
  }, [effect, theme, variant]);
  useEffect(() => { controller.current?.setActive(interactive); }, [interactive]);
  useEffect(() => { controller.current?.setPointerBlocked(pointerBlocked); }, [pointerBlocked]);
  return <div
    ref={host}
    className="ambient-background"
    aria-hidden="true"
    data-renderer={renderer}
    data-variant={variant}
    style={{ background: resolveVariant(effect, variant).background(theme) }}
  />;
}
