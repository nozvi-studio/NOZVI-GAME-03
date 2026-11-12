import type { Balance, SimSnapshot, SkillId } from '../../core';
import { biomeName, levelTitle } from '../hudText';

export type T = (k: string, v?: Record<string, string | number>) => string;
export type HudSnap = Pick<SimSnapshot, 'level' | 'biome' | 'challenge' | 'progress' | 'need' | 'score' | 'energy' | 'energyMax' | 'skills' | 'rampActive' | 'rampMangoesLeft' | 'startLevel'>;
export type SkillState = 'off' | 'ready' | 'active';
export interface SkillView { slot: 0 | 1; id: SkillId; cost: number; state: SkillState; ring: number | null; charge: number }
export interface HudView {
  levelTitle: string; biomeName: string; quota: { done: string; total: string };
  score: string; energy: { text: string; fill: number };
  scoreValue: number; quotaFill: number; quotaBar: boolean; quotaLast: boolean;
  skills: readonly [SkillView | null, SkillView | null];
  chip: { kind: 'ramp' | 'checkpoint' | 'wait'; text: string; short: string } | null;
}
const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
/** Total ms of a timed skill (ring denominator); Tail Snip is instant (its wall is shown by the pill), so no ring. */
const timedMs = (id: SkillId, b: Balance): number | null =>
  id === 'slowmo' ? b.skills.slowmo.durationMs : id === 'shield' ? b.skills.shield.durationMs : id === 'mangoRain' ? b.skills.mangoRain.durationMs : null;

/** UIFIX-R3: while `wait` is set (status 'waiting') the chip shows the touch / keyboard prompt instead of ramp or checkpoint. P3b2-R7 MEC-003 §8 / MEC-006 §8 / MEC-007 §8 / MEC-008-R8, R11 (the ramp chip only for a checkpoint start, like countdownCard): everything the HUD shows, as plain data. */
export function hudView(s: HudSnap, hint: { key: string; level: number } | null, b: Balance, t: T, wait: { touch: boolean } | null = null): HudView {
  const skill = (slot: 0 | 1): SkillView | null => {
    const k = s.skills[slot];
    if (!k || k.id === null) return null;
    const total = timedMs(k.id, b);
    return { slot, id: k.id, cost: k.cost, state: k.active ? 'active' : k.affordable ? 'ready' : 'off',
      charge: k.cost > 0 ? clamp01(s.energy / k.cost) : 1, // UIFIX-R12 energy gauge fill (0..1)
      ring: k.active && total !== null ? clamp01(k.leftMs / total) : null };
  };
  const max = s.level >= b.level.maxLevel;
  return {
    levelTitle: levelTitle(s, t), biomeName: biomeName(s.biome, t),
    quota: max ? { done: t('hud.quotaMax'), total: '' } : { done: String(s.progress), total: `/${s.need}` },
    score: String(s.score), energy: { text: String(s.energy), fill: clamp01(s.energy / s.energyMax) },
    scoreValue: s.score, quotaFill: max ? 0 : clamp01(s.progress / s.need), quotaBar: !max, quotaLast: !max && s.need - s.progress === 1,
    skills: [skill(0), skill(1)],
    chip: wait ? { kind: 'wait', text: t(wait.touch ? 'hud.wait.touch' : 'hud.wait.keys'), short: '' }
      : s.rampActive && s.startLevel > 1 ? { kind: 'ramp', text: t('hud.ramp', { n: s.rampMangoesLeft }), short: t('hud.chipShort', { level: s.startLevel }) }
      : hint ? { kind: 'checkpoint', text: t(hint.key, { level: hint.level }), short: t('hud.chipShort', { level: hint.level }) } : null,
  };
}
