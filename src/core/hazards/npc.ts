import type { Cell, Dir, HazardFamily, NpcView, SimState } from '../types';
import { moverCell, moverDir, newMover, stepMover } from './blocks/mover';
import { pickWeighted } from './director';
import { solidCauseAt } from './queries';

const DIRS: readonly Dir[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
const VARIANTS = ['cat', 'chicken'] as const;
const STRAIGHT_CHANCE = 0.5;
const MIN_LEG = 2;
const npcs = (s: SimState) => s.families.npc.npcs;
const at = (c: Cell | null, x: number, y: number) => c?.x === x && c.y === y;

// MEC-015-R2 the bend counts cells on the first leg, including the starting cell.
export function routeCells(start: Cell, len: number, bend: number | null, dir: Dir, turn: Dir): Cell[] {
  const cells = [{ ...start }];
  for (let i = 1; i < len; i++) {
    const prev = cells[i - 1]!, step = bend !== null && i >= bend ? turn : dir;
    cells.push({ x: prev.x + step.x, y: prev.y + step.y });
  }
  return cells;
}

// MEC-015-R3 expose owned route/position data without mutable mover internals.
export function npcSnapshot(s: SimState): NpcView[] {
  return npcs(s).map(n => {
    const cell = moverCell(n.mover);
    return { id: n.id, variant: n.variant, path: n.mover.path.map(c => ({ ...c })),
      cell: cell && { ...cell }, state: n.mover.state, t: n.mover.t, warnMs: n.mover.warnMs };
  });
}

// MEC-015-R1..R8 telegraphed ping-pong patrols wait for body/solids and hit only the head.
export const npc: HazardFamily = {
  key: 'npc', cause: 'cat', capClass: 'small', maxActiveKey: 'npc.maxActive', breakable: true,
  spawn(s, ctx) {
    const b = ctx.balance, cfg = b.npc, st = s.families.npc;
    if (st.npcs.length >= cfg.maxActive) return null;
    // Disabled variants must never win pickWeighted's inclusive zero boundary.
    const variants = VARIANTS.filter(v => cfg.variants[v].weight > 0);
    const variant = variants[pickWeighted(variants.map(v => cfg.variants[v].weight), ctx.rng)]!;
    const tuning = cfg.variants[variant];
    for (let attempt = 0; attempt < cfg.tries; attempt++) {
      const len = ctx.rng.int(tuning.routeLen[1] - tuning.routeLen[0] + 1) + tuning.routeLen[0];
      // MEC-015-R2 an L keeps both legs at least MIN_LEG cells; a route too short for that stays straight.
      const lDraw = ctx.rng.next() >= STRAIGHT_CHANCE;
      const bend = lDraw && len >= 2 * MIN_LEG ? MIN_LEG + ctx.rng.int(len - 2 * MIN_LEG + 1) : null;
      const start = { x: ctx.rng.int(b.board.cols), y: ctx.rng.int(b.board.rows) };
      const dir = DIRS[ctx.rng.int(DIRS.length)]!, turn = DIRS[ctx.rng.int(DIRS.length)]!;
      // An L must turn perpendicularly; collinear draws retry within the same attempt budget.
      if (bend !== null && dir.x * turn.x + dir.y * turn.y !== 0) continue;
      const cells = routeCells(start, len, bend, dir, turn);
      if (!ctx.candidateValid(s, cells, { nearDist: b.fairness.nearHeadDist, wallCells: [cells[0]!] })
        || cells.some(c => solidCauseAt(s, c.x, c.y) !== null)) continue;
      st.npcs.push({ id: st.nextId++, variant,
        mover: newMover(cells, cfg.warnMs, tuning.cellMs, true, cfg.lifeMs + ctx.rng.next() * cfg.lifeRandMs) });
      return cells;
    }
    return null;
  },
  update(s, ctx) {
    for (const n of [...npcs(s)]) {
      if (s.status !== 'playing') break;
      const result = stepMover(n.mover, {
        blocked: (x, y) => solidCauseAt(s, x, y) !== null,
        bodyOn: (x, y) => s.snake.some((c, i) => i > 0 && at(c, x, y)),
        headAt: (x, y) => at(s.snake[0]!, x, y),
      }, 'wait');
      if (result === 'done') s.families.npc.npcs = npcs(s).filter(other => other !== n);
      else if (result === 'enter-head') {
        const c = moverCell(n.mover)!;
        ctx.emit({ type: 'moverHit', family: 'npc', x: c.x, y: c.y });
        ctx.hitHead('npc', c.x, c.y, 'mover', moverDir(n.mover));
      }
    }
  },
  count: s => npcs(s).length,
  causeAt: (s, x, y) => npcs(s).find(n => at(moverCell(n.mover), x, y))?.variant ?? null,
  headHit: (s, x, y) => npcs(s).some(n => at(moverCell(n.mover), x, y)) ? 'mover' : null,
  bfsWallAt: (s, x, y) => npcs(s).some(n => at(moverCell(n.mover), x, y)),
  solidAt: () => false,
  reservedAt: (s, x, y) => npcs(s).some(n => n.mover.state !== 'done' && n.mover.path.some(c => at(c, x, y))),
  onBreak(s, x, y) { s.families.npc.npcs = npcs(s).filter(n => !at(moverCell(n.mover), x, y)); },
  snapshot: npcSnapshot,
};
