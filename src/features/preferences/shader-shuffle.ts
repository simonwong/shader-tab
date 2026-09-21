import { SHADER_GRADIENT_TYPES, type ShaderGradientType } from '../../effects/presets';

export const SHADER_SHUFFLE_KEY = 'shader-gradient:shuffle:v1';
interface ShuffleState { remaining: ShaderGradientType[]; last: ShaderGradientType }
export function drawShaderShape(saved: unknown, random = Math.random): { shape: ShaderGradientType; state: ShuffleState } {
  const previous = saved && typeof saved === 'object' ? saved as Partial<ShuffleState> : {};
  let remaining = Array.isArray(previous.remaining)
    ? [...new Set(previous.remaining.filter((value) => SHADER_GRADIENT_TYPES.includes(value)))] : [];
  if (!remaining.length) {
    remaining = [...SHADER_GRADIENT_TYPES];
    for (let index = remaining.length - 1; index > 0; index--) {
      const next = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))));
      [remaining[index], remaining[next]] = [remaining[next]!, remaining[index]!];
    }
    if (remaining[0] === previous.last) [remaining[0], remaining[1]] = [remaining[1]!, remaining[0]!];
  }
  const shape = remaining.shift()!;
  return { shape, state: { remaining, last: shape } };
}
