import type { Balance } from '../balance';
import { key } from '../grid';
import { headHitAt, solidCauseAt, tileAt } from '../hazards/queries';
import { restoreSim } from '../sim';
import { stateOf } from '../simInternal';
import { effectiveTick } from '../skills';
import type { SimState } from '../types';

export interface Timeline { cols: number; rows: number; tickMs: number; steps: number; lethal: Set<number>[]; ice: Set<number>[] }

// MEC-004-R18 step 2 / FB-2: freeze only movement; ease slowdown at a fixed initial sampling tick.
export function buildTimeline(balance: Balance, state: SimState, steps: number): Timeline {
  // MEC-012-R6 lead ruling: timeline sampling intentionally uses the initial head tile.
  const tickMs = effectiveTick(state, balance);
  const sim = restoreSim(balance, state, { directorEnabled: false, freezeSnake: true, ignoreOutcomes: true });
  const s = stateOf(sim), { cols, rows } = balance.board;
  const tl: Timeline = { cols, rows, tickMs, steps, lethal: [], ice: [] };
  for (let k = 0; k <= steps; k++) {
    if (k > 0) sim.advance(tickMs);
    const lethal = new Set<number>(), ice = new Set<number>();
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const cell = key(cols, x, y);
      if (solidCauseAt(s, x, y) !== null || headHitAt(s, x, y) !== null) lethal.add(cell);
      if (tileAt(s, x, y) === 'ice') ice.add(cell);
    }
    tl.lethal.push(lethal); tl.ice.push(ice);
  }
  return tl;
}
