// D3-R23/R24/R28 pure touch feedback math and plans: no Phaser, no allocation beyond the returned record.
import type { MotionD3Balance } from '../../core/balance';
import { clamp01, cubicOut, lerp } from '../motion/curves';
import type { SkinTone } from './skin';

export type BurstKind = 'full' | 'ring';
/** D3-R23 primary and skill buttons get ring + sparks; every other tone the ring only. */
export const burstKind = (tone: SkinTone): BurstKind => (tone === 'primary' || tone === 'skillA' || tone === 'skillB' ? 'full' : 'ring');
/** D3-R23 ring pose at progress t in 0..1. */
export function ringAt(t: number, c: MotionD3Balance): { scale: number; alpha: number } {
  return { scale: lerp(c.burstFromScale, c.burstToScale, cubicOut(t)), alpha: 1 - clamp01(t) };
}
/** D3-R23 spark i of n at progress t: even fan starting straight up. */
export function sparkAt(i: number, n: number, t: number, c: MotionD3Balance): { dx: number; dy: number; alpha: number; scale: number } {
  const a = (2 * Math.PI * i) / n - Math.PI / 2, d = c.burstSparkPx * cubicOut(t), u = clamp01(t);
  return { dx: Math.cos(a) * d + 0, dy: Math.sin(a) * d + 0, alpha: 1 - u, scale: lerp(1, c.burstSparkEndScale, u) };
}
/** D3-R24 horizontal shake offset: a decaying sine with shakeCycles cycles. */
export function shakeDx(t: number, c: MotionD3Balance): number {
  const u = clamp01(t);
  return Math.sin(2 * Math.PI * c.shakeCycles * u) * c.shakePx * (1 - u);
}
export interface TapPlan { ringMs: number; sparks: number }
/** D3-R23/R28 what one tap spawns, given the live particle count. */
export function tapPlan(kind: BurstKind, reduced: boolean, live: number, c: MotionD3Balance): TapPlan {
  if (reduced) return { ringMs: c.ringFadeMs, sparks: 0 };
  return { ringMs: c.burstMs, sparks: kind === 'ring' ? 0 : Math.max(0, Math.min(c.burstSparks, c.burstMaxParticles - live)) };
}
/** D3-R24/R28 a refused tap. */
export const deniedPlan = (reduced: boolean): { shake: boolean; badgeFlash: boolean } => ({ shake: !reduced, badgeFlash: true });
