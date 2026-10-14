import { describe, expect, it } from 'vitest';
import { wakesControls } from './use-idle';

const mouse = (clientY: number) => ({ pointerType: 'mouse', clientY });

describe('wakesControls', () => {
  it('wakes on mouse movement in the bottom band only', () => {
    expect(wakesControls(mouse(899), 900)).toBe(true);
    expect(wakesControls(mouse(630), 900)).toBe(true);
    expect(wakesControls(mouse(629), 900)).toBe(false);
    expect(wakesControls(mouse(40), 900)).toBe(false);
  });

  it('keeps the band at least 160 px tall on short windows', () => {
    expect(wakesControls(mouse(240), 400)).toBe(true);
    expect(wakesControls(mouse(239), 400)).toBe(false);
  });

  it('always wakes for touch and pen', () => {
    expect(wakesControls({ pointerType: 'touch', clientY: 10 }, 900)).toBe(true);
    expect(wakesControls({ pointerType: 'pen', clientY: 10 }, 900)).toBe(true);
  });
});
