import type { SkillView } from './hudModel';

export type SkillLook = { tone: 'skillA' | 'skillB' | 'off'; locked: boolean; badgeNo: boolean };

// D3-R14 / R1: slot A purple, slot B orange, `off` when not affordable or locked (no skill in the slot).
export function skillLook(v: SkillView | null, slot: 0 | 1): SkillLook {
  if (!v) return { tone: 'off', locked: true, badgeNo: false };
  if (v.state === 'off') return { tone: 'off', locked: false, badgeNo: true };
  return { tone: slot === 0 ? 'skillA' : 'skillB', locked: false, badgeNo: false };
}

// D4-P5-R2 cost badge tone: cyan when affordable, muted gray when short; red is reserved for danger/damage.
export function badgeTone(look: SkillLook): 'ready' | 'short' {
  return look.badgeNo ? 'short' : 'ready';
}
