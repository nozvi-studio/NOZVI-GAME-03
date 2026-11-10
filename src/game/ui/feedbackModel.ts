// MOT-1 pure feedback math: no Phaser, no allocation per call. Spec: 2026-11-10-motion-1-widget-feedback-design.md sections 3 and 8.
import type { MotionBalance } from '../../core/balance';
import { clamp01, cubicOut, lerp } from '../motion/curves';

export type FeedbackKind = 'pill' | 'round' | 'card' | 'switch' | 'hudButton';
export interface FeedbackScales { press: number; release: number; hover: number }

/** MOT-1-R3 per-kind scales. `card` (wide targets) uses half deltas derived from the same balance keys. */
export function feedbackScales(kind: FeedbackKind, cfg: MotionBalance): FeedbackScales {
  if (kind === 'card') {
    return { press: 1 - (1 - cfg.pressScale) / 2, release: 1 + (cfg.releaseOvershoot - 1) / 2, hover: 1 + (cfg.hoverScale - 1) / 2 };
  }
  return { press: cfg.pressScale, release: cfg.releaseOvershoot, hover: cfg.hoverScale };
}
/** Config for the extra `card` adapter: the same balance with only the three scales halved. */
export function halfMotionCfg(cfg: MotionBalance): MotionBalance {
  const s = feedbackScales('card', cfg);
  return { ...cfg, pressScale: s.press, releaseOvershoot: s.release, hoverScale: s.hover };
}
/** MOT-1-R3 hover feedback (fine pointer only, enforced by the adapter): pill, round and card. */
export const hasHover = (kind: FeedbackKind): boolean => kind === 'pill' || kind === 'round' || kind === 'card';

/** MOT-1-R8 knob centre x (px from the track centre) at slide progress t, ending on the `on` side; cubicOut easing. */
export function knobX(on: boolean, t: number, knobPx: number): number {
  const from = on ? -knobPx : knobPx;
  return lerp(from, -from, cubicOut(t));
}
const channel = (from: number, to: number, t: number, shift: number): number =>
  Math.round(lerp((from >> shift) & 255, (to >> shift) & 255, clamp01(t))) << shift;
/** MOT-1-R8 linear per-channel 0xRRGGBB lerp; exact at t = 0 and t = 1. */
export const trackColor = (from: number, to: number, t: number): number =>
  channel(from, to, t, 16) | channel(from, to, t, 8) | channel(from, to, t, 0);
/** MOT-1-R8 the border colour switches at t = 0.5. */
export const borderColor = (from: number, to: number, t: number): number => (t < 0.5 ? from : to);
/** MOT-1-R11 an edit that returns the same state object was refused. */
export const isRejected = <T>(prev: T, next: T): boolean => prev === next;
