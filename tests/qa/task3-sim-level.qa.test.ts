// tests/qa/task3-sim-level.qa.test.ts — black-box QA tests for Task 3 levels, speed & Sim shell
import { describe, it, expect } from 'vitest';
import { createSim, restoreSim, needFor, tickMsFor } from '../../src/core';
import { loadBalance } from '../support/balance';
import { buildState } from '../support/state';

describe('QA Task 3: Levels, Sim Shell & Determinism (Black-Box)', () => {
  const b = loadBalance();

  it('QA-T3-17 level quota calculation needFor', () => {
    // updated for P1 MEC-003-R1/R2
    for (let lvl = 1; lvl <= 30; lvl++) {
      expect(needFor(b, lvl)).toBe(4 + Math.floor((lvl - 1) / 3));
    }
  });

  it('QA-T3-18 tick speed calculation tickMsFor', () => {
    // updated for P1 MEC-003-R1/R3
    expect(tickMsFor(b, 1)).toBe(140);
    expect(tickMsFor(b, 2)).toBe(138);
    expect(tickMsFor(b, 3)).toBe(136);
    expect(tickMsFor(b, 5)).toBe(132);
    expect(tickMsFor(b, 10)).toBe(122);
    expect(tickMsFor(b, 30)).toBe(82);
    expect(tickMsFor(b, 31)).toBe(82); // clamped to minMs = 82
  });

  it('QA-T3-19 snake tick timing runs at tickMs intervals', () => {
    // Spec: design §4: "snake step when the tick accumulator reaches tickMs"
    const sim = createSim(b, 42); // Level 0 -> tickMs = 140
    sim.advance(139);
    expect(sim.snapshot().snake[0]).toEqual({ x: 8, y: 8 }); // no step yet

    sim.advance(1);
    expect(sim.snapshot().snake[0]).toEqual({ x: 9, y: 8 }); // stepped at 140 ms
  });

  it('QA-T3-20 level up transitions at exact quota', () => {
    // updated for P1 MEC-003-R1/R2/R3
    const sim = restoreSim(b, buildState(b, {
      level: 1,
      progress: 3,
      mango: [9, 8],
      golden: false,
    }));
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.level).toBe(2);
    expect(snap.progress).toBe(0);
    expect(snap.need).toBe(4);
    expect(snap.tickMs).toBe(138);

    const events = sim.drainEvents();
    expect(events).toContainEqual({
      type: 'levelUp',
      level: 2,
    });
  });

  it('QA-T3-21 golden mango progress overflow carries over', () => {
    // updated for P1 MEC-003-R1/R2
    const sim = restoreSim(b, buildState(b, {
      level: 1,
      progress: 3,
      mango: [9, 8],
      golden: true,
    }));
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.level).toBe(2);
    expect(snap.progress).toBe(1); // 3 + 2 - 4 = 1
    expect(snap.need).toBe(4);

    const events = sim.drainEvents();
    expect(events).toContainEqual({
      type: 'levelUp',
      level: 2,
    });
  });

  it('QA-T3-22 unlock events emitted on milestone levels', () => {
    // updated for P1 MEC-003-R15/R16
    const levelsToTest: Array<{ lvl: number; unlocked?: string }> = [
      { lvl: 6, unlocked: 'fence' },
      { lvl: 11, unlocked: 'terrain' },
      { lvl: 12, unlocked: 'rottenRock' },
      { lvl: 26, unlocked: 'maze' },
    ];

    for (const { lvl, unlocked } of levelsToTest) {
      const sim = restoreSim(b, buildState(b, {
        level: lvl - 1,
        progress: needFor(b, lvl - 1) - 1,
        mango: [9, 8],
        golden: false,
      }));
      sim.advance(tickMsFor(b, lvl - 1));
      const events = sim.drainEvents();

      expect(events).toContainEqual({
        type: 'levelUp',
        level: lvl,
        unlocked,
      });
    }
  });

  it('QA-T3-23 max level caps at level 10', () => {
    // updated for P1 MEC-003-R1
    const sim = restoreSim(b, buildState(b, {
      level: 30,
      progress: needFor(b, 30) - 1,
      mango: [9, 8],
      golden: false,
    }));
    sim.advance(tickMsFor(b, 30));
    const snap = sim.snapshot();

    expect(snap.level).toBe(30);
    expect(snap.progress).toBe(0);
  });

  it('QA-T3-24 determinism under different advance chunking', () => {
    // Spec: design §4: "The result does not depend on how the caller splits time into advance calls."
    const simA = createSim(b, 12345);
    const simB = createSim(b, 12345);
    const simC = createSim(b, 12345);

    simA.advance(600);

    for (let i = 0; i < 600; i++) simB.advance(1);

    simC.advance(200);
    simC.advance(400);

    expect(simB.snapshot()).toEqual(simA.snapshot());
    expect(simC.snapshot()).toEqual(simA.snapshot());
    expect(simB.drainEvents()).toEqual(simA.drainEvents());
    expect(simC.drainEvents()).toEqual(simA.drainEvents());
  });

  it('QA-T3-25 determinism with interleaved turns across advance chunks', () => {
    // Spec: design §4: "Same seed + same balance + same sequence of turn calls at the same sim times => identical state."
    const simA = createSim(b, 777);
    const simB = createSim(b, 777);

    simA.advance(70);
    simA.turn(0, 1);
    simA.advance(210);

    for (let i = 0; i < 70; i++) simB.advance(1);
    simB.turn(0, 1);
    for (let i = 0; i < 210; i++) simB.advance(1);

    expect(simB.snapshot()).toEqual(simA.snapshot());
    expect(simB.drainEvents()).toEqual(simA.drainEvents());
  });

  it('QA-T3-26 advance is a no-op when status is over', () => {
    // Spec: design §4: "advance(ms)... no-op after over"
    const sim = restoreSim(b, buildState(b, {
      snake: [[16, 8], [15, 8], [14, 8]],
      dir: [1, 0],
    }));
    sim.advance(140); // hits wall
    expect(sim.snapshot().status).toBe('over');

    sim.drainEvents(); // clear died event
    const snapBefore = structuredClone(sim.snapshot());

    sim.advance(1000); // no-op
    expect(sim.snapshot()).toEqual(snapBefore);
    expect(sim.drainEvents()).toEqual([]);
  });

  it('QA-T3-27 snapshot purity and mutation isolation', () => {
    // Spec: design §4: "snapshot(): Readonly<SimSnapshot> read-only view for rendering"
    const sim = createSim(b, 42);
    const snap1 = sim.snapshot();

    // Mutating snapshot object directly must not affect subsequent snapshots
    try {
      (snap1.snake as unknown as Array<{ x: number; y: number }>)[0] = { x: 99, y: 99 };
    } catch {
      // If Object.freeze is used, mutation throws in strict mode, which is also pure
    }

    const snap2 = sim.snapshot();
    expect(snap2.snake[0]).toEqual({ x: 8, y: 8 });
  });

  it('QA-T3-28 tickAlpha behavior across tick and on game over', () => {
    // Spec: design §4: "tickAlpha = status === 'over' ? 1 : min(1, acc / tickMs)"
    const sim = createSim(b, 42); // Level 0 -> tickMs = 140
    expect(sim.snapshot().tickAlpha).toBe(0);

    sim.advance(70);
    expect(sim.snapshot().tickAlpha).toBeCloseTo(70 / 140, 5);

    sim.advance(70); // exact step boundary
    expect(sim.snapshot().tickAlpha).toBe(0);

    // Hit wall to cause game over
    const deadSim = restoreSim(b, buildState(b, {
      snake: [[16, 8], [15, 8], [14, 8]],
      dir: [1, 0],
    }));
    deadSim.advance(140);
    expect(deadSim.snapshot().status).toBe('over');
    expect(deadSim.snapshot().tickAlpha).toBe(1);
  });

  it('QA-T3-29 clone independence and state deep copy', () => {
    // Spec: design §4: "clone(): independent copy: structuredClone of the state"
    const sim1 = createSim(b, 42);
    sim1.advance(100);

    const sim2 = sim1.clone();
    sim2.turn(0, 1);
    sim2.advance(200);

    sim1.advance(200); // advances straight without turn

    expect(sim1.snapshot().dir).toEqual({ x: 1, y: 0 });
    expect(sim2.snapshot().dir).toEqual({ x: 0, y: 1 });
    expect(sim1.snapshot().snake[0]).not.toEqual(sim2.snapshot().snake[0]);
  });

  it('QA-T3-30 restoreSim deep copy and simulation resumption', () => {
    // Spec: design §4: restoreSim deep copies state
    const state = buildState(b, {
      snake: [[10, 10], [9, 10], [8, 10]],
      dir: [0, 1],
    });
    const sim = restoreSim(b, state);

    // Mutate original state after restore
    state.snake[0] = { x: 0, y: 0 };
    expect(sim.snapshot().snake[0]).toEqual({ x: 10, y: 10 });

    sim.advance(140);
    expect(sim.snapshot().snake[0]).toEqual({ x: 10, y: 11 }); // stepped down
  });
});
