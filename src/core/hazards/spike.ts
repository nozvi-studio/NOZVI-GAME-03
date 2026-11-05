import type { Cell, HazardFamily, SimState, SpikeView } from '../types';
import { cyclePhase, stepCycleCell, type CycleCell } from './blocks/cycleCells';
import { transform } from './shapes';

export interface SpikeGroup { id: number; t: number; lifeMs: number; cells: CycleCell[]; ending: boolean }
const NOT_SHOWN_TIME = -1; // CycleCells treats negative time as down until the display warning has elapsed.
const groups = (s: SimState) => s.families.spike.groups;
const at = (c: Cell, x: number, y: number) => c.x === x && c.y === y;

// MEC-004-R2 expose snapshot-owned presentation data, without the internal collision flag.
export function spikeSnapshot(s: SimState): SpikeView[] {
  return groups(s).map(({ id, t, lifeMs, ending, cells }) => ({ id, t, lifeMs, ending,
    cells: cells.map(({ x, y, delay, vis }) => ({ x, y, delay, vis })),
  }));
}

// MEC-014-R5..R8 spikes share the level beat, wait for display/snake safety, and leave only while down.
export const spike: HazardFamily = {
  key: 'spike', cause: 'spike', capClass: 'small', maxActiveKey: 'spike.maxActive', breakable: true,
  spawn(s, ctx) {
    const b = ctx.balance, cfg = b.spike;
    if (groups(s).length >= cfg.maxActive) return null;
    // MEC-014-R5 symmetric single/pair shapes need rotation only, with no mirror RNG draw.
    const shape = transform(cfg.shapes[ctx.rng.pick(cfg.shapePool)], ctx.rng);
    const w = Math.max(...shape.map(([x]) => x)) + 1, h = Math.max(...shape.map(([, y]) => y)) + 1;
    for (let i = 0; i < cfg.tries; i++) {
      const ox = ctx.rng.int(b.board.cols - w + 1), oy = ctx.rng.int(b.board.rows - h + 1);
      const cells = shape.map(([x, y]) => ({ x: ox + x, y: oy + y }));
      if (!ctx.candidateValid(s, cells, { nearDist: b.fairness.nearHeadDist, wallCells: [] })) continue;
      groups(s).push({ id: s.families.spike.nextId++, t: 0, lifeMs: cfg.lifeMs + ctx.rng.next() * cfg.lifeRandMs,
        ending: false, cells: cells.map(c => ({ ...c, delay: 0, up: false, vis: 'down' })),
      });
      return cells;
    }
    return null;
  },
  update(s, ctx) {
    const cfg = ctx.balance.spike, phase = cyclePhase(cfg, s.levelTimeMs);
    s.families.spike.groups = groups(s).filter(g => {
      g.t++;
      if (g.t >= g.lifeMs) g.ending = true;
      if (g.ending && phase === 'down') return false;
      for (const c of g.cells) stepCycleCell(c, cfg, g.t < cfg.showMs ? NOT_SHOWN_TIME : s.levelTimeMs, ctx.snakeOn);
      return true;
    });
  },
  solidAt: (s, x, y) => groups(s).some(g => g.cells.some(c => c.up && at(c, x, y))),
  bfsWallAt: () => false,
  reservedAt: (s, x, y) => groups(s).some(g => g.cells.some(c => at(c, x, y))),
  onBreak(s, x, y) {
    for (const g of groups(s)) g.cells = g.cells.filter(c => !(c.up && at(c, x, y)));
  },
  count: s => groups(s).length,
  snapshot: spikeSnapshot,
};
