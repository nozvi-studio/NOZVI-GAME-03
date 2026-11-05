import { expect, it } from 'vitest';
import { DEFAULT_FAMILIES, __setFamiliesForTest } from '../../../src/core/hazards/registry';
import { addTimedHazards, makeTimed } from '../../../src/core/hazards/timed';
import { needFor } from '../../../src/core/level';
import { restoreSim } from '../../../src/core/sim';
import { stateOf } from '../../../src/core/simInternal';
import { rngFrom, seedRng } from '../../../src/core/rng';
import type { SimState } from '../../../src/core/types';
import { loadBalance } from '../../support/balance';
import { buildBoard } from '../../support/board';
import { runFamilyFuzz } from '../../support/familyFuzz';
import { play, type Input } from '../../support/p1fuzz';

it('MEC-004-R17 rerun simulation seeds use a different stream from the input RNG', () => {
  const firstFrameRng = new Set<number>();
  const input = seedRng(1 + 1000003);
  rngFrom(input).next(); // Initial mango placement consumes one world RNG draw.
  __setFamiliesForTest(DEFAULT_FAMILIES.map(f => ({ ...f,
    update(s, ctx) { if (s.timeMs === 1) firstFrameRng.add(s.rng.s); f.update(s, ctx); },
  })));
  try {
    expect(runFamilyFuzz({ family: 'rock', mode: 'solo', startLevel: 1,
      seeds: 1, durationMs: 5000, escape: 'off' })).toEqual([]);
    expect(firstFrameRng.size).toBeGreaterThan(1);
    expect(firstFrameRng.has(input.s)).toBe(false);
  } finally { __setFamiliesForTest(null); }
});

it('MEC-004-R17 seeds consume their full playing-time budget after deaths and exercise real spawns', () => {
  const times = new Map<SimState, number>();
  let spawns = 0;
  __setFamiliesForTest(DEFAULT_FAMILIES.map(f => ({ ...f,
    spawn(s, ctx) { const cells = f.spawn(s, ctx); if (cells) spawns++; return cells; },
    update(s, ctx) { times.set(s, s.timeMs); f.update(s, ctx); },
  })));
  try {
    expect(runFamilyFuzz({ family: 'rock', mode: 'solo', startLevel: 1,
      seeds: 2, durationMs: 20000, escape: 'off' })).toEqual([]);
    // Both the checked run and its I7 replay must consume the budget.
    expect([...times.values()].reduce((sum, ms) => sum + ms, 0)).toBe(80000);
    expect(spawns).toBeGreaterThan(0);
  } finally { __setFamiliesForTest(null); }
});

it.each(['rock', 'fence', 'maze', 'terrain'] as const)(
  'MEC-004-R17 I7 %s survives a level up and completes its own lifecycle through slowdown easing', family => {
    const b = loadBalance(), source = buildBoard({ level: 21, mango: [9, 8] });
    source.rampActive = false; source.progress = needFor(b, 21) - 1;
    if (family === 'terrain') source.families.terrain = [{ family, t: 0, lifeMs: 5000,
      cells: [{ x: 3, y: 3, delay: 0, up: false, vis: 'down' }] }];
    else addTimedHazards(source, makeTimed(family, [{ x: 3, y: 3 }], b[family].warnMs, 1000));
    const sim = restoreSim(b, source, { directorEnabled: false }), s = stateOf(sim), inputs: Input[] = [];
    let crossed = false, warningSince: number | null = null, wasActive = false, activated = false;
    for (let t = 0; t < 7000; t++) {
      const h = s.snake[0]!;
      const turn: Input['turn'] = h.x === 12 && s.dir.x === 1 ? [0, 1]
        : h.y === 12 && s.dir.y === 1 ? [-1, 0]
        : h.x === 8 && s.dir.x === -1 ? [0, -1]
        : h.y === 8 && s.dir.y === -1 ? [1, 0] : undefined;
      if (turn && !s.queue.length) { inputs.push({ t, turn }); sim.turn(...turn); }
      const before = sim.snapshot();
      sim.advance(1);
      const snapshot = sim.snapshot();
      const timed = snapshot.hazards.find(h => h.type === family);
      const terrainCell = snapshot.terrains[0]?.cells[0];
      const active = family === 'terrain' ? terrainCell?.vis === 'up' : timed?.cells[0]?.on === true;
      const warning = family === 'terrain' ? terrainCell?.vis === 'warn' : timed?.state === 'warn';
      if (warning) warningSince ??= t + 1;
      if (active && !wasActive) {
        activated = true;
        expect(warningSince).not.toBeNull();
        expect(t + 1 - warningSince!).toBeGreaterThanOrEqual(900); // I3 through the level-up slowdown.
        expect(before.snake).not.toContainEqual({ x: 3, y: 3 }); // I1 at activation.
      }
      if (!warning) warningSince = null;
      wasActive = active;
      expect(snapshot.status).toBe('playing'); // No family death (I6) occurs on this clear route.
      for (const e of sim.drainEvents()) if (e.type === 'levelUp') {
        crossed = true;
        expect(e.level).toBe(22);
        expect(s.families[family]).toHaveLength(1);
        expect(s.levelUpSlow?.leftMs).toBe(1500);
      }
    }
    expect(crossed).toBe(true);
    expect(activated).toBe(true);
    expect(s.status).toBe('playing');
    expect(s.levelUpSlow).toBeNull();
    expect(s.families[family]).toHaveLength(0);
    const replay = restoreSim(b, source, { directorEnabled: false });
    play(replay, inputs, 0, 7000, 37);
    expect(JSON.stringify(replay.snapshot())).toBe(JSON.stringify(sim.snapshot()));
  });
