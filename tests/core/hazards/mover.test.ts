import { expect, it } from 'vitest';
import { moverCell, moverDir, newMover, stepMover, type MoverEnv } from '../../../src/core/hazards/blocks/mover';

const path = [0, 1, 2, 3].map(x => ({ x, y: 5 }));
const free: MoverEnv = { blocked: () => false, bodyOn: () => false, headAt: () => false };

it.each([0, 1])('MEC-004-R5 newMover rejects a path with %i cells', length => {
  expect(() => newMover(path.slice(0, length), 1500, 90, false, 0)).toThrow(/at least two cells/);
});
const run = (m: ReturnType<typeof newMover>, ms: number, env: MoverEnv = free, mode: 'wait' | 'stop' = 'stop') => {
  let result: ReturnType<typeof stepMover> = 'keep';
  for (let i = 0; i < ms && result === 'keep'; i++) result = stepMover(m, env, mode);
  return result;
};

it('MEC-004-R5 mover warns for warnMs before the first cell', () => {
  const m = newMover(path, 1500, 90, false, 0);
  run(m, 1499); expect(moverCell(m)).toBeNull(); expect(m.pos).toBe(-1);
  run(m, 1); expect(moverCell(m)).toEqual({ x: 0, y: 5 });
});

it('MEC-004-R5 mover advances one cell per cellMs and ends after the last cell', () => {
  const m = newMover(path, 1500, 90, false, 0);
  run(m, 1500); run(m, 89); expect(moverCell(m)).toEqual({ x: 0, y: 5 });
  run(m, 1); expect(moverCell(m)).toEqual({ x: 1, y: 5 });
  run(m, 180); expect(moverCell(m)).toEqual({ x: 3, y: 5 });
  expect(run(m, 89)).toBe('keep');
  expect(run(m, 1)).toBe('done'); expect(moverCell(m)).toBeNull();
  expect(stepMover(m, free, 'stop')).toBe('done');
});

it.each(['blocked', 'bodyOn'] as const)('MEC-004-R5 stop mode ends on a %s cell, wait mode waits for it', query => {
  let occupied = true;
  const env = { ...free, [query]: (x: number, y: number) => occupied && x === 2 && y === 5 };
  const a = newMover(path, 1500, 90, false, 0);
  expect(run(a, 5000, env, 'stop')).toBe('done'); expect(a.pos).toBe(1);
  const b = newMover(path, 1500, 90, false, 0);
  expect(run(b, 5000, env, 'wait')).toBe('keep');
  expect(moverCell(b)).toEqual({ x: 1, y: 5 }); expect(b.t).toBe(90);
  occupied = false;
  run(b, 1, env, 'wait'); expect(moverCell(b)).toEqual({ x: 2, y: 5 });
  run(b, 89, env, 'wait'); expect(moverCell(b)).toEqual({ x: 2, y: 5 });
  run(b, 1, env, 'wait'); expect(moverCell(b)).toEqual({ x: 3, y: 5 });
});

it.each(['blocked', 'bodyOn'] as const)('MEC-004-R5 entering cell zero checks %s before moving or reporting a head hit', query => {
  let occupied = true;
  const env = { ...free, [query]: () => occupied, headAt: () => true };
  const a = newMover(path, 1500, 90, false, 0);
  expect(run(a, 1500, env)).toBe('done'); expect(a.pos).toBe(-1);
  const b = newMover(path, 1500, 90, true, 1000);
  expect(run(b, 5000, env, 'wait')).toBe('keep');
  expect(moverCell(b)).toBeNull(); expect(b.lifeMs).toBe(1000);
  occupied = false;
  expect(run(b, 1, env, 'wait')).toBe('enter-head');
  expect(moverCell(b)).toEqual({ x: 0, y: 5 }); expect(b.lifeMs).toBe(1000);
});

it.each([0, 1])('MEC-004-R8 entering the head cell reports enter-head at index %i', index => {
  const head = { ...free, headAt: (x: number, y: number) => x === index && y === 5 };
  const m = newMover(path, 1500, 90, false, 0);
  expect(run(m, 5000, head)).toBe('enter-head');
  expect(moverCell(m)).toEqual({ x: index, y: 5 });
  expect(run(m, 1, head)).toBe('keep');
});

it('MEC-015-R4 ping-pong reverses at the ends', () => {
  const m = newMover(path, 1500, 100, true, 1000);
  run(m, 1800); expect(moverCell(m)).toEqual({ x: 3, y: 5 });
  run(m, 100); expect(moverCell(m)).toEqual({ x: 2, y: 5 }); expect(m.dirSign).toBe(-1);
  run(m, 200); expect(moverCell(m)).toEqual({ x: 0, y: 5 });
  run(m, 100); expect(moverCell(m)).toEqual({ x: 1, y: 5 }); expect(m.dirSign).toBe(1);
});

it('MEC-015-R6 NPC leaves at a route end after its life', () => {
  const m = newMover(path, 1500, 100, true, 1000);
  run(m, 1500); expect(m.lifeMs).toBe(1000);
  expect(run(m, 999)).toBe('keep'); expect(moverCell(m)).toEqual({ x: 3, y: 5 });
  expect(run(m, 1)).toBe('done'); expect(m.state).toBe('done');
  expect(m.path[m.pos]).toEqual({ x: 3, y: 5 }); expect(moverCell(m)).toBeNull();
});

it('MEC-015-R6 waiting consumes life once per cellMs and expiry mid-route waits for an end', () => {
  const m = newMover(path, 1500, 100, true, 1000);
  const body = { ...free, bodyOn: (x: number) => x === 2 };
  run(m, 1700, body, 'wait'); expect(m.lifeMs).toBe(800);
  run(m, 1, body, 'wait'); expect(m.lifeMs).toBe(800);
  expect(run(m, 799, body, 'wait')).toBe('keep'); expect(m.lifeMs).toBe(0);
  expect(moverCell(m)).toEqual({ x: 1, y: 5 });
  run(m, 1, free, 'wait'); expect(moverCell(m)).toEqual({ x: 2, y: 5 });
  run(m, 100, free, 'wait'); expect(moverCell(m)).toEqual({ x: 3, y: 5 });
  expect(run(m, 100, free, 'wait')).toBe('done');
});

it('MEC-015-R6 a mover waiting at an end leaves when its life expires', () => {
  const m = newMover(path, 1500, 100, true, 1000);
  const body = { ...free, bodyOn: (x: number) => x === 1 };
  expect(run(m, 2499, body, 'wait')).toBe('keep'); expect(moverCell(m)).toEqual({ x: 0, y: 5 });
  expect(run(m, 1, body, 'wait')).toBe('done');
});

it('MEC-004-R5 zero life runs until the path end even when ping-pong was requested', () => {
  const m = newMover(path, 1500, 100, true, 0);
  expect(run(m, 1800)).toBe('keep'); expect(moverCell(m)).toEqual({ x: 3, y: 5 });
  expect(run(m, 100)).toBe('done');
});

it('MEC-004-R5 moverDir points along the path', () => {
  const m = newMover(path, 1500, 100, true, 1000);
  expect(moverDir(m)).toEqual({ x: 1, y: 0 });
  run(m, 1500); expect(moverDir(m)).toEqual({ x: 1, y: 0 });
  run(m, 300); expect(moverDir(m)).toEqual({ x: 1, y: 0 });
  run(m, 100); expect(moverDir(m)).toEqual({ x: -1, y: 0 });
  run(m, 200); expect(moverDir(m)).toEqual({ x: -1, y: 0 });
  run(m, 100); expect(moverDir(m)).toEqual({ x: 1, y: 0 });
});

it('MEC-004-R5 moverDir follows bends and retains the last direction at the path end', () => {
  const route = [{ x: 2, y: 2 }, { x: 2, y: 1 }, { x: 1, y: 1 }];
  const m = newMover(route, 1500, 100, false, 0);
  run(m, 1500); expect(moverDir(m)).toEqual({ x: 0, y: -1 });
  run(m, 100); expect(moverDir(m)).toEqual({ x: -1, y: 0 });
  run(m, 100); expect(moverDir(m)).toEqual({ x: -1, y: 0 });
  run(m, 100); expect(moverDir(m)).toEqual({ x: -1, y: 0 });
  expect(route).toEqual([{ x: 2, y: 2 }, { x: 2, y: 1 }, { x: 1, y: 1 }]);
});

it('MEC-004-R5 mover owns a detached path', () => {
  const route = [{ x: 2, y: 2 }, { x: 2, y: 3 }];
  const m = newMover(route, 1500, 100, false, 0);
  route[0]!.x = 9; route.push({ x: 2, y: 4 });
  run(m, 1500); expect(moverCell(m)).toEqual({ x: 2, y: 2 });
  expect(run(m, 200)).toBe('done'); expect(m.pos).toBe(1);
});
