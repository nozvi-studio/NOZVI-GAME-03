import { makeTimed, addTimedHazards } from '../../src/core/hazards/timed';
import type { SimState } from '../../src/core/types';
import { loadBalance } from './balance';
import { buildState, QUIET } from './state';

type Pair = [number, number];
const WALL_LIFE_MS = 600000;
const DEFAULT_BODY_LENGTH = 3;

// MEC-004-R2 real rock walls survive clone/restore; the P1 buildState API stays intact.
export function buildBoard(o: { head?: Pair; body?: Pair[]; dir?: Pair; level?: number; mango?: Pair | null; seed?: number; walls?: Pair[] }): SimState {
  const b = loadBalance(), dir = o.dir ?? [1, 0], head = o.head ?? b.snake.start[0]!;
  const body = o.body ?? Array.from({ length: DEFAULT_BODY_LENGTH }, (_, i): Pair => [head[0] - dir[0]! * (i + 1), head[1] - dir[1]! * (i + 1)]);
  const s = buildState(b, { seed: o.seed, level: o.level, spawnInMs: QUIET, snake: [head, ...body], dir: dir as Pair, mango: o.mango });
  if (o.walls?.length) {
    const rock = makeTimed('rock', o.walls.map(([x, y]) => ({ x, y })), b.rock.warnMs, WALL_LIFE_MS);
    rock.state = 'solid'; rock.landed = true;
    for (const cell of rock.cells) cell.on = true;
    addTimedHazards(s, rock);
  }
  return s;
}
