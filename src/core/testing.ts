// P1-D6 test-only ASCII fixtures; intentionally absent from the public core index.
import type { Balance } from './balance';
import { snakeOn } from './cells';
import { makeTimed } from './hazards/timed';
import { createSim, exportState, simFromState } from './sim';
import type { Dir, Sim, SimEvent, SimOptions, SimState, StepCtx } from './types';

export interface AsciiOpts {
  snake: [number, number][];
  dir?: [number, number];
  seed?: number;
  options?: SimOptions;
  extraState?: Partial<SimState>;
  quiet?: boolean;
}

// P1-D6 rows cover the top-left board region; explicit state overrides the picture last.
export function simFromAscii(b: Balance, rows: string[], o: AsciiOpts): Sim {
  const s = exportState(createSim(b, o.seed ?? 1, o.options));
  s.snake = o.snake.map(([x, y]) => ({ x, y }));
  const [x, y] = o.dir ?? [1, 0];
  s.dir = { x, y } as Dir;
  s.headFrom = { ...s.snake[0]! };
  s.tailFrom = { ...s.snake[s.snake.length - 1]! };
  s.hazards = []; s.terrains = []; s.rottenRocks = []; s.mango = null;
  if (o.quiet) s.spawnInMs = 1e9; // P0 timer counts down (plan's -1e9 is for an elapsed timer).
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y]!.length; x++) {
    const c = rows[y]![x]!;
    if (c === '.') continue;
    if (c === 'M' || c === 'G') {
      const golden = c === 'G';
      const totalMs = Math.floor(Math.max(b.mango.rotMinMs, b.mango.rotBaseMs - b.mango.rotPerEatenMs * s.eatenInLevel) * (golden ? b.mango.goldenRotFactor : 1));
      s.mango = { x, y, golden, totalMs, leftMs: totalMs };
    } else if (c === 'o') {
      s.orbs.push({ x, y, ageMs: 0 });
    } else if (c === 'R') {
      s.rottenRocks.push({ family: 'rottenRock', x, y, state: 'solid', leftMs: b.mango.rottenRockLifeMs });
    } else if (c === '#' || c === 'w' || c === 'F') {
      const h = makeTimed(c === 'F' ? 'fence' : 'rock', [{ x, y }], c === 'F' ? b.fence.warnMs : b.rock.warnMs, 600000);
      if (c !== 'w') { h.state = 'solid'; h.landed = true; h.cells[0]!.on = true; }
      s.hazards.push(h);
    } else throw new Error(`simFromAscii: ${c} not supported yet`);
  }
  Object.assign(s, o.extraState);
  return simFromState(b, s);
}

export const SQUARE: [number, number][] = [[1, 1], [1, 0], [0, 0], [0, 1]];

// P1-D6 queue one left turn at a time, comparing the queued heading with current dir.
export function circle(sim: Sim, ms: number): void {
  for (let i = 0; i < ms; i++) {
    const { heading, dir } = sim.snapshot();
    if (heading.x === dir.x && heading.y === dir.y) sim.turn(-dir.y as Dir['x'], dir.x);
    sim.advance(1);
  }
}

// P1-D6 transient context for testing family updates and internal transitions.
export function testCtx(b: Balance, s: SimState): StepCtx & { events: SimEvent[] } {
  const events: SimEvent[] = [];
  return { balance: b, snakeOn: (x, y) => snakeOn(s, x, y), emit: e => { events.push(e); }, events };
}
