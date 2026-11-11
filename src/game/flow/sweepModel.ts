// D3-R21 attention: one gloss sweep per MOT-2 pulse period; D3-R28 none under reduced motion. Pure.
export const sweepCycle = (time: number, t0: number, periodMs: number): number => Math.floor((time - t0) / periodMs);
export function sweepX(elapsed: number, sweepMs: number, w: number, band: number): number | null {
  if (elapsed < 0 || elapsed > sweepMs) return null;
  const from = -w / 2 - band, to = w / 2 + band;
  return from + (to - from) * (elapsed / sweepMs);
}
export const sweepAllowed = (reduced: boolean, motionOff: boolean): boolean => !reduced && !motionOff;
