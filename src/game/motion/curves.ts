// MOT-0 pure motion math: no Phaser, no allocation per call. Spec: 2026-11-10-motion-0-foundation-design.md section 5.
export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const cubicOut = (t: number): number => { const u = 1 - clamp01(t); return 1 - u * u * u; };
export const sineInOut = (t: number): number => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
/** Back ease-out: overshoots 1 by an amount set by s (Phaser's default is 1.70158). */
export const backOut = (t: number, s = 1.70158): number => { const x = clamp01(t) - 1; return 1 + x * x * ((s + 1) * x + s); };
/** MOT-0-R3 per-index entrance delay, capped. */
export const staggerDelay = (index: number, stepMs: number, capMs: number): number => Math.min(capMs, Math.max(0, index) * stepMs);
/** MOT-0-R5 integer count-up; exact `to` at t >= 1. */
export const countUpValue = (from: number, to: number, t: number): number => t >= 1 ? to : Math.round(lerp(from, to, cubicOut(t)));
/** MOT-0-R3 attention pulse scale: 1 +/- amp, one full period per periodMs. */
export const pulseScale = (timeMs: number, periodMs: number, amp: number): number => 1 + amp * Math.sin(2 * Math.PI * timeMs / periodMs);
/** MOT-3-R11 mango pop-in scale: `from` -> 1 with a back overshoot over `ms`; clamps before birth and after the end. */
export const mangoGrow = (timeMs: number, bornAt: number, ms: number, s: number, from: number): number =>
  lerp(from, 1, backOut((timeMs - bornAt) / ms, s));
/** MOT-3-R12 head tilt in degrees: starts at `deg` (signed) and eases to 0 over `ms`; the back undershoot is the bounce. */
export const turnTilt = (elapsedMs: number, ms: number, deg: number, s: number): number => deg * (1 - backOut(elapsedMs / ms, s));
