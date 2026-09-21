const CYCLE = 12;
const FREQUENCY = Math.PI * 2 / CYCLE;
export function breathingTime(seconds: number): number {
  return seconds * .32 - .08 / FREQUENCY * Math.sin(seconds * FREQUENCY);
}
