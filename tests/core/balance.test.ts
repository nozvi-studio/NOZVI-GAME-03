// tests/core/balance.test.ts
import { describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { parseBalance } from '../../src/core/balance';
import { loadBalance } from '../support/balance';
import { withFamilies } from '../support/fakeFamily';
import { buildState } from '../support/state';
import { DEFAULT_FAMILIES } from '../../src/core/hazards/registry';

const mutate = (fn: (j: any) => void): unknown => { const j = structuredClone(json) as any; fn(j); return j; };

describe('GDD-7 balance', () => {
  it('MEC-014-R1 gate U tags name exactly two distinct cells in the shape', () => {
    for (const gateCells of [[[1, 0]], [[1, 0], [1, 0]], [[1, 0], [99, 0]], [[1, 0], [2, 0], [3, 0]]])
      expect(() => loadBalance(j => { j.gate.shapes.U.gateCells = gateCells; })).toThrow(/gate.shapes.U.gateCells/);
    expect(() => loadBalance(j => { j.gate.shapes.U.cells.push([0, 0]); })).toThrow(/gate.shapes.U.cells/);
  });
  it('MEC-004-R9 parseBalance validates every family maxActiveKey even when disabled', () => {
    const families = Object.freeze(DEFAULT_FAMILIES.map(f => Object.freeze({ ...f,
      maxActiveKey: f.key === 'rubble' ? 'testCap.nested.limit' : f.maxActiveKey,
    })));
    for (const value of [undefined, '2', NaN, Infinity, -1, 0, 1.5]) {
      expect(() => parseBalance(mutate(j => { j.testCap = { nested: { limit: value } }; }), families)).toThrow(/testCap.nested.limit/);
    }
    expect(() => parseBalance(structuredClone(json), families)).toThrow(/testCap.nested.limit/);
    expect(() => parseBalance(mutate(j => { j.testCap = { nested: { limit: 2 } }; }), families)).not.toThrow();
    expect(() => loadBalance()).not.toThrow();
  });
  it('MEC-004-R11 fairness pins the terrain distance and rule 1/escape tuning', () => {
    expect(loadBalance().fairness).toEqual({ nearHeadDist: 4, frontLaneCells: 4, terrainNearHeadDist: 4,
      minWarnMs: 900, minWarnTicks: 4, escapeHorizonMs: 4000 });
  });
  it('MEC-004-R13 parseBalance rejects a warnMs below 900', () => {
    for (const family of ['rock', 'fence', 'maze', 'terrain']) {
      expect(() => loadBalance(j => { j[family].warnMs = 899; })).toThrow(new RegExp(family + '\\.warnMs'));
    }
  });
  it('MEC-004-R13 warning minimum uses four L1 base ticks', () => {
    expect(() => loadBalance(j => { j.speed.startMs = 400; })).toThrow(/rock.warnMs/);
    expect(() => loadBalance(j => { j.rock.warnMs = 900; })).not.toThrow();
  });
  it('MEC-004-R1 parseBalance rejects an unknown or capClass none weight key', () => {
    for (const weights of [{ rottenRock: 1 }, { lava: 1 }])
      expect(() => loadBalance(j => { j.level.table[0].weights = weights; })).toThrow(/level.table\[0\].weights/);
  });
  it('MEC-004-R1 parseBalance validates registered descriptors independently of query test overrides', () => {
    const s = buildState(loadBalance());
    withFamilies(s, [{ key: 'rock', capClass: 'none' }], () => {
      expect(() => loadBalance()).not.toThrow();
    });
  });
  it('GDD-7 balance.json passes parseBalance', () => { expect(() => loadBalance()).not.toThrow(); });

  it('MEC-003/MEC-013/MEC-014 P2 balance v2 table pins every MEC section 9 value', () => {
    const b = loadBalance();
    expect(b.snake).toMatchObject({"start":[[8,8],[7,8],[6,8],[5,8]],"startDir":[1,0],"maxQueuedTurns":3});
    expect(b.speed).toMatchObject({"startMs":140,"msPerLevel":2,"minMs":82});
    expect(b.level).toEqual({ maxLevel: 30, perBiome: 5, needBase: 4, needStepLevels: 3, table: [
      { from: 1, to: 2, weights: { rock: 3 }, rockShapes: ['single'], fenceShapes: [], rottenRocks: false },
      { from: 3, to: 4, weights: { rock: 3 }, rockShapes: ['single', 'lineH', 'lineV'], fenceShapes: [], rottenRocks: false },
      { from: 5, to: 5, weights: { rock: 3 }, rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: [], rottenRocks: false },
      { from: 6, to: 6, weights: { rock: 3, fence: 2 }, rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: ['line'], rottenRocks: false },
      { from: 7, to: 10, weights: { rock: 3, fence: 2, mud: 2 }, rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: ['line', 'L'], rottenRocks: false },
      { from: 11, to: 11, weights: { rock: 3, fence: 2, terrain: 2, mud: 2 }, rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: ['line', 'L'], rottenRocks: false },
      { from: 12, to: 12, weights: { rock: 3, fence: 2, terrain: 2, mud: 2 }, rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: ['line', 'L'], rottenRocks: true },
      { from: 13, to: 15, weights: { rock: 3, fence: 2, terrain: 2, mud: 2, ice: 2 }, rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: ['line', 'L', 'T', 'Z'], rottenRocks: true },
      { from: 16, to: 16, weights: { rock: 3, fence: 2, terrain: 2, mud: 2, ice: 2, coconut: 2 }, rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: ['line', 'L', 'T', 'Z', 'F', 'U', 'plus'], rottenRocks: true },
      { from: 17, to: 17, weights: { rock: 3, fence: 2, terrain: 2, mud: 2, ice: 2, coconut: 2, gate: 2 }, rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: ['line', 'L', 'T', 'Z', 'F', 'U', 'plus'], rottenRocks: true },
      { from: 18, to: 20, weights: { rock: 3, fence: 2, terrain: 2, mud: 2, ice: 2, coconut: 2, gate: 2, spike: 2 }, rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: ['line', 'L', 'T', 'Z', 'F', 'U', 'plus'], rottenRocks: true },
      { from: 21, to: 21, weights: { rock: 3, fence: 2, terrain: 2, mud: 2, ice: 2, coconut: 2, gate: 2, spike: 2, npc: 2 }, rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: ['line', 'L', 'T', 'Z', 'F', 'U', 'plus'], rottenRocks: true },
      { from: 22, to: 25, weights: { rock: 3, fence: 2, terrain: 2, mud: 2, ice: 2, coconut: 2, gate: 2, spike: 2, npc: 2, bird: 2 }, rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: ['line', 'L', 'T', 'Z', 'F', 'U', 'plus'], rottenRocks: true },
      { from: 26, to: 30, weights: { rock: 3, fence: 2, terrain: 2, maze: 2, mud: 2, ice: 2, coconut: 2, gate: 2, spike: 2, npc: 2, bird: 2 }, rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: ['line', 'L', 'T', 'Z', 'F', 'U', 'plus'], rottenRocks: true },
    ] });
    expect(b.gate).toEqual({ landWarnMs: 1500, openMs: 2400, warnMs: 900, closedMs: 1500, lifeMs: 14000, lifeRandMs: 4000,
      maxActive: 1, tries: 40, lineLen: [5, 7], shapePool: ['line', 'U'], shapes: { U: {
        cells: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0], [1, 0], [2, 0]],
        gateCells: [[1, 0], [2, 0]],
      } } });
    expect(b.spike).toEqual({ downMs: 1800, warnMs: 900, upMs: 900, showMs: 1500, lifeMs: 12000, lifeRandMs: 4000,
      maxActive: 2, tries: 40, shapePool: ['single', 'pairH', 'pairV'],
      shapes: { single: [[0, 0]], pairH: [[0, 0], [1, 0]], pairV: [[0, 0], [0, 1]] } });
    expect(b.npc).toEqual({ warnMs: 1500, lifeMs: 15000, lifeRandMs: 5000, maxActive: 1, tries: 40,
      variants: { cat: { weight: 1, cellMs: 400, routeLen: [5, 8] }, chicken: { weight: 1, cellMs: 220, routeLen: [3, 5] } } });
    expect(b.coconut).toEqual({ warnMs: 1500, cellMs: 90, maxActive: 2, tries: 20 });
    expect(b.bird).toEqual({ shadowMs: 3000, marginMs: 600, maxActive: 1 });
    expect(b.mango).toMatchObject({"rotBaseMs":8000,"rotPerEatenMs":150,"rotMinMs":4000,"goldenRotFactor":0.5,"goldenChance":0.15,"goldenMinEaten":3,"points":{"normal":1,"golden":3},"progress":{"normal":1,"golden":2},"nearHeadDist":3,"rottenRockLifeMs":5000,"placeRetryMs":250});
    expect(b.director).toMatchObject({"firstSpawnMs":2500,"intervalBaseMs":5000,"intervalPerLevelMs":120,"intervalMinMs":1600,"capBase":2,"capPerLevels":3,"capMax":10,"challengeIntervalFactor":1,"challengeCapBonus":0});
    expect(b.energy).toMatchObject({"max":100,"orbGain":15,"goldenGain":10,"orbSpawnIntervalMs":6000,"orbMax":2,"orbLifeMs":8000,"orbBlinkMs":2000,"orbFromLevel":2});
    expect(b.skills).toMatchObject({"slowmo":{"cost":40,"durationMs":4000,"tickFactor":1.6,"unlockLevel":3},"tailSnip":{"cost":30,"minLength":3,"wallLifeMs":3000,"unlockLevel":6},"shield":{"cost":50,"durationMs":5000,"rubbleLifeMs":1500,"bonkPauseTicks":3,"unlockLevel":11},"mangoRain":{"cost":80,"durationMs":6000,"dropsMin":6,"dropsMax":10,"barCapFraction":0.5,"mangoLifeMs":8000,"mangoBlinkMs":2000,"unlockLevel":16}});
    expect(b.loadout).toMatchObject({"slots":2,"secondSlotLevel":6,"order":["slowmo","tailSnip","shield","mangoRain"]});
    expect(b.checkpoints).toMatchObject({"milestones":[{"reach":10,"start":4},{"reach":15,"start":6},{"reach":20,"start":8},{"reach":25,"start":10},{"reach":30,"start":12,"requiresClear":true}],"carryRatio":0.5,"carryMax":50,"rampMangoes":5});
    expect(b.log).toMatchObject({"maxEntries":500});
    for (const [group, key] of [[b.director, 'weights'], [b.level, 'unlock'], [b.level, 'needPerLevel'], [b.rock, 'shapePoolByLevel'], [b.terrain, 'maxActiveLate'], [b.terrain, 'lateLevel'], [b.fence, 'poolAfterUnlock']] as const) expect(group).not.toHaveProperty(key);
  });

  it('GDD-7 parseBalance rejects minMs > startMs', () => {
    expect(() => parseBalance(mutate(j => { j.speed.minMs = 141; }))).toThrow(/balance: speed\.minMs/);
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
    expect(() => parseBalance(mutate(j => { j.level.table[1].rockShapes = ['hex']; }))).toThrow(/level\.table\[1\]\.rockShapes/);
  });
  it('GDD-7 parseBalance rejects a terrain cycle without a down phase', () => {
    expect(() => parseBalance(mutate(j => { j.terrain.upMs = 2500; }))).toThrow(/terrain\.periodMs/);
  });
  it('GDD-7 parseBalance rejects a non-object', () => {
    expect(() => parseBalance(null)).toThrow(/balance: balance must be an object/);
  });
});

it('MEC-006 section 9 parseBalance rejects invalid skill and orb tuning', () => {
  for (const tickFactor of [0, 1]) expect(() => loadBalance(j => j.skills.slowmo.tickFactor = tickFactor)).toThrow();
  expect(() => loadBalance(j => j.skills.mangoRain.barCapFraction = 0)).toThrow();
  expect(() => loadBalance(j => j.skills.mangoRain.dropsMin = 11)).toThrow();
  expect(() => loadBalance(j => j.energy.orbBlinkMs = 8000)).toThrow();
  expect(() => loadBalance(j => j.skills.mangoRain.mangoBlinkMs = 8000)).toThrow();
});
it('MEC-007 section 9 parseBalance rejects decreasing unlock levels and duplicate loadout order', () => {
  expect(() => loadBalance(j => j.skills.tailSnip.unlockLevel = 2)).toThrow();
  expect(() => loadBalance(j => j.loadout.order[1] = 'slowmo')).toThrow();
});
it('MEC-002 section 9 parseBalance rejects rotMinMs > rotBaseMs and goldenRotFactor 0', () => {
  expect(() => loadBalance(j => j.mango.rotMinMs = 8001)).toThrow();
  expect(() => loadBalance(j => j.mango.goldenRotFactor = 0)).toThrow();
});
it('MEC-008 section 9 parseBalance validates checkpoints and carry', () => {
  for (const [field, value] of [['reach', 31], ['start', 0], ['start', 10], ['start', 2.5]])
    expect(() => loadBalance(j => j.checkpoints.milestones[0][field] = value)).toThrow();
  expect(() => loadBalance(j => j.checkpoints.carryRatio = 0)).toThrow();
  expect(() => loadBalance(j => j.checkpoints.carryMax = 101)).toThrow();
});
it('MEC-003 section 9 parseBalance rejects a non-positive log size', () => {
  expect(() => loadBalance(j => j.log.maxEntries = 0)).toThrow();
});
it('P1-PT parseBalance rejects a non-positive or non-integer log.sessionGapMs', () => {
  expect(() => loadBalance()).not.toThrow();
  expect(() => loadBalance(j => j.log.sessionGapMs = 0)).toThrow();
  expect(() => loadBalance(j => j.log.sessionGapMs = 1.5)).toThrow();
  expect(() => loadBalance(j => { delete j.log.sessionGapMs; })).toThrow();
});

it('MEC-016-R2 bird.shadowMs meets the fairness.minWarnMs floor', () => {
  expect(() => loadBalance(j => { j.bird.shadowMs = j.fairness.minWarnMs - 1; })).toThrow(/bird.shadowMs/);
  expect(() => loadBalance(j => { j.bird.shadowMs = j.fairness.minWarnMs; j.bird.marginMs = 0; })).not.toThrow();
});
