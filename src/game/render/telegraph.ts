// MOT-4 pure hazard telegraph pulse: rhythm tightens from telegraphHzStart to telegraphHzEnd as the warn runs out (R1, R2, R6).
// No wall clock, no accumulated state: the same (remainingMs, warnMs) always gives the same result. Spec: 2026-11-10-motion-4-telegraph-hud-feedback-design.md.
import type { Balance } from '../../core';
import type { MotionBalance } from '../../core/balance';
import { clamp01, cubicOut, lerp } from '../motion/curves';

export type TelegraphCfg = Pick<MotionBalance, 'telegraphHzStart' | 'telegraphHzEnd' | 'telegraphAlphaMin' | 'telegraphScaleAmp' | 'telegraphUrgentMs'>;
export interface Pulse { phase: number; hz: number; alpha: number; scale: number; progress: number; urgent: boolean }
export const newPulse = (): Pulse => ({ phase: 0, hz: 0, alpha: 1, scale: 1, progress: 0, urgent: false });

const wave = (phase: number): number => 0.5 + 0.5 * Math.cos(2 * Math.PI * phase);

/** MOT-4-R1 pulse for one warning. `out` is reused by draw code (allocation-free); reduced motion = static alpha 1 / scale 1 (urgent still set). */
export function telegraphPulse(remainingMs: number, warnMs: number, cfg: TelegraphCfg, reduced = false, out: Pulse = newPulse()): Pulse {
  const left = Math.min(Math.max(0, remainingMs), Math.max(0, warnMs));
  const progress = warnMs > 0 ? clamp01(1 - left / warnMs) : 1;
  const hz = lerp(cfg.telegraphHzStart, cfg.telegraphHzEnd, cubicOut(progress));
  out.progress = progress; out.hz = hz; out.urgent = left <= cfg.telegraphUrgentMs;
  if (reduced) { out.phase = 0; out.alpha = 1; out.scale = 1; return out; }
  // Closed form: elapsed seconds times the mean of the start rate and the current rate (hz never decreases, so phase never decreases).
  const phase = ((warnMs - left) / 1000) * (cfg.telegraphHzStart + hz) / 2, w = wave(phase);
  out.phase = phase; out.alpha = lerp(cfg.telegraphAlphaMin, 1, w); out.scale = 1 + cfg.telegraphScaleAmp * (2 * w - 1);
  return out;
}

/** MOT-4-R4 ring fade phase: a fixed-rate pulse on wall time (no warn to run out). */
export function steadyPulse(timeMs: number, cfg: TelegraphCfg, reduced = false, out: Pulse = newPulse()): Pulse {
  out.progress = 0; out.hz = cfg.telegraphHzStart; out.urgent = false;
  if (reduced) { out.phase = 0; out.alpha = 1; out.scale = 1; return out; }
  const phase = (timeMs / 1000) * cfg.telegraphHzStart, w = wave(phase);
  out.phase = phase; out.alpha = lerp(cfg.telegraphAlphaMin, 1, w); out.scale = 1 + cfg.telegraphScaleAmp * (2 * w - 1);
  return out;
}

/** Everything a draw function needs besides the snapshot: motion numbers, per-family warn lengths and the live hit-beat scale lookup. */
export interface TelegraphCtx {
  cfg: TelegraphCfg;
  warnMs: { mud: number; ice: number; gate: number; spike: number; bomb: number; bombCount: number; shrink: number };
  /** Current hit-beat / digit-pop scale for a beat key (1 when none is playing or under reduced motion). */
  beat(key: string): number;
}
export const telegraphCtx = (b: Balance, beat: (key: string) => number = () => 1): TelegraphCtx => ({
  cfg: b.motion,
  warnMs: { mud: b.mud.warnMs, ice: b.ice.warnMs, gate: b.gate.warnMs, spike: b.spike.warnMs, bomb: b.bomb.warnMs, bombCount: b.bomb.countdownMs, shrink: b.shrink.warnMs },
  beat,
});

/** MOT-4-R5 hazards carry no id in the snapshot: type + first cell is unique among live hazards (reserved cells). */
export const hazardKey = (h: { type: string; cells: readonly { x: number; y: number }[] }): string => `h:${h.type}:${h.cells[0]?.x},${h.cells[0]?.y}`;
export const cellKey = (prefix: 'g' | 's', id: number, x: number, y: number): string => `${prefix}:${id}:${x},${y}`;
