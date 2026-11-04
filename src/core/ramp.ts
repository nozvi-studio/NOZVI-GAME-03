import type { Balance } from './balance';
import { levelTickMs } from './level';
import type { SimState, StepCtx } from './types';

// MEC-008-R8 linear checkpoint ramp, rounded half up in integer milliseconds.
export function rampTick(b: Balance, startLevel: number, k: number): number {
  const t1 = levelTickMs(b, 1), d = t1 - levelTickMs(b, startLevel), r = b.checkpoints.rampMangoes;
  return t1 - Math.floor((2 * d * k + r) / (2 * r));
}

// MEC-008-R8 the live base speed uses the ramp until its first ending condition.
export function baseTickMs(s: SimState, b: Balance): number {
  return s.rampActive ? rampTick(b, s.startLevel, s.rampEaten) : levelTickMs(b, s.level);
}

// MEC-008-R8 emit at most once, and only for a checkpoint start.
function endRamp(s: SimState, ctx: StepCtx): void {
  if (!s.rampActive) return;
  s.rampActive = false;
  if (s.startLevel > 1) ctx.emit({ type: 'rampEnded', level: s.level });
}

// MEC-008-R8 every mango advances the count, including after the ramp ends.
export function rampOnMangoEaten(s: SimState, b: Balance, ctx: StepCtx): void {
  s.rampEaten += 1;
  if (s.rampEaten >= b.checkpoints.rampMangoes) endRamp(s, ctx);
}

// MEC-008-R8 a level-up ends the ramp immediately after its levelUp event.
export function rampOnLevelUp(s: SimState, ctx: StepCtx): void { endRamp(s, ctx); }
