// MOT-2-R8 Home idle math (pure). Breath uses the MOT-0 pulse curve; the gate decides when the Play attention pulse may run.
import type { MotionBalance } from '../../core/balance';
import { pulseScale } from '../motion/curves';

/** Volume-preserving squash: scaleY follows the pulse curve (period 2*pulsePeriodMs, amplitude idleBreathAmp), scaleX is its inverse. */
export function breathScale(timeMs: number, cfg: Pick<MotionBalance, 'pulsePeriodMs' | 'idleBreathAmp'>): { sx: number; sy: number } {
  const k = pulseScale(timeMs, 2 * cfg.pulsePeriodMs, cfg.idleBreathAmp);
  return { sx: 1 / k, sy: k };
}

/** The pulse starts idleStartMs after t0 (entrance end) and pauses idlePauseMs after each interaction. */
export function createIdleGate(cfg: Pick<MotionBalance, 'idleStartMs' | 'idlePauseMs'>, t0: number): { allowed(now: number): boolean; interact(now: number): void } {
  let pausedUntil = -Infinity;
  return {
    allowed: now => now >= t0 + cfg.idleStartMs && now >= pausedUntil,
    interact: now => { pausedUntil = now + cfg.idlePauseMs; },
  };
}
