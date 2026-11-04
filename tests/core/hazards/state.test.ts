import { expect, it } from 'vitest';
import { initialState, restoreSim, exportState } from '../../../src/core/sim';
import { loadBalance } from '../../support/balance';
import { ROCK } from '../../../src/core/hazards/rock';
import { makeTimed, addTimedHazards } from '../../../src/core/hazards/timed';
import { testCtx } from '../../../src/core/testing';
import { buildBoard } from '../../support/board';
import { hitCtx } from '../../support/fakeFamily';

it('MEC-004-R2 family state is plain data and survives clone and restore', () => {
  const b = loadBalance(), s = initialState(b, 1);
  expect(Object.keys(s.families)).toEqual(['rock', 'fence', 'maze', 'terrain', 'rottenRock', 'snipWall', 'rubble']);
  expect(s).not.toHaveProperty('hazards');
  expect(s).not.toHaveProperty('terrains');
  expect(exportState(restoreSim(b, s).clone())).toEqual(s);
});

it('MEC-004-R2 spawn returns cells, counts every phase and snapshots without aliasing state', () => {
  const s = buildBoard({}), ctx = hitCtx(s);
  const cells = ROCK.spawn(s, ctx);
  expect(cells).not.toBeNull();
  expect(cells).toEqual(s.families.rock[0]!.cells.map(({ x, y }) => ({ x, y })));
  expect(ROCK.count!(s)).toBe(1);
  const copy = ROCK.snapshot(s);
  s.families.rock[0]!.state = 'crumble';
  expect(ROCK.count!(s)).toBe(1);
  expect(copy).toMatchObject([{ state: 'warn' }]);
  const before = structuredClone(s.families);
  expect(ROCK.spawn(s, { ...ctx, cellFree: () => false })).toBeNull();
  expect(s.families).toEqual(before);
});

it('MEC-004-R2 interleaved timed events and snapshot order survive a JSON restore', () => {
  const b = loadBalance(), s = buildBoard({});
  addTimedHazards(s, makeTimed('fence', [{ x: 1, y: 1 }], 1, 1000), makeTimed('rock', [{ x: 2, y: 1 }], 1, 1000), makeTimed('maze', [{ x: 3, y: 1 }], 1, 1000));
  const sim = restoreSim(b, JSON.parse(JSON.stringify(s)));
  expect(sim.snapshot().hazards.map(h => h.type)).toEqual(['fence', 'rock', 'maze']);
  sim.advance(1);
  expect(sim.drainEvents()).toEqual([
    { type: 'dust', x: 1, y: 1 }, { type: 'landed', hazardType: 'fence' },
    { type: 'dust', x: 2, y: 1 }, { type: 'landed', hazardType: 'rock' },
    { type: 'dust', x: 3, y: 1 }, { type: 'landed', hazardType: 'maze' },
  ]);
});

it('MEC-004-R2 buildBoard walls are one real solid rock instance through clone and restore', () => {
  const b = loadBalance(), s = buildBoard({ walls: [[4, 4], [4, 5]] });
  const restored = exportState(restoreSim(b, s).clone());
  expect(restored.families.rock).toHaveLength(1);
  expect(restored.families.rock[0]).toMatchObject({ state: 'solid', lifeMs: 600000 });
  expect(ROCK.solidAt(restored, 4, 4)).toBe(true);
  expect(ROCK.solidAt(restored, 4, 5)).toBe(true);
  const ctx = testCtx(b, restored);
  ROCK.update(restored, { ...ctx, hitHead: () => {} });
  expect(ROCK.solidAt(restored, 4, 4)).toBe(true);
});
