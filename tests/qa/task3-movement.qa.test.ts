// tests/qa/task3-movement.qa.test.ts — black-box QA tests for Task 3 snake movement & turns
import { describe, it, expect } from 'vitest';
import { createSim, restoreSim } from '../../src/core';
import { loadBalance } from '../support/balance';
import { buildState } from '../support/state';

describe('QA Task 3: Snake Movement & Turn Queue (Black-Box)', () => {
  const b = loadBalance();

  it('QA-T3-01 initial snake state & heading', () => {
    // Spec: design §5 MEC-001, balance.json
    const sim = createSim(b, 42);
    const snap = sim.snapshot();

    expect(snap.snake).toEqual([{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]);
    expect(snap.dir).toEqual({ x: 1, y: 0 });
    expect(snap.heading).toEqual({ x: 1, y: 0 });
    expect(snap.headFrom).toEqual({ x: 8, y: 8 });
    expect(snap.tailFrom).toEqual({ x: 6, y: 8 });
    expect(snap.status).toBe('playing');
    expect(snap.outcome).toBeNull();
  });

  it('QA-T3-02 turn queue buffers valid perpendicular turn', () => {
    // Spec: design §5 MEC-001
    const sim = createSim(b, 42);
    sim.turn(0, -1);
    const snap = sim.snapshot();

    expect(snap.dir).toEqual({ x: 1, y: 0 });
    expect(snap.heading).toEqual({ x: 0, y: -1 });
  });

  it('QA-T3-03 turn queue ignores 180 reverse', () => {
    // Spec: design §5 MEC-001: "Ignore a reverse and ignore the same direction."
    const sim = createSim(b, 42);
    sim.turn(-1, 0); // reverse of [1, 0]
    expect(sim.snapshot().heading).toEqual({ x: 1, y: 0 });

    sim.advance(140);
    // Snake stepped right, not left
    expect(sim.snapshot().snake[0]).toEqual({ x: 9, y: 8 });
  });

  it('QA-T3-04 turn queue ignores reverse against last queued turn', () => {
    // Spec: design §5 MEC-001: compare with last queued direction
    const sim = createSim(b, 42);
    sim.turn(0, 1);  // down
    sim.turn(0, -1); // up is reverse of down -> ignored
    expect(sim.snapshot().heading).toEqual({ x: 0, y: 1 });

    sim.advance(140); // 1st step: takes [0, 1] down -> head at [8, 9]
    expect(sim.snapshot().snake[0]).toEqual({ x: 8, y: 9 });
    sim.advance(140); // 2nd step: continues down -> head at [8, 10]
    expect(sim.snapshot().snake[0]).toEqual({ x: 8, y: 10 });
  });

  it('QA-T3-05 turn queue ignores duplicate direction', () => {
    // Spec: design §5 MEC-001: "ignore the same direction"
    const sim = createSim(b, 42);
    sim.turn(1, 0); // duplicate of current dir
    expect(sim.snapshot().heading).toEqual({ x: 1, y: 0 });

    sim.turn(0, 1); // queued
    sim.turn(0, 1); // duplicate of last queued -> ignored
    sim.advance(140); // step 1: consumes [0, 1]
    expect(sim.snapshot().snake[0]).toEqual({ x: 8, y: 9 });

    // Now current dir is [0, 1]. Try duplicate [0, 1] again
    sim.turn(0, 1);
    expect(sim.snapshot().heading).toEqual({ x: 0, y: 1 });
  });

  it('QA-T3-06 turn queue caps at 3 queued turns', () => {
    // Spec: design §5 MEC-001: "Queue at most 3 turns."
    const sim = createSim(b, 42);
    sim.turn(0, 1);  // 1: down
    sim.turn(-1, 0); // 2: left
    sim.turn(0, -1); // 3: up
    sim.turn(1, 0);  // 4: right -> should be dropped (buffer limit 3)

    sim.advance(140); // step 1 -> down to [8, 9]
    expect(sim.snapshot().snake[0]).toEqual({ x: 8, y: 9 });
    sim.advance(140); // step 2 -> left to [7, 9]
    expect(sim.snapshot().snake[0]).toEqual({ x: 7, y: 9 });
    sim.advance(140); // step 3 -> up to [7, 8]
    expect(sim.snapshot().snake[0]).toEqual({ x: 7, y: 8 });
    sim.advance(140); // step 4 -> queue was empty, keeps moving up to [7, 7]
    expect(sim.snapshot().snake[0]).toEqual({ x: 7, y: 7 });
  });

  it('QA-T3-07 turn queue consumes turns FIFO per step', () => {
    // Spec: design §5 MEC-001: "take one queued direction, then compute the new head"
    const sim = createSim(b, 42);
    sim.turn(0, 1);  // down
    sim.turn(-1, 0); // left

    sim.advance(140);
    expect(sim.snapshot().dir).toEqual({ x: 0, y: 1 });
    expect(sim.snapshot().snake[0]).toEqual({ x: 8, y: 9 });

    sim.advance(140);
    expect(sim.snapshot().dir).toEqual({ x: -1, y: 0 });
    expect(sim.snapshot().snake[0]).toEqual({ x: 7, y: 9 });
  });

  it('QA-T3-08 turn ignored when run is over', () => {
    // Spec: design §4: "turn(dx, dy): ignored after the run is over"
    const sim = restoreSim(b, buildState(b, {
      snake: [[16, 8], [15, 8], [14, 8]],
      dir: [1, 0],
    }));
    sim.advance(140); // hits right wall x=17
    expect(sim.snapshot().status).toBe('over');

    const hBefore = sim.snapshot().heading;
    sim.turn(0, 1);
    expect(sim.snapshot().heading).toEqual(hBefore);
  });

  it('QA-T3-09 snake steps forward without eating', () => {
    // Spec: design §5 MEC-001
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [12, 12],
    }));
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.snake).toEqual([{ x: 9, y: 8 }, { x: 8, y: 8 }, { x: 7, y: 8 }]);
    expect(snap.headFrom).toEqual({ x: 8, y: 8 });
    expect(snap.tailFrom).toEqual({ x: 6, y: 8 });
    expect(snap.score).toBe(0);
  });

  it('QA-T3-10 snake grows and scores on normal mango eat', () => {
    // Spec: design §5 MEC-001: "score += 1 (golden 3), eaten += 1, progress += 1 (golden 2)... no tail pop"
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: false,
    }));
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.snake).toEqual([{ x: 9, y: 8 }, { x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]);
    expect(snap.score).toBe(1);
    expect(snap.progress).toBe(1);
    expect(snap.headFrom).toEqual({ x: 8, y: 8 });
    expect(snap.tailFrom).toEqual({ x: 6, y: 8 });

    const events = sim.drainEvents();
    expect(events).toContainEqual({
      type: 'ate',
      x: 9,
      y: 8,
      golden: false,
      points: 1,
    });
  });

  it('QA-T3-11 snake grows and scores on golden mango eat', () => {
    // Spec: design §5 MEC-001: golden score 3, progress 2
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: true,
    }));
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.snake.length).toBe(4);
    expect(snap.score).toBe(3);
    expect(snap.progress).toBe(2);

    const events = sim.drainEvents();
    expect(events).toContainEqual({
      type: 'ate',
      x: 9,
      y: 8,
      golden: true,
      points: 3,
    });
  });

  it('QA-T3-12 wall collision causes died with cause wall and snake freezes', () => {
    // Spec: design §5 MEC-001: "Cause order: wall → self → solid cell cause... On death: status over, emit died; nothing moves."
    // died {x, y} is the head's cell for burst effect (design §7 L187)
    const edges: Array<{ head: [number, number]; dir: [number, number]; target: [number, number] }> = [
      { head: [16, 8], dir: [1, 0], target: [17, 8] },
      { head: [0, 8], dir: [-1, 0], target: [-1, 8] },
      { head: [8, 16], dir: [0, 1], target: [8, 17] },
      { head: [8, 0], dir: [0, -1], target: [8, -1] },
    ];

    for (const { head, dir } of edges) {
      const sim = restoreSim(b, buildState(b, {
        snake: [head, [8, 8], [8, 9]],
        dir,
      }));
      sim.advance(140);
      const snap = sim.snapshot();

      expect(snap.status).toBe('over');
      expect(snap.outcome).toEqual({ won: false, cause: 'wall' });
      expect(snap.snake[0]).toEqual({ x: head[0], y: head[1] }); // snake does not advance

      const events = sim.drainEvents();
      expect(events).toContainEqual({
        type: 'died',
        cause: 'wall',
        x: head[0],
        y: head[1],
      });
    }
  });

  it('QA-T3-13 self collision causes died with cause self and snake freezes', () => {
    // Spec: design §5 MEC-001: self collision cause; died {x, y} is the head's cell (design §7 L187)
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [8, 7], [7, 7], [7, 8], [7, 9]],
      dir: [-1, 0], // head at [8,8] steps left into body cell [7,8]
      mango: [15, 15],
    }));
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.status).toBe('over');
    expect(snap.outcome).toEqual({ won: false, cause: 'self' });
    expect(snap.snake[0]).toEqual({ x: 8, y: 8 });

    const events = sim.drainEvents();
    expect(events).toContainEqual({
      type: 'died',
      cause: 'self',
      x: 8,
      y: 8,
    });
  });

  it('QA-T3-14 moving into tail cell moving away is not a self collision', () => {
    // Spec: design §5 MEC-001: "The body used for self-collision includes the tail only when eating (otherwise the tail moves away this step)."
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [8, 7], [7, 7], [7, 8]],
      dir: [-1, 0], // head at [8,8] steps into tail cell [7,8]
      mango: [15, 15], // not eating
    }));
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.status).toBe('playing');
    expect(snap.snake[0]).toEqual({ x: 7, y: 8 });
    expect(snap.snake).toEqual([
      { x: 7, y: 8 },
      { x: 8, y: 8 },
      { x: 8, y: 7 },
      { x: 7, y: 7 },
    ]);
  });

  it('QA-T3-15 moving into tail cell while eating is a self collision', () => {
    // Spec: design §5 MEC-001: "The body used for self-collision includes the tail only when eating"
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [8, 7], [7, 7], [7, 8]],
      dir: [-1, 0],
      mango: [7, 8], // mango placed on tail cell
    }));
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.status).toBe('over');
    expect(snap.outcome).toEqual({ won: false, cause: 'self' });
    expect(snap.snake[0]).toEqual({ x: 8, y: 8 });
  });

  it('QA-T3-16 wall collision takes precedence over self or cell obstacles', () => {
    // Spec: design §5 MEC-001: "Cause order: wall → self → solid cell cause"
    const sim = restoreSim(b, buildState(b, {
      snake: [[0, 0], [0, 1], [0, 2]],
      dir: [-1, 0], // stepping off board to [-1, 0]
    }));
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.status).toBe('over');
    expect(snap.outcome).toEqual({ won: false, cause: 'wall' });
  });
});
