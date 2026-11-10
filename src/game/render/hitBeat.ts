// MOT-4-R5 hit beat: one scale snap on the warn -> live snapshot edge, played through motion.snap (kill-by-target, budget, reduced motion).
import type { SimSnapshot } from '../../core';
import type { MotionBalance } from '../../core/balance';
import type { Motion, MotionTarget } from '../motion/motionCore';
import { bombDigit } from './blasts';
import { cellKey, hazardKey } from './telegraph';

export type BeatKind = 'hit' | 'digit';
export interface BeatEdge { key: string; kind: BeatKind }

/** MOT-4-R5 pure snapshot diff: which hazards just went from warning to live, and which bomb digits just changed. Reads snapshots only. */
export function telegraphEdges(prev: SimSnapshot | null, next: SimSnapshot): BeatEdge[] {
  const out: BeatEdge[] = [];
  if (!prev) return out;
  const was = new Map<string, string>();
  for (const h of prev.hazards) was.set(hazardKey(h), h.state);
  for (const h of next.hazards) if (h.state === 'solid' && was.get(hazardKey(h)) === 'warn') out.push({ key: hazardKey(h), kind: 'hit' });
  const cycles = (prefix: 'g' | 's', a: readonly { id: number; cells: readonly { x: number; y: number; vis: string }[] }[], b: typeof a): void => {
    const before = new Map<string, string>();
    for (const g of a) for (const c of g.cells) before.set(cellKey(prefix, g.id, c.x, c.y), c.vis);
    for (const g of b) for (const c of g.cells) { const k = cellKey(prefix, g.id, c.x, c.y); if (c.vis === 'up' && before.get(k) === 'warn') out.push({ key: k, kind: 'hit' }); }
  };
  const gates = (s: SimSnapshot) => s.families.gate.map(g => ({ id: g.id, cells: g.gate }));
  cycles('g', gates(prev), gates(next));
  cycles('s', prev.families.spike, next.families.spike);
  const bombs = new Map(prev.families.bomb.map(b => [b.id, b]));
  for (const b of next.families.bomb) {
    const was2 = bombs.get(b.id);
    if (!was2) continue;
    if (was2.state === 'warn' && b.state !== 'warn') out.push({ key: `b:${b.id}`, kind: 'hit' });
    else if (was2.state === 'count' && b.state === 'count' && bombDigit(was2.leftMs) !== bombDigit(b.leftMs)) out.push({ key: `bd:${b.id}`, kind: 'digit' });
  }
  if (prev.families.shrink?.state === 'warn' && next.families.shrink?.state === 'closed') out.push({ key: 'r', kind: 'hit' });
  return out;
}

const proxy = (): MotionTarget => {
  const t: MotionTarget = { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1,
    setScale(x, y = x) { t.scaleX = x; t.scaleY = y; return t; }, setAlpha(a) { t.alpha = a; return t; }, setPosition(x, y = x) { t.x = x; t.y = y; return t; } };
  return t;
};

/** Live beats by key. Draw code reads `scale(key)` (1 when idle). Each beat is one MotionTarget proxy driven by motion.snap. */
export class HitBeats {
  private readonly live = new Map<string, MotionTarget>();
  constructor(private readonly motion: Pick<Motion, 'snap'>,
    private readonly cfg: Pick<MotionBalance, 'telegraphSnapScale' | 'telegraphSnapMs' | 'digitPopScale' | 'digitPopMs'>) {}
  play(edges: readonly BeatEdge[]): void {
    for (const e of edges) {
      const t = this.live.get(e.key) ?? proxy();
      this.live.set(e.key, t);
      const digit = e.kind === 'digit';
      this.motion.snap(t, digit ? this.cfg.digitPopScale : this.cfg.telegraphSnapScale, digit ? this.cfg.digitPopMs : this.cfg.telegraphSnapMs,
        () => { if (this.live.get(e.key) === t) this.live.delete(e.key); });
    }
  }
  scale(key: string): number { return this.live.get(key)?.scaleX ?? 1; }
  clear(): void { this.live.clear(); }
}
