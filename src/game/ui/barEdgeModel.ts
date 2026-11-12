// D3-R27/R28 pure value-change cues: bar leading edge, full flash, skill-ready sweep gate.
import type { MotionD3Balance } from '../../core/balance';
import { clamp01 } from '../motion/curves';

/** Skill readiness edge (same union as hud/hudMotion `ReadyEdge`; inlined to keep ui/ free of hud/ imports). */
export type SweepEdge = 'pop' | 'dip' | null;
export const edgeAlpha = (ms: number, c: Pick<MotionD3Balance, 'edgeAlpha'>, fadeMs: number): number => c.edgeAlpha * (1 - clamp01(ms / fadeMs));
export const flashAlpha = (elapsed: number, flashMs: number): number => 1 - clamp01(elapsed / flashMs);
/** True when the quota bar reaches full (final-level win) or a previously painted quota falls (the level-up reset); false on first paint (prev < 0). */
export const quotaFlash = (prev: number, next: number): boolean => (prev < 1 && next >= 1) || (prev >= 0 && next < prev);
export const readySweep = (edge: SweepEdge, reduced: boolean): boolean => edge === 'pop' && !reduced;
