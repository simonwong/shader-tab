// ThreeUI, copyright Meng To. MIT; see public/licenses/threeui.txt.
// Signal Particles and Override Grid use the shared clock and resolution budget.
import { ARC_SURFACE } from '../presets';
import { mountCanvas2dPainter } from './canvas2d';
import type { DriverFactory } from './types';

export const createSignalParticlesDriver: DriverFactory = (host, { theme }) => {
  const light = theme === 'day';
  return mountCanvas2dPainter(host, ({ context: ctx, width, height, seconds, pointer }) => {
    ctx.fillStyle = ARC_SURFACE[theme];
    ctx.fillRect(0, 0, width, height);
    const time = seconds * 1.2, spacing = 16, dotRadius = 1.5;
    const cols = Math.floor(width / spacing), rows = Math.floor(height / spacing);
    const offsetX = (width - cols * spacing) / 2, offsetY = (height - rows * spacing) / 2;
    for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) {
      const nx = i * .1 + pointer.x * .15, ny = j * .1 + pointer.y * .15;
      const value = Math.sin(nx + time * .5) * Math.cos(ny - time * .3) + Math.sin(nx * .5 - ny * .5 + time * .8);
      if (value <= .1) continue;
      ctx.beginPath();
      ctx.arc(offsetX + i * spacing, offsetY + j * spacing, dotRadius, 0, Math.PI * 2);
      const highlight = Math.sin(i * 12.34) * Math.cos(j * 56.78);
      ctx.fillStyle = highlight > .98 ? light ? '#1d4ed8' : '#3b82f6'
        : highlight < -.98 ? light ? '#5b21b6' : '#8b5cf6'
          : `rgba(${light ? '36,48,68' : '148,163,184'},${Math.min(.6, (value - .1) * .8)})`;
      ctx.fill();
    }
  });
};

export const createOverrideGridDriver: DriverFactory = (host, { theme }) => {
  const light = theme === 'day';
  return mountCanvas2dPainter(host, ({ context: ctx, width, height, seconds, pointer }) => {
    ctx.fillStyle = ARC_SURFACE[theme];
    ctx.fillRect(0, 0, width, height);
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
  });
};
