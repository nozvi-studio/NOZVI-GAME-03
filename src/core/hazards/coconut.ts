import type { Balance } from '../balance';
import type { Cell, CoconutView, HazardFamily, SimState } from '../types';
import { moverCell, moverDir, newMover, stepMover } from './blocks/mover';
import { solidCauseAt } from './queries';

interface Lane { lane: 'row' | 'col'; index: number; from: 'start' | 'end' }

// MEC-013-R1 rows precede columns; each eligible lane offers both edge directions.
export function laneCandidates(s: SimState, b: Balance): Lane[] {
  const head = s.snake[0]!, lanes: Lane[] = [];
  const front = Array.from({ length: b.fairness.frontLaneCells }, (_, i) =>
    ({ x: head.x + s.dir.x * (i + 1), y: head.y + s.dir.y * (i + 1) }));
  for (const lane of ['row', 'col'] as const) {
    const axis = lane === 'row' ? 'y' : 'x', size = lane === 'row' ? b.board.rows : b.board.cols;
    for (let index = 0; index < size; index++) {
      if (index === head[axis] || front.some(c => c[axis] === index)
        || s.families.coconut.rolls.some(r => r.mover.state !== 'done' && r.lane === lane && r.index === index)) continue;
      lanes.push({ lane, index, from: 'start' }, { lane, index, from: 'end' });
    }
  }
  return lanes;
}

function laneCells(b: Balance, l: Lane): Cell[] {
  const cells = Array.from({ length: l.lane === 'row' ? b.board.cols : b.board.rows }, (_, i) =>
    l.lane === 'row' ? { x: i, y: l.index } : { x: l.index, y: i });
  return l.from === 'start' ? cells : cells.reverse();
}

// MEC-013-R2/R3 snapshot-owned lane views also identify each roll for warning verification.
export function coconutSnapshot(s: SimState): CoconutView[] {
  return s.families.coconut.rolls.map(r => {
    const cell = moverCell(r.mover);
    return { id: r.id, path: r.mover.path.map(c => ({ ...c })), cell: cell && { ...cell },
      state: r.mover.state, t: r.mover.t, warnMs: r.mover.warnMs };
  });
}

// MEC-013-R1..R8 telegraphed, reserved lanes with head-only, one-way movers.
export const coconut: HazardFamily = {
  key: 'coconut', cause: 'coconut', capClass: 'small', maxActiveKey: 'coconut.maxActive', breakable: true,
  spawn(s, ctx) {
    const cfg = ctx.balance.coconut, st = s.families.coconut;
    if (st.rolls.length >= cfg.maxActive) return null;
    const lanes = laneCandidates(s, ctx.balance);
    // MEC-013-EC1/R7 existing food may lie on the lane; all snake/hazard reservations still apply.
    const placementState: SimState = { ...s, mango: null, orbs: [], rainMangoes: [] };
    for (let attempt = 0; attempt < cfg.tries && lanes.length; attempt++) {
      const lane = lanes.splice(ctx.rng.int(lanes.length), 1)[0]!;
      const cells = laneCells(ctx.balance, lane);
      if (!ctx.candidateValid(placementState, cells, { nearDist: 0, exemptNearHead: true, wallCells: [] })) continue;
      st.rolls.push({ id: st.nextId++, lane: lane.lane, index: lane.index,
        mover: newMover(cells, cfg.warnMs, cfg.cellMs, false, 0) });
      return cells;
    }
    return null;
  },
  update(s, ctx) {
    const st = s.families.coconut;
    for (const roll of [...st.rolls]) {
      if (s.status !== 'playing') break;
      const result = stepMover(roll.mover, {
        blocked: (x, y) => solidCauseAt(s, x, y) !== null,
        bodyOn: (x, y) => s.snake.some((c, i) => i > 0 && c.x === x && c.y === y),
        headAt: (x, y) => s.snake[0]!.x === x && s.snake[0]!.y === y,
      }, 'stop');
      if (result === 'done') st.rolls = st.rolls.filter(r => r !== roll);
      else if (result === 'enter-head') {
        const c = moverCell(roll.mover)!;
        ctx.emit({ type: 'moverHit', family: 'coconut', x: c.x, y: c.y });
        ctx.hitHead('coconut', c.x, c.y, 'mover', moverDir(roll.mover));
      }
    }
  },
  count: s => s.families.coconut.rolls.length,
  headHit: (s, x, y) => s.families.coconut.rolls.some(r => {
    const c = moverCell(r.mover); return c?.x === x && c.y === y;
  }) ? 'mover' : null,
  reservedAt: (s, x, y) => s.families.coconut.rolls.some(r => r.mover.state !== 'done'
    && r.mover.path.some(c => c.x === x && c.y === y)),
  solidAt: () => false, bfsWallAt: () => false,
  onBreak(s, x, y) {
    s.families.coconut.rolls = s.families.coconut.rolls.filter(r => {
      const c = moverCell(r.mover); return !(c?.x === x && c.y === y);
    });
  },
  snapshot: coconutSnapshot,
};
