// tests/qa/task5-determinism.qa.test.ts — black-box QA tests for Task 5 chunking determinism & invariant fuzz
import { describe, it, expect } from 'vitest';
import { loadBalance } from '../support/balance';
import { createSim, restoreSim, stateOf } from '../../src/core/sim';
import { fuzzSeed, snapHash } from '../support/fuzz';

describe('QA Task 5: Chunking Determinism & Invariant Fuzz', () => {
  const b = loadBalance();

  it('QA-T5-33 P0-Design §4, §9 determinism with different advance chunking', () => {
    // Design §4: "Same seed + same balance + same sequence of turn calls at the same sim times
    // => identical state. The result does not depend on how the caller splits time into advance calls."
    const seed = 4242;
    const sim1 = createSim(b, seed);
    const sim2 = createSim(b, seed);
    const sim3 = createSim(b, seed);

    // Apply the same turns at the same sim times:
    // At t = 500 turn down, at t = 1200 turn right, at t = 2000 turn up
    // sim1: advance by 100 ms chunks up to 3500 ms (so director spawns at 2500 ms)
    for (let t = 0; t < 3500; t += 100) {
      if (t === 500) sim1.turn(0, 1);
      if (t === 1200) sim1.turn(1, 0);
      if (t === 2000) sim1.turn(0, -1);
      sim1.advance(100);
    }

    // sim2: advance in variable chunks: 250ms, 50ms, 500ms...
    const chunks = [250, 250, 100, 400, 200, 700, 100, 500, 500, 450, 50]; // sum = 3500
    let sim2Time = 0;
    for (const dt of chunks) {
      if (sim2Time === 500) sim2.turn(0, 1);
      if (sim2Time === 1200) sim2.turn(1, 0);
      if (sim2Time === 2000) sim2.turn(0, -1);
      sim2.advance(dt);
      sim2Time += dt;
    }

    // sim3: advance 1 ms at a time
    for (let t = 0; t < 3500; t++) {
      if (t === 500) sim3.turn(0, 1);
      if (t === 1200) sim3.turn(1, 0);
      if (t === 2000) sim3.turn(0, -1);
      sim3.advance(1);
    }

    const hash1 = snapHash(sim1);
    const hash2 = snapHash(sim2);
    const hash3 = snapHash(sim3);

    expect(hash2).toBe(hash1);
    expect(hash3).toBe(hash1);
    expect(sim2.snapshot()).toEqual(sim1.snapshot());
    expect(sim3.snapshot()).toEqual(sim1.snapshot());
  });

  it('QA-T5-34 P0-Design §4, §9 clone independent evolution with active hazards', () => {
    // Design §4: "clone() deep-copies it with structuredClone; the clone and the original
    // then evolve independently and identically for identical inputs."
    const sim = createSim(b, 777);
    // Keep snake alive past first spawn (2500 ms) by steering
    sim.advance(500);
    sim.turn(0, 1);
    sim.advance(700);
    sim.turn(-1, 0);
    sim.advance(700);
    sim.turn(0, -1);
    sim.advance(1100); // total 3000 ms
    expect(sim.snapshot().status).toBe('playing');
    expect(sim.snapshot().hazards.length + sim.snapshot().terrains.length).toBeGreaterThan(0);

    const cloneSim = sim.clone();
    const snapBefore = structuredClone(sim.snapshot());

    // Advancing clone should not change original
    cloneSim.advance(500);
    expect(sim.snapshot()).toEqual(snapBefore);

    // Advancing original by 500 ms brings it to the exact state of clone
    sim.advance(500);
    expect(snapHash(sim)).toBe(snapHash(cloneSim));
    expect(sim.snapshot()).toEqual(cloneSim.snapshot());
  });

  it('QA-T5-35 P0-Design §4, §9 state JSON serializable plain data with active hazards', () => {
    // Design §4, §9 item 2: SimState survives JSON.parse(JSON.stringify(state)) unchanged
    const sim = createSim(b, 888);
    sim.advance(500);
    sim.turn(0, 1);
    sim.advance(700);
    sim.turn(-1, 0);
    sim.advance(700);
    sim.turn(0, -1);
    sim.advance(1300); // 3200 ms total
    expect(sim.snapshot().status).toBe('playing');
    expect(sim.snapshot().hazards.length + sim.snapshot().terrains.length).toBeGreaterThan(0);

    const origSnap = sim.snapshot();
    const cloned = sim.clone();
    const restored = restoreSim(b, JSON.parse(JSON.stringify(stateOf(cloned))));

    // Advancing cloned and restored independently produces identical behavior
    cloned.advance(400);
    restored.advance(400);
    expect(snapHash(cloned)).toBe(snapHash(restored));
  });

  it('QA-T5-36 MEC-004-R17 seeded invariant fuzz smoke test (I1-I7 hold)', () => {
    // MEC-004-R17 & Design §9 item 2:
    // Smoke sample: 5 seeds x 10 s sim time each
    const seeds = [101, 202, 303, 404, 505];
    for (const seed of seeds) {
      const rep = fuzzSeed(b, seed, 10000); // 10 s sim time
      expect(rep.violations).toEqual([]);
      expect(rep.steps).toBeGreaterThan(0);
    }
  });
});
