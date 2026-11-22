import type { Balance } from '../../core';

type Cfg = Balance['juice']['skinFx'];
export interface Particle { x: number; y: number; vx: number; vy: number; born: number; life: number; size: number; kind: 'spark' | 'leaf'; rot: number }
export interface SkinFxState { cfg: Cfg; eat: boolean; trail: boolean; reduced: boolean; live: Particle[]; lastLeaf: number }

// MEC-011-R22..R25 cosmetic particles of a Rare skin, in board cells; positions are cell units, times are ms.
export function createSkinFx(cfg: Cfg, fx: { eat: boolean; trail: boolean }, reduced: boolean): SkinFxState {
  return { cfg, eat: fx.eat, trail: fx.trail, reduced, live: [], lastLeaf: Number.NEGATIVE_INFINITY };
}
// MEC-011-R22 gold sparks fly out from the mouth.
export function skinFxEat(s: SkinFxState, now: number, at: { x: number; y: number }, rnd: () => number): void {
  if (!s.eat || s.reduced) return;
  const c = s.cfg.eat;
  for (let i = 0; i < c.count; i++) {
    const a = (i + rnd()) / c.count * Math.PI * 2, v = c.spreadCells / c.lifeMs;
    s.live.push({ x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: now, life: c.lifeMs, size: c.sizeCells * (0.7 + 0.6 * rnd()), kind: 'spark', rot: a });
  }
}
// MEC-011-R23 one leaf per everyMs behind the tail while moving; the oldest leaf is dropped at the cap.
export function skinFxTrail(s: SkinFxState, now: number, tail: { x: number; y: number }, moving: boolean, rnd: () => number): void {
  if (!s.trail || s.reduced || !moving || now - s.lastLeaf < s.cfg.trail.everyMs) return;
  const c = s.cfg.trail; s.lastLeaf = now;
  const leaves = s.live.filter(p => p.kind === 'leaf');
  if (leaves.length >= c.max) s.live.splice(s.live.indexOf(leaves[0]!), 1);
  s.live.push({ x: tail.x, y: tail.y, vx: (rnd() - 0.5) * c.driftCells / c.lifeMs, vy: c.driftCells / c.lifeMs, born: now, life: c.lifeMs, size: c.sizeCells, kind: 'leaf', rot: rnd() * Math.PI });
}
// Drops dead particles; the returned array is the live list (do not keep it across frames).
export function skinFxStep(s: SkinFxState, now: number): readonly Particle[] {
  s.live = s.live.filter(p => now - p.born <= p.life);
  return s.live;
}
