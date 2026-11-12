// MOT-4 pure HUD motion decisions (what changed, which cue, how long); the Phaser views only play them. Spec section 6.
import type { MotionBalance } from '../../core/balance';
import type { SkillState } from './hudModel';

/** MOT-4-R9 a spend (target falls) eases faster than a gain. */
export const easeMsFor = (prev: number, next: number, cfg: Pick<MotionBalance, 'barEaseMs' | 'barSpendMs'>): number => next < prev ? cfg.barSpendMs : cfg.barEaseMs;

export type ReadyEdge = 'pop' | 'dip' | null;
/** MOT-4-R11 off -> ready pops, ready -> off dips; active transitions and first paint are quiet. */
export const skillReadyEdge = (prev: SkillState | null, next: SkillState | null): ReadyEdge =>
  prev === 'off' && next === 'ready' ? 'pop' : prev === 'ready' && next === 'off' ? 'dip' : null;

/** MOT-4-R12 the first paint of a run never animates. */
export const levelTitleChanged = (prev: string | null, next: string): boolean => prev !== null && prev !== next;

export type EnergyCue = 'low' | 'full' | 'none';
/** MOT-4-R10 low at or below energyLowFrac, full at exactly 1. */
export const energyCue = (fill: number, lowFrac: number): EnergyCue => fill >= 1 ? 'full' : fill <= lowFrac ? 'low' : 'none';

export type ChipTransition = 'in' | 'out' | 'cross' | 'none';
/** MOT-4-R13 arguments are chip kinds; a text-only change (ramp countdown) is quiet. */
export const chipTransition = (prev: string | null, next: string | null): ChipTransition =>
  prev === null ? (next === null ? 'none' : 'in') : next === null ? 'out' : prev !== next ? 'cross' : 'none';

/** UIFIX-R3: the wait prompt has no icon (no arrow icon exists); ramp / checkpoint chips keep the flag. */
export const chipHasIcon = (kind: 'ramp' | 'checkpoint' | 'wait' | undefined): boolean => kind !== 'wait';
