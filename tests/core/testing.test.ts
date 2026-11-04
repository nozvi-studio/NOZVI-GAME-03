import { expect, it } from 'vitest';
import { circle, simFromAscii, SQUARE, testCtx } from '../../src/core/testing';
import { exportState, simFromState, stateOf } from '../../src/core/sim';
import { loadBalance } from '../support/balance';

const b = loadBalance();
it('P1-D6 simFromAscii builds the pictured board and exportState round-trips through JSON', () => {
  const sim = simFromAscii(b, ['M#wF', '....'], { snake: [[8, 8], [7, 8], [6, 8], [5, 8]], quiet: true });
  expect(sim.snapshot().mango).toMatchObject({ x: 0, y: 0, golden: false, ageMs: 0, totalMs: 8000 });
  expect(sim.snapshot().hazards.map(h => [h.type, h.state, h.cells[0]!.x, h.lifeMs])).toEqual([
    ['rock', 'solid', 1, 600000], ['rock', 'warn', 2, 600000], ['fence', 'solid', 3, 600000],
  ]);
  expect(stateOf(sim).spawnInMs).toBe(1e9);
  const exported = exportState(sim);
  const restored = simFromState(b, JSON.parse(JSON.stringify(exported)));
  expect(restored.snapshot()).toEqual(sim.snapshot());
  exported.snake[0]!.x = 0;
  expect(sim.snapshot().snake[0]).toEqual({ x: 8, y: 8 });
  sim.turn(0, 1); restored.turn(0, 1); sim.advance(140); restored.advance(140);
  expect(exportState(restored)).toEqual(exportState(sim));
  const input = exportState(sim), independent = simFromState(b, input);
  input.snake[0]!.x = 0;
  expect(independent.snapshot()).toEqual(sim.snapshot());
});
it('P1-D6 picture objects override the generated mango and extraState is merged last', () => {
  const sim = simFromAscii(b, ['G'], { snake: SQUARE, options: { startLevel: 12 }, extraState: { eatenInLevel: 10, score: 9 } });
  expect(sim.snapshot()).toMatchObject({ mango: { golden: true, totalMs: 4000 }, level: 12, score: 9 });
  expect(simFromAscii(b, [], { snake: SQUARE }).snapshot().mango).toBeNull();
});
it('P1-D6 legend m is a rain mango of cast 1 and u is solid rubble', () => {
  const s = exportState(simFromAscii(b, ['mu'], { snake: [[5, 5], [4, 5], [3, 5], [2, 5]] }));
  expect(s.rainMangoes).toEqual([{ x: 0, y: 0, ageMs: 0, castId: 1 }]);
  expect(s.rubble).toEqual([{ family: 'rubble', x: 1, y: 0, state: 'solid', leftMs: b.skills.shield.rubbleLifeMs }]);
  expect(() => simFromAscii(b, ['?'], { snake: SQUARE })).toThrow('simFromAscii: ? not supported yet');
});
it('P1-D6 testCtx emits events and queries the real snake', () => {
  const sim = simFromAscii(b, [], { snake: SQUARE });
  const ctx = testCtx(b, exportState(sim));
  expect(ctx.balance).toBe(b);
  expect(ctx.snakeOn(1, 1)).toBe(true);
  expect(ctx.snakeOn(8, 8)).toBe(false);
  ctx.emit({ type: 'transitionEnd', level: 2 });
  expect(ctx.events).toEqual([{ type: 'transitionEnd', level: 2 }]);
});
it('P1-D6 circle keeps a SQUARE snake alive for 60 s', () => {
  const sim = simFromAscii(b, [], { snake: SQUARE, dir: [0, 1], quiet: true });
  circle(sim, 60000);
  expect(sim.snapshot()).toMatchObject({ status: 'playing', length: 4, timeMs: 60000 });
});
