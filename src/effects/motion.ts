const CYCLE = 12;
const FREQUENCY = (Math.PI * 2) / CYCLE;
export function breathingTime(seconds: number): number {
  return seconds * 0.12 - (0.04 / FREQUENCY) * Math.sin(seconds * FREQUENCY);
}

/** The user's motion setting: 静 (still), 柔 (soft, the default) or 活 (lively). */
export const MOTIONS = ['still', 'soft', 'lively'] as const;
export type Motion = (typeof MOTIONS)[number];
export const isMotion = (value: unknown): value is Motion => MOTIONS.includes(value as Motion);

/**
 * How fast real time feeds the breathing clock at each motion level. `soft`
 * is the level the motion budget (scripts/review-motion.mjs) is checked at.
 * `still` is close to a resting image that breathes; `lively` is for people
 * who want to see the shaders move.
 */
export const MOTION_SPEED: Record<Motion, number> = { still: 0.35, soft: 1, lively: 1.8 };
