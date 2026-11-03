// tests/core/balance.test.ts
import { describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { parseBalance } from '../../src/core/balance';
import { loadBalance } from '../support/balance';

const mutate = (fn: (j: any) => void): unknown => { const j = structuredClone(json) as any; fn(j); return j; };

describe('GDD-7 balance', () => {
  it('GDD-7 balance.json passes parseBalance', () => { expect(() => loadBalance()).not.toThrow(); });

  it('GDD-7 parity table: every value equals the prototype constant', () => {
    const b = loadBalance();
    const table: [unknown, unknown, string][] = [
      [b.board, { cols: 17, rows: 17 }, 'L166'], [b.snake.start, [[8, 8], [7, 8], [6, 8]], 'L627'],
      [b.snake.startDir, [1, 0], 'L628'], [b.snake.maxQueuedTurns, 3, 'L704'],
      [b.speed, { startMs: 140, minMs: 95, msPerLevel: 4 }, 'L167'],
      [b.level, { maxLevel: 10, needBase: 4, needPerLevel: 1, unlock: { fence: 2, terrain: 4, maze: 6 } }, 'L168–173'],
      [b.mango, { rotBaseMs: 8000, rotPerEatenMs: 150, rotMinMs: 4000, goldenRotFactor: 0.5, goldenChance: 0.15,
        goldenMinEaten: 3, points: { normal: 1, golden: 3 }, progress: { normal: 1, golden: 2 }, nearHeadDist: 3 }, 'L388–394, L782, L792'],
      [b.fairness, { nearHeadDist: 4, frontLaneCells: 4, terrainNearHeadDist: 3 }, 'L356, L359, L521'],
      [b.hazard.crumbleMs, 450, 'L170'],
      [[b.rock.warnMs, b.rock.lifeMs, b.rock.lifeRandMs, b.rock.tries], [1500, 6000, 4000, 40], 'L430–434'],
      [b.rock.shapePoolByLevel, [{ minLevel: 0, add: ['single'] }, { minLevel: 2, add: ['lineH', 'lineV'] },
        { minLevel: 4, add: ['corner', 'block'] }], 'L428'],
      [b.rock.shapes, { single: [[0, 0]], lineH: [[0, 0], [1, 0], [2, 0]], lineV: [[0, 0], [0, 1], [0, 2]],
        corner: [[0, 0], [1, 0], [0, 1]], block: [[0, 0], [1, 0], [0, 1], [1, 1]] }, 'L423–426'],
      [[b.fence.warnMs, b.fence.lifeMs, b.fence.lifeRandMs, b.fence.tries, b.fence.lineBase, b.fence.lineExtraMax,
        b.fence.gapMinLen, b.fence.mirrorChance], [2000, 9000, 4000, 60, 5, 4, 7, 0.5], 'L451–476'],
      [b.fence.poolAfterUnlock, [{ offset: 0, add: ['line', 'L'] }, { offset: 1, add: ['T', 'Z'] },
        { offset: 2, add: ['F', 'U', 'plus'] }], 'L466–468'],
      [b.fence.shapes.L, [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]], 'L442'],
      [b.fence.shapes.T, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [2, 1], [2, 2], [2, 3]], 'L443'],
      [b.fence.shapes.Z, [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [3, 2], [4, 2]], 'L444'],
      [b.fence.shapes.F, [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [1, 2], [0, 3], [0, 4]], 'L445'],
      [b.fence.shapes.U, [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 1], [3, 0]], 'L446'],
      [b.fence.shapes.plus, [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [2, 3], [2, 4]], 'L447'],
      [[b.maze.warnMs, b.maze.lifeMs, b.maze.lifeRandMs, b.maze.minCells, b.maze.cooldownMs], [2600, 14000, 4000, 6, 26000], 'L501–503'],
      [b.terrain, { periodMs: 3400, upMs: 1400, warnMs: 900, startDelayMs: 600, fadeOutMs: 500, lifeMs: 18000,
        lifeRandMs: 6000, tries: 40, minCells: 6, waveChance: 0.5, horizChance: 0.5, waveLenMin: 6, waveLenRand: 3,
        waveWidth: 2, waveDelayMs: 260, checkerSize: 4, maxActive: 1, maxActiveLate: 2, lateLevel: 8 }, 'L171, L509–546, L584, L595'],
      [b.director, { firstSpawnMs: 2500, intervalBaseMs: 5000, intervalPerLevelMs: 300, intervalMinMs: 2000, capBase: 2,
        capPerLevels: 2, capMax: 8, weights: { rock: 3, fence: 2, terrain: 2, maze: 2 } }, 'L309, L537–547'],
      [b.flow, { countdownMs: 1500, countdownDigits: 3, maxFrameDeltaMs: 100, deathCardDelayMs: 550 }, 'L174, L989, L694'],
      [b.ui, { bannerMs: 1800, swipeMinPx: 18, swipeBoardFactor: 0.05, haptics: { eatMs: 12, level: [15, 40, 15], deathMs: 90 },
        terrainFadeInMs: 600, hazardFlickerMs: 1500 }, 'L414, L753, L790, L608, L683, L856, L879'],
    ];
    for (const [actual, expected, where] of table) expect(actual, where).toEqual(expected);
  });

  it('GDD-7 parseBalance rejects minMs > startMs', () => {
    expect(() => parseBalance(mutate(j => { j.speed.minMs = 141; }))).toThrow(/Invalid balance: speed\.minMs/);
  });

  it('GDD-7 parseBalance rejects a missing value', () => {
    expect(() => parseBalance(mutate(j => { delete j.board.cols; }))).toThrow(/board\.cols must be a positive integer/);
  });
  it('GDD-7 parseBalance rejects a negative duration', () => {
    expect(() => parseBalance(mutate(j => { j.rock.warnMs = -1; }))).toThrow(/rock\.warnMs/);
  });
  it('GDD-7 parseBalance rejects a probability above 1', () => {
    expect(() => parseBalance(mutate(j => { j.mango.goldenChance = 1.5; })))
      .toThrow(/mango\.goldenChance must be a number in \[0, 1\]/);
  });
  it('GDD-7 parseBalance rejects an unknown shape name', () => {
    expect(() => parseBalance(mutate(j => { j.rock.shapePoolByLevel[1].add = ['hex']; }))).toThrow(/rock\.shapePoolByLevel\[1\]\.add/);
  });
  it('GDD-7 parseBalance rejects a terrain cycle without a down phase', () => {
    expect(() => parseBalance(mutate(j => { j.terrain.upMs = 2500; }))).toThrow(/terrain\.periodMs/);
  });
  it('GDD-7 parseBalance rejects a non-object', () => {
    expect(() => parseBalance(null)).toThrow(/Invalid balance: balance must be an object/);
  });
});
