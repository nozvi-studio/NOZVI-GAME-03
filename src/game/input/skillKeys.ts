// Pure skill key mapping and input gate (no Phaser import).
import type { FlowStatus } from '../flow/runFlow';

export type FlowPhase = FlowStatus;
const SLOT_KEYS: Readonly<Record<string, 0 | 1>> = { KeyJ: 0, KeyQ: 0, KeyK: 1, KeyE: 1 };

// MEC-007-R14 J/Q → slot 0, K/E → slot 1; MEC-007-R15 auto-repeat ignored.
export function skillSlotForKey(code: string, repeat: boolean): 0 | 1 | null {
  if (repeat) return null;
  return SLOT_KEYS[code] ?? null;
}
// MEC-007-R15 skill input is forwarded only while playing.
export const acceptSkillInput = (phase: FlowPhase): boolean => phase === 'playing';
