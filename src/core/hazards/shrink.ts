// src/core/hazards/shrink.ts — MEC-018 shrinking board: the outer ring warns, closes, then reopens.
import type { Balance } from '../balance';
import { nearHead } from '../grid';
import { placeMango } from '../mango';
import { rngFrom, type Rng } from '../rng';
import type { Cell, HazardFamily, ShrinkView, SimState } from '../types';
import { keepsMangoReachable } from './placement';

// MEC-018-R2 outer ring, row-major.
export function ringCells(cols: number, rows: number): Cell[] {
  const out: Cell[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
    if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) out.push({ x, y });
  return out;
}
const onRing = (b: Balance, x: number, y: number) => x === 0 || y === 0 || x === b.board.cols - 1 || y === b.board.rows - 1;

// MEC-018-R6/R7 clears the ring of orbs and rain mangoes and places a ring mango again, with the ring reserved.
function displaceFromRing(s: SimState, b: Balance, rng: Rng, ring: readonly Cell[]): void {
  s.orbs = s.orbs.filter(o => {
    if (!onRing(b, o.x, o.y)) return true;
    s.events.push({ type: 'orbExpired', x: o.x, y: o.y });
    return false;
  });
  s.rainMangoes = s.rainMangoes.filter(m => {
    if (!onRing(b, m.x, m.y)) return true;
    s.events.push({ type: 'rainMangoExpired', x: m.x, y: m.y });
    return false;
  });
  const m = s.mango;
  if (m && onRing(b, m.x, m.y)) {
    const from = { x: m.x, y: m.y };
    placeMango(s, b, rng, undefined, ring);
    s.events.push({ type: 'mangoDisplaced', from, to: s.mango ? { x: s.mango.x, y: s.mango.y } : null });
  }
}

// MEC-018 §7 presentation view; 'fade' is the crumble phase and leftMs counts down the current phase.
export function shrinkSnapshot(s: SimState, b: Balance): ShrinkView | null {
  const a = s.families.shrink.active;
  if (!a) return null;
  const warn = b.shrink.warnMs, closed = warn + b.shrink.closedMs, fade = closed + b.hazard.crumbleMs;
  const state = a.phase === 'crumble' ? 'fade' as const : a.phase;
  const end = a.phase === 'warn' ? warn : a.phase === 'closed' ? closed : fade;
  return { state, leftMs: Math.max(0, end - a.t), cells: a.cells.map(c => ({ x: c.x, y: c.y, on: c.closed })) };
}

export const shrink: HazardFamily = {
  key: 'shrink', cause: 'shrink', capClass: 'big', maxActiveKey: 'shrink.maxActive', breakable: false,
  // MEC-018-R1/R6/R7 start conditions live here; the director retries other options on null.
  spawn(s, ctx) {
    const b = ctx.balance, st = s.families.shrink;
    if (st.active || st.cooldownMs > 0) return null;
    if (s.families.coconut.rolls.length) return null;
    if (s.families.npc.npcs.some(n => n.mover.path.some(c => onRing(b, c.x, c.y)))) return null;
    const ring = ringCells(b.board.cols, b.board.rows);
    // TR-C4 try the displacement on a copy (own RNG copy) and commit it only if rule 3 holds with the ring walled.
    const trial = structuredClone(s);
    displaceFromRing(trial, b, rngFrom(trial.rng), ring);
    if (!keepsMangoReachable(trial, b, ring)) return null;
    s.orbs = trial.orbs; s.rainMangoes = trial.rainMangoes; s.mango = trial.mango; s.retryMs = trial.retryMs;
    s.events.push(...trial.events.slice(s.events.length)); s.rng.s = trial.rng.s;
    st.active = { t: 0, phase: 'warn', cells: ring.map(c => ({ ...c, closed: false })) };
    return ring;
  },
  // MEC-018-R3/R4/R5/R10 one shared lifecycle clock; cooldown ticks while no ring is active.
  update(s, ctx) {
    const b = ctx.balance, st = s.families.shrink, cfg = b.shrink;
    const a = st.active;
    if (!a) { if (st.cooldownMs > 0) st.cooldownMs--; return; }
    a.t++;
    if (a.phase !== 'crumble' && a.t >= cfg.warnMs + cfg.closedMs) {
      a.phase = 'crumble';
      for (const c of a.cells) c.closed = false;
    } else if (a.phase !== 'crumble' && a.t >= cfg.warnMs) {
      a.phase = 'closed';
      const h = s.snake[0]!;
      for (const c of a.cells) {
        if (!c.closed && !ctx.snakeOn(c.x, c.y)
          && !nearHead(h, s.dir, c.x, c.y, b.fairness.nearHeadDist, b.fairness.frontLaneCells)) c.closed = true;
      }
    }
    if (a.phase === 'crumble' && a.t >= cfg.warnMs + cfg.closedMs + b.hazard.crumbleMs) {
      st.active = null; st.cooldownMs = cfg.cooldownMs;
    }
  },
  count: s => (s.families.shrink.active ? 1 : 0),
  solidAt: (s, x, y) => !!s.families.shrink.active?.cells.some(c => c.closed && c.x === x && c.y === y),
  // MEC-018-R6 the ring is a BFS wall in every state while active; fixed board edge is read from the cells themselves.
  bfsWallAt: (s, x, y) => !!s.families.shrink.active?.cells.some(c => c.x === x && c.y === y),
  reservedAt: (s, x, y) => !!s.families.shrink.active?.cells.some(c => c.x === x && c.y === y),
  snapshot: s => structuredClone(s.families.shrink.active),
};
