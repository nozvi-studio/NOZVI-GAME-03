// D3-R25/R28 pure steer feedback: trail buffer, segment alpha, chevron pose. No Phaser.
import type { MotionD3Balance } from '../../core/balance';
import { clamp01, cubicOut, lerp } from '../motion/curves';

export interface TrailPt { x: number; y: number; t: number }

/** D3-R25 drop points older than the window, keeping one older point as the first segment start. */
export function pruneTrail(buf: TrailPt[], now: number, trailMs: number, keepAnchor = false): void {
  let i = 0;
  while (i < buf.length && buf[i]!.t < now - trailMs) i++;
  if (keepAnchor && i > 0 && i < buf.length) i--;
  if (i > 0) buf.splice(0, i);
}
/** D3-R25 append one finger point and keep the last trailMs of the path. */
export function pushTrail(buf: TrailPt[], p: TrailPt, trailMs: number): void {
  buf.push(p); pruneTrail(buf, p.t, trailMs, true);
}
/** D3-R25 alpha of a trail point by age: trailAlpha at the finger, 0 at trailMs. */
export const segAlpha = (t: number, now: number, c: Pick<MotionD3Balance, 'trailMs' | 'trailAlpha'>): number =>
  c.trailAlpha * clamp01(1 - (now - t) / c.trailMs);
/** D3-R28 no trail under reduced motion. */
export const trailOn = (reduced: boolean): boolean => !reduced;
/** D3-R25/R28 chevron at the head: pop to `overshoot` in the first half, fade in the second; reduced = fade only. */
export function chevronPose(elapsed: number, reduced: boolean, c: Pick<MotionD3Balance, 'chevronMs'>, overshoot: number):
  { scale: number; alpha: number } | null {
  if (elapsed >= c.chevronMs) return null;
  const u = clamp01(elapsed / c.chevronMs);
  if (reduced) return { scale: 1, alpha: 1 - u };
  const half = u < 0.5;
  const scale = half ? lerp(0.6, overshoot, cubicOut(u * 2)) : lerp(overshoot, 1, (u - 0.5) * 2);
  return { scale, alpha: half ? 1 : 1 - (u - 0.5) * 2 };
}
