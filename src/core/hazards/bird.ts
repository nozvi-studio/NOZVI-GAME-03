import type { Balance } from '../balance';
import { cellBfsWall } from '../cells';
import { pathCost } from '../grid';
import { placeMango } from '../mango';
import { baseTickMs } from '../ramp';
import { rngFrom } from '../rng';
import type { BirdView, HazardFamily, SimState } from '../types';
import { scaleTick } from './blocks/groundTiles';
import { tileAt } from './queries';

const NO_SLOW = 1;

// MEC-016-R1 a regular, untargeted mango the head can reach before the shadow ends, with rot time to spare.
// L3: each step costs the base tick, scaled by the mud factor when it leaves a mud cell; slow effects are ignored.
export function birdCanTarget(s: SimState, b: Balance): boolean {
  const m = s.mango;
  if (!m || m.golden || s.families.bird.target || m.leftMs <= b.bird.shadowMs) return false;
  const base = baseTickMs(s, b);
  const cost = pathCost(b.board.cols, b.board.rows, s.snake[0]!, m, (x, y) => cellBfsWall(s, x, y),
    (x, y) => scaleTick(base, NO_SLOW, tileAt(s, x, y) === 'mud' ? b.mud.tickFactor : 1));
  return cost !== null && cost + b.bird.marginMs <= b.bird.shadowMs;
}

// MEC-016 presentation copy of the shadow.
export function birdSnapshot(s: SimState, b: Balance): BirdView | null {
  const t = s.families.bird.target;
  return t && { x: t.x, y: t.y, leftMs: t.leftMs, shadowMs: b.bird.shadowMs };
}

// MEC-016-R1..R7 never-lethal modifier: a shadow on the mango; an uneaten mango is stolen and replaced.
export const bird: HazardFamily = {
  key: 'bird', cause: null, capClass: 'modifier', maxActiveKey: 'bird.maxActive', breakable: false,
  spawn(s, ctx) {
    if (!birdCanTarget(s, ctx.balance)) return null;            // TR-B6 the director tries another option
    const m = s.mango!;
    s.families.bird.target = { x: m.x, y: m.y, leftMs: ctx.balance.bird.shadowMs };
    return [{ x: m.x, y: m.y }];                                // MEC-016-L2 the director emits hazardIncoming
  },
  update(s, ctx) {
    const t = s.families.bird.target;
    if (!t) return;
    // MEC-016-R4 eaten, rotted or replaced: leave silently.
    if (!s.mango || s.mango.x !== t.x || s.mango.y !== t.y) { s.families.bird.target = null; return; }
    if (--t.leftMs > 0) return;
    // MEC-016-R3 steal: fresh mango elsewhere, no rock, counters untouched; a full board defers (MEC-003-R13).
    s.families.bird.target = null;
    ctx.emit({ type: 'mangoStolen', x: t.x, y: t.y });
    placeMango(s, ctx.balance, rngFrom(s.rng), { x: t.x, y: t.y });
  },
  count: s => (s.families.bird.target ? 1 : 0),
  solidAt: () => false,
  bfsWallAt: () => false,
  reservedAt: () => false,
  snapshot: s => s.families.bird.target && { ...s.families.bird.target },
};
