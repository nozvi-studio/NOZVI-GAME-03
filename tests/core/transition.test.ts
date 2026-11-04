import { describe, it, expect } from 'vitest';
import { simFromAscii, circle } from '../../src/core/testing';
import { exportState, stateOf } from '../../src/core/sim';
import { cellSolidCause } from '../../src/core/cells';
import type { SimState } from '../../src/core/types';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const types = (sim: { drainEvents(): { type: string }[] }) => sim.drainEvents().map(e => e.type);
const levelUpSim = (extra: Partial<SimState> = {}) => simFromAscii(b, ['.....M'], {
  snake: [[4, 0], [3, 0], [2, 0], [1, 0], [0, 0]], quiet: true,
  extraState: { progress: 3, ...extra },
});

describe('MEC-003 transition', () => {
  it('MEC-003-R7 transition lasts 1000 ms and first snake step is at 1000 + tick', () => {
    const sim = levelUpSim();
    sim.advance(140);
    expect(types(sim)).toEqual(['ate', 'shrunk', 'levelUp']);
    expect(sim.snapshot()).toMatchObject({ phase: 'transition', level: 2, progress: 0, length: 4 });
    sim.advance(999);
    expect(sim.snapshot().phase).toBe('transition');
    sim.advance(1);
    expect(types(sim)).toEqual(['transitionEnd']);
    sim.advance(137);
    expect(sim.snapshot().snake[0]).toEqual({ x: 5, y: 0 });
    sim.advance(1);
    expect(sim.snapshot().snake[0]).toEqual({ x: 6, y: 0 });
  });

  it('MEC-001-R4 length 9 before level up becomes 4 after', () => {
    const sim = simFromAscii(b, ['.........M'], {
      snake: [[8, 0], [7, 0], [6, 0], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0]],
      quiet: true, extraState: { progress: 3 },
    });
    sim.advance(140);
    expect(sim.drainEvents().find(e => e.type === 'shrunk')).toMatchObject({ from: 9, to: 4 });
    expect(sim.snapshot().snake).toEqual([{ x: 9, y: 0 }, { x: 8, y: 0 }, { x: 7, y: 0 }, { x: 6, y: 0 }]);
    expect(sim.snapshot().dir).toEqual({ x: 1, y: 0 });
  });

  it('MEC-003-R6 clearing L30 ends the run with won true and emits runWon without levelUp', () => {
    const sim = levelUpSim({ level: 30, progress: 12 });
    sim.advance(140);
    expect(types(sim)).toEqual(['ate', 'runWon']);
    expect(sim.snapshot()).toMatchObject({ status: 'over', outcome: { won: true }, levelsCleared: 30, length: 6, score: 1, timeMs: 82, mango: null });
    const frozen = sim.snapshot();
    sim.advance(5000);
    expect(sim.snapshot()).toEqual(frozen);
    expect(types(sim)).toEqual([]);
  });

  it('MEC-001-R4 level up keeps head and 3 following cells and direction', () => {
    const sim = simFromAscii(b, ['.....M'], {
      snake: [[5, 1], [4, 1], [3, 1], [3, 2], [3, 3], [3, 4]], quiet: true,
      extraState: { progress: 3 },
    });
    sim.turn(0, -1); sim.turn(1, 0);
    sim.advance(140);
    expect(sim.snapshot().snake).toEqual([{ x: 5, y: 0 }, { x: 5, y: 1 }, { x: 4, y: 1 }, { x: 3, y: 1 }]);
    expect(sim.snapshot().dir).toEqual({ x: 0, y: -1 });
    expect(stateOf(sim).queue).toEqual([{ x: 1, y: 0 }]);
  });

  it('MEC-001-R5 next mango may be placed on a cell freed by the reset', () => {
    const sim = simFromAscii(b, ['................M', ...Array<string>(16).fill('#'.repeat(17))], {
      snake: Array.from({ length: 16 }, (_, i) => [15 - i, 0] as [number, number]),
      quiet: true, extraState: { progress: 3 },
    });
    sim.advance(140);
    expect(sim.snapshot().mango).toMatchObject({ y: 0 });
    expect(sim.snapshot().mango!.x).toBeGreaterThanOrEqual(0);
    expect(sim.snapshot().mango!.x).toBeLessThanOrEqual(12);
    expect(sim.snapshot().hazards.every(h => h.state === 'crumble')).toBe(true);
  });

  it('MEC-001-R8 snake at length 3 grows and resets to 4 on next level up', () => {
    const sim = simFromAscii(b, ['.....M'], { snake: [[4, 0], [3, 0], [2, 0]], quiet: true, extraState: { progress: 3 } });
    sim.advance(140);
    expect(sim.drainEvents().find(e => e.type === 'shrunk')).toEqual({ type: 'shrunk', from: 4, to: 4, removed: [] });
    expect(sim.snapshot().length).toBe(4);
  });

  it('MEC-001-R9 snake does not step during transition and queued turns apply after it', () => {
    const sim = levelUpSim(); sim.advance(140); sim.advance(200);
    sim.turn(0, 1);
    const head = sim.snapshot().snake[0];
    sim.advance(937);
    expect(sim.snapshot().snake[0]).toEqual(head);
    expect(stateOf(sim).acc).toBe(137);
    sim.advance(1);
    expect(sim.snapshot().snake[0]).toEqual({ x: 5, y: 1 });
  });

  it('MEC-001-R10 boardFull event and won outcome never occur before the L30 clear', () => {
    const sim = simFromAscii(b, ['..' + 'w'.repeat(15), '..' + 'w'.repeat(15), 'wM' + 'w'.repeat(15), ...Array<string>(14).fill('w'.repeat(17))], {
      snake: [[1, 1], [1, 0], [0, 0], [0, 1]], dir: [0, 1], quiet: true,
    });
    sim.advance(140);
    expect(types(sim)).toEqual(['ate']);
    expect(sim.snapshot()).toMatchObject({ status: 'playing', outcome: null, mango: null });
    sim.turn(1, 0); sim.advance(140);
    expect(sim.snapshot()).toMatchObject({ status: 'playing', mango: null });
    expect(sim.snapshot().snake[0]).toEqual({ x: 2, y: 2 });
  });

  it('MEC-001-EC1 golden overflow carries progress but not length', () => {
    const sim = simFromAscii(b, ['.....G'], { snake: [[4, 0], [3, 0], [2, 0], [1, 0]], quiet: true, extraState: { progress: 3 } });
    sim.advance(140);
    expect(sim.snapshot()).toMatchObject({ level: 2, progress: 1, length: 4 });
  });

  it('MEC-003-R5 overflow progress carries into the next level', () => {
    const sim = simFromAscii(b, ['.....G'], { snake: [[4, 0], [3, 0], [2, 0], [1, 0]], quiet: true, extraState: { progress: 3 } });
    sim.advance(140);
    expect(sim.snapshot()).toMatchObject({ level: 2, progress: 1, need: 4 });
  });

  it('MEC-003-R7 all hazards are non-solid from t = 0 and gone by t = 500', () => {
    const sim = simFromAscii(b, ['.....M', '#Fw'], {
      snake: [[4, 0], [3, 0], [2, 0], [1, 0]], quiet: true, extraState: {
        progress: 3, terrains: [{ family: 'terrain', t: 1, lifeMs: 10000, cells: [{ x: 9, y: 9, delay: 0, up: true, vis: 'up' }] }],
      },
    });
    sim.advance(140);
    const s = stateOf(sim);
    expect(s.hazards).toHaveLength(3);
    expect(s.hazards.every(h => h.state === 'crumble' && h.cells.every(c => !c.on))).toBe(true);
    for (const [x, y] of [[0, 1], [1, 1], [2, 1], [9, 9]]) expect(cellSolidCause(s, x!, y!)).toBeNull();
    expect(s.terrains[0]!.cells[0]).toMatchObject({ up: false, vis: 'down' });
    sim.advance(449); expect(sim.snapshot().hazards).toHaveLength(3);
    sim.advance(1); expect(sim.snapshot().hazards).toEqual([]);
    sim.advance(49); expect(sim.snapshot().terrains).toHaveLength(1);
    sim.advance(1); expect(sim.snapshot().terrains).toEqual([]);
  });

  it('MEC-003-R9 rot timer, director timer and levelTimeMs do not advance during transition', () => {
    const sim = levelUpSim(); sim.advance(141);
    const before = exportState(sim), age = sim.snapshot().mango!.ageMs;
    sim.advance(998);
    expect(sim.snapshot().mango!.ageMs).toBe(age);
    expect(stateOf(sim)).toMatchObject({ spawnInMs: before.spawnInMs, mazeCooldownMs: before.mazeCooldownMs, levelTimeMs: before.levelTimeMs, timeMs: before.timeMs + 998, acc: 0 });
  });

  it('MEC-003-R10 turns queued during transition are applied afterwards', () => {
    const sim = levelUpSim(); sim.advance(140);
    sim.turn(0, 1); sim.turn(1, 0);
    sim.advance(1000 + 138);
    expect(sim.snapshot().snake[0]).toEqual({ x: 5, y: 1 });
    sim.advance(138);
    expect(sim.snapshot().snake[0]).toEqual({ x: 6, y: 1 });
  });

  it('MEC-003-R11 first spawn of each level is 2500 ms after transition end', () => {
    const sim = simFromAscii(b, ['.....M'], { snake: [[4, 0], [3, 0], [2, 0], [1, 0]], extraState: { progress: 3 } });
    sim.advance(1140);
    expect(exportState(sim)).toMatchObject({ spawnInMs: 2500, mazeCooldownMs: 0 });
    circle(sim, 2499);
    expect(sim.snapshot().hazards).toEqual([]);
    expect(exportState(sim).spawnInMs).toBe(1);
    circle(sim, 1);
    expect(sim.snapshot().hazards.length).toBeGreaterThan(0);
  });

  it('MEC-003-R7 levelUp carries biome, challenge, biomeChanged, unlocked and clearedLevelTimeMs', () => {
    const sim = levelUpSim({ level: 5, progress: 4, levelTimeMs: 6868 });
    sim.advance(132);
    expect(sim.drainEvents().find(e => e.type === 'levelUp')).toEqual({
      type: 'levelUp', level: 6, biome: 2, challenge: false, biomeChanged: true, unlocked: 'fence', clearedLevelTimeMs: 7000,
    });
    expect(sim.snapshot()).toMatchObject({ biome: 2, challenge: false, levelTimeMs: 0, timeMs: 132, startLevel: 1, levelsCleared: 1, length: 4, minLength: 3 });
  });
});
