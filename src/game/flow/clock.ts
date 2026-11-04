// src/game/flow/clock.ts — frame delta clamp + fractional carry → integer ms (design §4)
export interface FrameClock { carry: number }
export const createClock = (): FrameClock => ({ carry: 0 });
// GDD-13 clamp frame deltas and carry fractional milliseconds.
export function clockStep(c: FrameClock, deltaMs: number, maxMs: number): number {
  c.carry += Math.min(Math.max(0, deltaMs), maxMs);
  const ms = Math.floor(c.carry);
  c.carry -= ms;
  return ms;
}
