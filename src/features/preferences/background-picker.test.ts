import { expect, it, vi } from 'vitest';
import type { EffectId } from '../../effects/presets';
import { variantIds } from '../../effects/variants';
import type { VariantDraw } from '../../platform/types';
import { createBackgroundPicker, type PickerOptions } from './background-picker';
import { DEFAULT_PREFERENCES, variantKey, type Preferences } from './model';
import { drawVariant } from './variant-shuffle';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const prefs = (patch: Partial<Preferences> = {}): Preferences => ({
  ...DEFAULT_PREFERENCES,
  effects: ['fluted-glass', 'shader-gradient'],
  ...patch,
});

/** A picker over in-memory shuffle bags, with the calls it made. */
function setup(initial = prefs(), options: Partial<PickerOptions> = {}) {
  const bags = new Map<EffectId, unknown>();
  const draw = vi.fn<PickerOptions['draw']>(async (effect, hidden) => {
    const { variant, state } = drawVariant(effect, bags.get(effect), Math.random, hidden);
    bags.set(effect, state);
    return { variant, saved: Promise.resolve() };
  });
  const onError = vi.fn<(error: unknown) => void>();
  const picker = createBackgroundPicker(initial, { draw, ...options });
  picker.watchErrors(onError);
  return { picker, draw, onError };
}

it('draws nothing until preferences load, then one variant for the page', async () => {
  const { picker, draw } = setup();
  picker.update(prefs(), false);
  await flush();
  expect(draw).not.toHaveBeenCalled();
  expect(picker.view().selection).toBeUndefined();
  picker.update(prefs(), true);
  await flush();
  const { effect, selection } = picker.view();
  expect(selection?.effect).toBe(effect);
  expect(variantIds(effect)).toContain(selection?.variant);
  expect(draw).toHaveBeenCalledTimes(1);
});

it('keeps the page background when hidden variants change the weights', async () => {
  const { picker, draw } = setup();
  picker.update(prefs(), true);
  await flush();
  const before = picker.view();
  const other = before.effect === 'fluted-glass' ? 'shader-gradient' : 'fluted-glass';
  const [first] = variantIds(other);
  picker.update(prefs({ hiddenVariants: [variantKey(other, first!)] }), true);
  await flush();
  expect(picker.view().selection).toBe(before.selection);
  expect(draw).toHaveBeenCalledTimes(1);
});

it('reshuffles to another effect, or to the next variant of a lone effect', async () => {
  const pooled = setup();
  pooled.picker.update(prefs(), true);
  await flush();
  const first = pooled.picker.view().effect;
  pooled.picker.reshuffle();
  await flush();
  expect(pooled.picker.view().selection?.effect).not.toBe(first);

  const alone = setup(prefs({ shuffle: false, activeEffect: 'fluted-glass' }));
  alone.picker.update(prefs({ shuffle: false, activeEffect: 'fluted-glass' }), true);
  await flush();
  const shown = alone.picker.view().selection?.variant;
  alone.picker.reshuffle();
  await flush();
  expect(alone.picker.view().selection?.effect).toBe('fluted-glass');
  expect(alone.picker.view().selection?.variant).not.toBe(shown);
});

it('hides the variant on screen, saves it, and draws the next one without it', async () => {
  const lone = prefs({ shuffle: false, activeEffect: 'fluted-glass' });
  const { picker, draw } = setup(lone);
  picker.update(lone, true);
  await flush();
  const shown = picker.view().selection!;
  const key = variantKey(shown.effect, shown.variant);
  const update = picker.hide() as (current: Preferences) => Partial<Preferences>;
  expect(update(lone)).toEqual({ hiddenVariants: [key] });
  expect(draw.mock.calls[1]![1]).toEqual([key]);
  await flush();
  expect(picker.view().selection?.variant).not.toBe(shown.variant);
});

it('offers hiding only while another variant stays visible', async () => {
  const ids = variantIds('fluted-glass');
  const hiddenVariants = ids.slice(0, -1).map(id => variantKey('fluted-glass', id));
  const lone = prefs({ shuffle: false, activeEffect: 'fluted-glass', hiddenVariants });
  const { picker } = setup(lone);
  picker.update(lone, true);
  await flush();
  expect(picker.view()).toMatchObject({
    selection: { variant: ids.at(-1) },
    canHide: false,
    canReshuffle: false,
  });
});

it('pins the variant on screen, and keeps it on this page when unpinned', async () => {
  const { picker, draw } = setup();
  picker.update(prefs(), true);
  await flush();
  const shown = picker.view().selection!;
  expect(picker.pin(true)).toEqual({ pinnedVariant: variantKey(shown.effect, shown.variant) });

  const pinned = { effect: 'shader-gradient' as const, variant: variantIds('shader-gradient')[1]! };
  picker.update(prefs({ pinnedVariant: variantKey(pinned.effect, pinned.variant) }), true);
  expect(picker.view()).toMatchObject({ selection: pinned, pinned: true, canReshuffle: false });
  picker.update(prefs(), true);
  await flush();
  expect(picker.view()).toMatchObject({ selection: pinned, pinned: false, canReshuffle: true });
  expect(draw).toHaveBeenCalledTimes(1);
});

it('shows a local pick when a draw fails, reports both kinds of failure, and draws again', async () => {
  let calls = 0;
  const { picker, onError } = setup(prefs({ shuffle: false, activeEffect: 'fluted-glass' }), {
    draw: async (): Promise<VariantDraw> => {
      if (calls++ === 0) throw new Error('read failed');
      return {
        variant: variantIds('fluted-glass')[0]!,
        saved: Promise.reject(new Error('write failed')),
      };
    },
  });
  picker.update(prefs({ shuffle: false, activeEffect: 'fluted-glass' }), true);
  await flush();
  expect(variantIds('fluted-glass')).toContain(picker.view().selection?.variant);
  expect(onError).toHaveBeenCalledTimes(1);
  picker.reshuffle();
  await flush();
  expect(calls).toBe(2);
  expect(onError).toHaveBeenCalledTimes(2);
});

it('ignores a draw that resolves after the page moved on', async () => {
  const pending: ((variant: string) => void)[] = [];
  const { picker } = setup(prefs(), {
    draw: effect =>
      new Promise<VariantDraw>(resolve =>
        pending.push(variant => resolve({ variant, saved: Promise.resolve() })),
      ).then(draw => ({ ...draw, variant: draw.variant || variantIds(effect)[0]! })),
  });
  picker.update(prefs(), true);
  const first = picker.view().effect;
  picker.reshuffle();
  const second = picker.view().effect;
  expect(second).not.toBe(first);
  pending[1]!('');
  await flush();
  pending[0]!('');
  await flush();
  expect(picker.view().selection?.effect).toBe(second);
});
