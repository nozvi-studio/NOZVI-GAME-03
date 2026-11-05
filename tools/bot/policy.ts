import type { Balance } from '../../src/core/balance';
import { buildTimeline } from '../../src/core/fairness/timeline';
import { searchTimeline } from '../../src/core/fairness/escape';
import { effectiveTick } from '../../src/core/skills';
import type { Dir, SimState } from '../../src/core/types';
import { BOT } from './botConfig';

// MEC-004-R19 FB-2: one fixed tick per search, read at the start (includes flow B slowdown).
export function chooseMove(balance: Balance, state: SimState): Dir {
  const tick = effectiveTick(state, balance);
  const tl = buildTimeline(balance, state, Math.ceil(BOT.horizonMs / tick));
  const r = searchTimeline(tl, state, state.mango ?? undefined);
  return r.firstMoveToGoalSafe ?? r.firstMoveToHorizon ?? state.dir;
}
