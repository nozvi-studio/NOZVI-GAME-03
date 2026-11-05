import type { Pair } from '../balance';
import type { Cell, HazardFamily, SimState, TimedCell } from '../types';
import { stepCycleCell, type CycleCell } from './blocks/cycleCells';
import { transform } from './shapes';

export interface GateInstance {
  id: number; t: number; lifeMs: number; fence: TimedCell[]; gate: CycleCell[]; state: 'warn' | 'live' | 'crumble';
}
const MAX_GATE_CELLS = 2;
const at = (c: Cell, x: number, y: number) => c.x === x && c.y === y;
const gates = (s: SimState) => s.families.gate.gates;

// MEC-014-R1..R4 a gate owns permanent fence walls and timed, passable BFS gaps.
export const gate: HazardFamily = {
  key: 'gate', cause: 'gate', capClass: 'small', maxActiveKey: 'gate.maxActive', breakable: true,
  spawn(s, ctx) {
    const b = ctx.balance, g = b.gate;
    if (gates(s).length >= g.maxActive) return null;
    const kind = ctx.rng.pick(g.shapePool), count = 1 + ctx.rng.int(MAX_GATE_CELLS);
    const raw: Pair[] = kind === 'line'
      ? Array.from({ length: g.lineLen[0] + ctx.rng.int(g.lineLen[1] - g.lineLen[0] + 1) }, (_, x) => [x, 0])
      : b.fence.shapes.U;
    const firstMiddle = Math.floor((raw.length - count) / 2);
    const gateIndices = new Set(kind === 'line'
      ? Array.from({ length: count }, (_, i) => firstMiddle + i)
      : count === MAX_GATE_CELLS ? [0, raw.length - 1] : [ctx.rng.int(MAX_GATE_CELLS) === 0 ? 0 : raw.length - 1]);
    // P0 transform preserves cell ordering, including the tagged middle/mouth cells.
    const shape = transform(raw, ctx.rng, b.fence.mirrorChance);
    const w = Math.max(...shape.map(p => p[0])) + 1, h = Math.max(...shape.map(p => p[1])) + 1;
    for (let i = 0; i < g.tries; i++) {
      const ox = ctx.rng.int(b.board.cols - w + 1), oy = ctx.rng.int(b.board.rows - h + 1);
      const cells = shape.map(([x, y]) => ({ x: ox + x, y: oy + y }));
      const fenceCells = cells.filter((_, index) => !gateIndices.has(index));
      if (!cells.every(c => ctx.cellFree(c.x, c.y)) ||
        !ctx.candidateValid(s, cells, { nearDist: b.fairness.nearHeadDist, wallCells: fenceCells })) continue;
      gates(s).push({ id: s.families.gate.nextId++, t: 0, lifeMs: g.lifeMs + ctx.rng.next() * g.lifeRandMs, state: 'warn',
        fence: fenceCells.map(c => ({ ...c, on: false, ageMs: 0 })),
        gate: cells.filter((_, index) => gateIndices.has(index)).map(c => ({ ...c, delay: 0, up: false, vis: 'down' })),
      });
      return cells;
    }
    return null;
  },
  update(s, ctx) {
    const b = ctx.balance, g = b.gate;
    const phases = { downMs: g.openMs, warnMs: g.warnMs, upMs: g.closedMs };
    s.families.gate.gates = gates(s).filter(instance => {
      instance.t++;
      const liveTime = instance.t - g.landWarnMs;
      if (liveTime >= instance.lifeMs) {
        instance.state = 'crumble';
        for (const c of instance.fence) c.on = false;
        for (const c of instance.gate) { c.up = false; c.vis = 'down'; }
      } else if (liveTime >= 0) {
        instance.state = 'live';
        for (const c of instance.fence) {
          if (!c.on && !ctx.snakeOn(c.x, c.y)) c.on = true;
          if (c.on) c.ageMs++;
        }
        for (const c of instance.gate) stepCycleCell(c, phases, liveTime - c.delay, ctx.snakeOn);
      }
      return liveTime < instance.lifeMs + b.hazard.crumbleMs;
    });
  },
  solidAt: (s, x, y) => gates(s).some(g => g.fence.some(c => c.on && at(c, x, y)) || g.gate.some(c => c.up && at(c, x, y))),
  causeAt: (s, x, y) => gates(s).some(g => g.fence.some(c => c.on && at(c, x, y))) ? 'fence'
    : gates(s).some(g => g.gate.some(c => c.up && at(c, x, y))) ? 'gate' : null,
  bfsWallAt: (s, x, y) => gates(s).some(g => g.fence.some(c => at(c, x, y))),
  reservedAt: (s, x, y) => gates(s).some(g => g.fence.some(c => at(c, x, y)) || g.gate.some(c => at(c, x, y))),
  onBreak(s, x, y) {
    // MEC-014-R8 removing the cell prevents every subsequent cycle from restoring it.
    for (const g of gates(s)) {
      g.fence = g.fence.filter(c => !(c.on && at(c, x, y)));
      g.gate = g.gate.filter(c => !(c.up && at(c, x, y)));
    }
  },
  count: s => gates(s).length,
  snapshot: s => structuredClone(gates(s)),
};
