import type { SkillDef } from '../skills';

// MEC-006-R14/R24 Shield is active until it breaks one solid cell or times out.
export const shieldSkill: SkillDef = {
  id: 'shield', active: s => s.shield !== null, precondition: () => true,
  apply(s, b) { s.shield = { leftMs: b.skills.shield.durationMs }; },
  leftMs: s => s.shield?.leftMs ?? 0,
};
