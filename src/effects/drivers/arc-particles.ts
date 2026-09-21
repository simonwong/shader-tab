// ThreeUI, copyright Meng To. MIT; see public/licenses/threeui.txt.
// Signal Particles and Override Grid use the shared clock and resolution budget.
import type { DriverFactory } from './types';
export const createDriver: DriverFactory = (host, _effect, theme, _shape, variant) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  host.append(canvas);
  let width = 1, height = 1;
  const light = theme === 'day';
  return {
    canvas, engine: 'threeui-canvas2d',
    resize(w, h, density) { width = w; height = h; canvas.width = Math.round(w * density); canvas.height = Math.round(h * density); ctx.setTransform(density, 0, 0, density, 0, 0); },
    render(seconds, _delta, pointer) {
      ctx.fillStyle = light ? '#eef1f6' : '#0a0a0a'; ctx.fillRect(0, 0, width, height);
      if (variant === 'signal-particles') {
        const time = seconds * 1.2, spacing = 16, dotRadius = 1.5;
        const cols = Math.floor(width / spacing), rows = Math.floor(height / spacing);
        const offsetX = (width - cols * spacing) / 2, offsetY = (height - rows * spacing) / 2;
        for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) {
          const nx = i * .1 + pointer.x * .15, ny = j * .1 + pointer.y * .15;
          const value = Math.sin(nx + time * .5) * Math.cos(ny - time * .3) + Math.sin(nx * .5 - ny * .5 + time * .8);
          if (value <= .1) continue;
          ctx.beginPath(); ctx.arc(offsetX + i * spacing, offsetY + j * spacing, dotRadius, 0, Math.PI * 2);
          const highlight = Math.sin(i * 12.34) * Math.cos(j * 56.78);
          ctx.fillStyle = highlight > .98 ? light ? '#1d4ed8' : '#3b82f6' : highlight < -.98 ? light ? '#5b21b6' : '#8b5cf6' : `rgba(${light ? '36,48,68' : '148,163,184'},${Math.min(.6, (value - .1) * .8)})`;
          ctx.fill();
        }
      } else {
        const time = seconds * 2.4, blockSize = 48, pitch = 50;
        const cols = Math.ceil(width / pitch), rows = Math.ceil(height / pitch);
        const centerX = cols / 2 + pointer.x, centerY = rows / 2 + pointer.y;
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
          const wave = Math.sin(time - Math.hypot(i - centerX, j - centerY) * .4);
          if (wave <= 0) continue;
          ctx.fillStyle = `rgba(${light ? '194,65,12' : '249,115,22'},${wave * .15 * (light ? 1.35 : 1)})`;
          const size = blockSize * (wave * .7 + .3), offset = (pitch - size) / 2;
          ctx.fillRect(i * pitch + offset, j * pitch + offset, size, size);
        }
      }
    },
    dispose() { canvas.width = canvas.height = 1; canvas.remove(); },
  };
};
