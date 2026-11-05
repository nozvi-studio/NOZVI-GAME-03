import type { Balance } from '../../src/core/balance';
import { biome } from '../../src/core/level';
import { createSimInternal, stateOf } from '../../src/core/simInternal';
import type { CauseKey, SimEvent, TileKind } from '../../src/core/types';
import { BOT } from './botConfig';
import { chooseMove } from './policy';

export interface LevelResult { level: number; seed: number; outcome: 'clear' | 'death' | 'timeout'; cause?: CauseKey; context?: TileKind; biome: number }

// MEC-004-R19 headless bot: one level from startLevel; a levelUp counts as an immediate clear (flow B).
export function runLevel(balance: Balance, level: number, seed: number): LevelResult {
  const sim = createSimInternal(balance, seed, { startLevel: level }, {});
  const s = stateOf(sim), base = { level, seed, biome: biome(balance, level) };
  const scan = (events: SimEvent[]): LevelResult | null => {
    for (const e of events) {
      if (e.type === 'levelUp' || e.type === 'runWon') return { ...base, outcome: 'clear' };
      if (e.type === 'died') return { ...base, outcome: 'death', cause: e.cause, ...(e.context ? { context: e.context } : {}) };
    }
    return null;
  };
  let elapsed = 0;
  while (elapsed < BOT.timeoutMs) {
    const m = chooseMove(balance, s);
    sim.turn(m.x as -1 | 0 | 1, m.y as -1 | 0 | 1);
    const head = s.snake[0]!, hx = head.x, hy = head.y;
    do {
      sim.advance(1); elapsed++;
      const done = scan(sim.drainEvents());
      if (done) return done;
      if (s.status === 'over') return { ...base, outcome: 'death' };
    } while (s.snake[0]!.x === hx && s.snake[0]!.y === hy && elapsed < BOT.timeoutMs);
  }
  return { ...base, outcome: 'timeout' };
}
