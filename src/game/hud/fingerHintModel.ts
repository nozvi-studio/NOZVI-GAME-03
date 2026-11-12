// D3-R26/R28 pure first-input finger hint: pose in a looping swipe, static under reduced motion.
import type { MotionD3Balance } from '../../core/balance';
import { clamp01, cubicOut } from '../motion/curves';
const PH = { inEnd: 0.15, pressEnd: 0.25, travelEnd: 0.7, outEnd: 0.85 } as const;   // loop phase fractions

export function fingerPose(t: number, reduced: boolean, c: Pick<MotionD3Balance, 'hintLoopMs' | 'hintTravelPx'>):
  { dx: number; alpha: number; press: boolean } {
  if (reduced) return { dx: 0, alpha: 1, press: false };
  const u = (((t % c.hintLoopMs) + c.hintLoopMs) % c.hintLoopMs) / c.hintLoopMs;
  if (u < PH.inEnd) return { dx: 0, alpha: u / PH.inEnd, press: false };
  if (u < PH.pressEnd) return { dx: 0, alpha: 1, press: true };
  if (u < PH.travelEnd) return { dx: c.hintTravelPx * cubicOut(clamp01((u - PH.pressEnd) / (PH.travelEnd - PH.pressEnd))), alpha: 1, press: true };
  if (u < PH.outEnd) return { dx: c.hintTravelPx, alpha: 1 - (u - PH.travelEnd) / (PH.outEnd - PH.travelEnd), press: false };
  return { dx: c.hintTravelPx, alpha: 0, press: false };
}
/** D3-R26 C3: touch devices, only where the hint text has a slot, only while the run waits. */
export const fingerShown = (touch: boolean, hasHintSlot: boolean, waiting: boolean): boolean => touch && hasHintSlot && waiting;
