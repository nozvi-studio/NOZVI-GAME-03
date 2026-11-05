import { baseTickMs } from '../ramp';
import type { BombView, Cell, HazardFamily, SimState } from '../types';
import { plusArea, stepBlast, type BlastState } from './blocks/areaBlast';

export interface BombInstance { id: number; x: number; y: number; t: number; warnMs: number; landed: boolean; blast: BlastState | null }
const bombs = (s: SimState) => s.families.bomb.bombs;
const at = (c: Cell, x: number, y: number) => c.x === x && c.y === y;
const inArea = (m: BombInstance, x: number, y: number) => m.blast?.area.some(c => at(c, x, y)) ?? false;
const counting = (m: BombInstance) => m.landed && m.blast?.phase === 'count';
const active = (m: BombInstance) => m.blast?.phase === 'active';

// MEC-017 presentation view: warn (bomb cell), count (countdown + area outline), active (filled area).
export function bombSnapshot(s: SimState): BombView[] {
  return bombs(s).map(m => {
    const blast = m.blast;
    const warn = !m.landed || !blast;
    const state = warn ? 'warn' as const : blast.phase === 'count' ? 'count' as const : 'active' as const;
    const leftMs = warn ? Math.max(0, m.warnMs - m.t) : blast.phase === 'count' ? blast.countdownMs : blast.activeMs;
    return { id: m.id, x: m.x, y: m.y, state, leftMs, area: blast ? blast.area.map(c => ({ ...c })) : [] };
  });
}

// MEC-017-R1..R6 timed bomb: lands like a rock, counts down, then a plus area is lethal to the head for one base tick.
export const bomb: HazardFamily = {
  key: 'bomb', cause: 'bomb', capClass: 'small', maxActiveKey: 'bomb.maxActive', breakable: true,
  spawn(s, ctx) {
    const b = ctx.balance, cfg = b.bomb, { cols, rows } = b.board;
    if (bombs(s).length >= cfg.maxActive) return null;
    for (let i = 0; i < cfg.tries; i++) {
      const cell = { x: ctx.rng.int(cols), y: ctx.rng.int(rows) };
      // MEC-017-R1 / L2 the area is exempt from the near-head rule but must not hold reserved cells.
      const area = plusArea(cell.x, cell.y, cfg.arm, cols, rows);
      if (!ctx.candidateValid(s, [cell], { nearDist: b.fairness.nearHeadDist, wallCells: [cell], extraFree: area })) continue;
      // MEC-017-R2 the area exists from spawn so it is reserved in every state; the countdown starts on landing.
      bombs(s).push({ id: s.families.bomb.nextId++, ...cell, t: 0, warnMs: cfg.warnMs, landed: false,
        blast: { area, countdownMs: cfg.countdownMs, activeMs: baseTickMs(s, b), phase: 'count' } });
      return [cell];                                                // MEC-017-L3 the director emits hazardIncoming
    }
    return null;
  },
  update(s, ctx) {
    const b = ctx.balance;
    s.families.bomb.bombs = bombs(s).filter(m => {
      if (!m.blast) return false;
      if (!m.landed) {
        // MEC-017-R1 TimedCells rule: land at the first ms after the warning with no snake cell on the bomb.
        if (m.t < m.warnMs) m.t++;
        if (m.t < m.warnMs || ctx.snakeOn(m.x, m.y)) return true;
        m.landed = true;
        m.blast.countdownMs = b.bomb.countdownMs;
        ctx.emit({ type: 'dust', x: m.x, y: m.y });
        return true;
      }
      const blast = m.blast, step = stepBlast(blast);
      if (step === 'activated') {
        // MEC-017-R3 TR-B7 the window is one base tick measured now; Slow-mo and level-up slowdown do not stretch it.
        blast.activeMs = baseTickMs(s, b);
        ctx.emit({ type: 'bombBlast', x: m.x, y: m.y, cells: blast.area.map(c => ({ ...c })) });
        // At most one hit per blast: later entries are snake moves, which resolveHeadCell handles via headHit 'area'.
        const head = s.snake[0]!;
        if (inArea(m, head.x, head.y)) { blast.hit = true; ctx.hitHead('bomb', head.x, head.y, 'area', s.dir); }
      }
      return step !== 'done';
    });
  },
  count: s => bombs(s).length,
  solidAt: (s, x, y) => bombs(s).some(m => counting(m) && at(m, x, y)),
  bfsWallAt: (s, x, y) => bombs(s).some(m => !active(m) && at(m, x, y)),
  reservedAt: (s, x, y) => bombs(s).some(m => at(m, x, y) || inArea(m, x, y)),
  headHit: (s, x, y) => (bombs(s).some(m => active(m) && !m.blast!.hit && inArea(m, x, y)) ? 'area' : null),
  // MEC-017-R4 Shield entering the counting bomb defuses it: removed with no blast.
  onBreak(s, x, y) { s.families.bomb.bombs = bombs(s).filter(m => !(counting(m) && at(m, x, y))); },
  snapshot: bombSnapshot,
};
