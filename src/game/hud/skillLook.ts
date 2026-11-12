import type { SkillView } from './hudModel';

// D3-R14 / R1: slot A purple, slot B orange, `off` when not affordable (badge in danger colour) or locked (no skill in the slot).
export function skillLook(v: SkillView | null, slot: 0 | 1): { tone: 'skillA' | 'skillB' | 'off'; locked: boolean; badgeNo: boolean } {
  if (!v) return { tone: 'off', locked: true, badgeNo: false };
  if (v.state === 'off') return { tone: 'off', locked: false, badgeNo: true };
  return { tone: slot === 0 ? 'skillA' : 'skillB', locked: false, badgeNo: false };
}
