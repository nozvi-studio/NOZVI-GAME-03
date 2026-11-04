import type { SkillDef } from '../skills';

// MEC-006-R14/R19 Slow-mo changes only effective snake speed for its sim-time duration.
export const slowmoSkill: SkillDef = {
  id: 'slowmo', active: s => s.slowmo !== null, precondition: () => true,
  apply(s, b) { s.slowmo = { leftMs: b.skills.slowmo.durationMs }; },
  leftMs: s => s.slowmo?.leftMs ?? 0,
};
