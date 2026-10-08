import { createCrtRenderer, CRT_DEFAULTS, CRT_VARIANTS } from '../vendor/crtRenderer';
import type { DriverFactory } from './types';
export const createDriver: DriverFactory = (host, _effect, theme, _shape, variant) => {
  const canvas = document.createElement('canvas');
  host.append(canvas);
  const selected = CRT_VARIANTS.find(value => value === variant) ?? 'terminal';
  const options = { ...CRT_DEFAULTS, variant: selected };
  if (theme === 'day' && selected === 'terminal') canvas.style.filter = 'hue-rotate(285deg) saturate(.8)';
  const renderer = createCrtRenderer(host, canvas, () => options);
  let elapsedMs = 0;
  return {
    canvas, engine: 'threeui-webgl', resize: renderer.resize,
    render(seconds, delta, pointer) { elapsedMs += delta * 1000; renderer.render(seconds * 1000, elapsedMs, pointer); },
    dispose() { renderer.dispose(); canvas.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove(); },
  };
};
