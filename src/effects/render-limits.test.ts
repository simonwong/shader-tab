import { describe, expect, it, vi } from 'vitest';
import { createRenderLimitStore, isSoftwareRenderer, SLOW_MARK_MS } from './render-limits';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const KEY = 'shader-tab:slow-variants:v1';

describe('isSoftwareRenderer', () => {
  it.each([
    'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
    'ANGLE (Microsoft, Microsoft Basic Render Driver (0x0000008C) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'llvmpipe (LLVM 15.0.7, 256 bits)',
  ])('flags %s', name => {
    expect(isSoftwareRenderer(name)).toBe(true);
  });

  it.each([
    'ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00005917) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002503) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)',
  ])('accepts %s', name => {
    expect(isSoftwareRenderer(name)).toBe(false);
  });
});

describe('render limit store', () => {
  it('keeps slow marks across pages until they expire', () => {
    let now = 1_000_000;
    const storage = memoryStorage();
    createRenderLimitStore(storage, () => now).markSlow('smoke-ring/halo');

    now += SLOW_MARK_MS - 1;
    const later = createRenderLimitStore(storage, () => now);
    expect(later.isSlow('smoke-ring/halo')).toBe(true);
    expect(later.get().slow).toEqual(['smoke-ring/halo']);

    now += 2;
    expect(later.isSlow('smoke-ring/halo')).toBe(false);
    expect(createRenderLimitStore(storage, () => now).get().slow).toEqual([]);
  });

  it('drops malformed and future entries', () => {
    const storage = memoryStorage({
      [KEY]: JSON.stringify({
        'warp/silk': 'yesterday',
        'water/pool': 5_000,
        'god-rays/dawn': 900,
      }),
    });
    expect(createRenderLimitStore(storage, () => 1_000).get().slow).toEqual(['god-rays/dawn']);
    expect(createRenderLimitStore(memoryStorage({ [KEY]: '{' })).get().slow).toEqual([]);
  });

  it('keeps marks another tab wrote after this one started', () => {
    const storage = memoryStorage();
    const first = createRenderLimitStore(storage, () => 10);
    createRenderLimitStore(storage, () => 10).markSlow('warp/silk');
    first.markSlow('water/pool');
    expect(Object.keys(JSON.parse(storage.data.get(KEY)!)).toSorted()).toEqual([
      'warp/silk',
      'water/pool',
    ]);
  });

  it('notifies on change and clears everything', () => {
    const storage = memoryStorage();
    const store = createRenderLimitStore(storage, () => 10);
    const listener = vi.fn<() => void>();
    store.subscribe(listener);
    store.noteSoftware();
    store.noteSoftware();
    store.markSlow('warp/silk');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.get()).toEqual({ software: true, slow: ['warp/silk'] });

    store.clear();
    expect(store.get()).toEqual({ software: false, slow: [] });
    expect(storage.data.has(KEY)).toBe(false);
  });

  it('works without storage', () => {
    const store = createRenderLimitStore(undefined, () => 10);
    store.markSlow('warp/silk');
    expect(store.isSlow('warp/silk')).toBe(true);
  });
});
