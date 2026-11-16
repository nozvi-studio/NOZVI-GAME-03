import { describe, expect, it } from 'vitest';
import { variantFor } from '../../src/core/fixedTerrain';
import { createSimInternal, stateOf } from '../../src/core/simInternal';
import type { Sim, SimState } from '../../src/core/types';
import { loadGameBalance } from '../support/balance';

const g = loadGameBalance();
const seed0 = (level: number) => { for (let s = 1; s < 1000; s++) if (variantFor(g, level, s) === 0) return s; throw new Error('no seed'); };
const quiet = (level: number) => createSimInternal(g, seed0(level), { startLevel: level }, { directorEnabled: false });
const stepOnce = (sim: Sim, s: SimState) => {
  const h = { ...s.snake[0]! };
  for (let i = 0; i < 5000 && s.status === 'playing' && s.snake[0]!.x === h.x && s.snake[0]!.y === h.y; i++) sim.advance(1);
};
// L3 variant 0 = Twin Stones: rocks at y 4, x 3..7 and y 12, x 10..13.
const aim = (sim: Sim) => { const s = stateOf(sim); s.snake = [{ x: 5, y: 6 }, { x: 5, y: 7 }, { x: 5, y: 8 }]; s.dir = { x: 0, y: -1 }; s.queue = []; s.mango = null; return s; };

describe('MEC-019-R6 Shield on terrain', () => {
  it('consumes the Shield, breaks the 3 x 4 area and starts invulnerability without a bonk', () => {
    const sim = quiet(3), s = aim(sim);
    s.shield = { leftMs: 5000 };
    stepOnce(sim, s); sim.drainEvents();
    stepOnce(sim, s);
    expect(s.status).toBe('playing');
    expect(s.snake[0]).toEqual({ x: 5, y: 4 });
    expect(s.shield).toBeNull();
    expect(s.acc).toBeGreaterThanOrEqual(0);
    expect(s.invuln!.leftMs).toBeGreaterThan(g.skills.shield.invulnMs - 50);
    const row = s.families.fixedTerrain.cells.filter(c => c.y === 4).map(c => c.x).sort((a, b) => a - b);
    expect(row).toEqual([3, 7]);
    const ev = sim.drainEvents();
    expect(ev).toContainEqual({ type: 'skillEnded', skill: 'shield', reason: 'consumed' });
    expect(ev).toContainEqual({ type: 'shieldBroke', x: 5, y: 4, family: 'fixedTerrain' });
    expect(ev.find(e => e.type === 'terrainBreached')).toMatchObject({ cells: expect.arrayContaining([{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }]) });
    expect(ev).toContainEqual({ type: 'invulnStarted', ms: g.skills.shield.invulnMs });
  });
  it('broken cells stay open until the next terrain change rebuilds them as warning cells', () => {
    const sim = quiet(3), s = aim(sim);
    s.shield = { leftMs: 5000 };
    stepOnce(sim, s); stepOnce(sim, s);
    sim.debugSkipTo(4);
    expect(s.families.fixedTerrain.cells.filter(c => c.y === 4)).toHaveLength(2);
    sim.debugSkipTo(5);
    expect(s.families.fixedTerrain.cells.some(c => c.state === 'warn')).toBe(true);
  });
  it('without a Shield the same move is a terrain death', () => {
    const sim = quiet(3), s = aim(sim);
    stepOnce(sim, s); stepOnce(sim, s);
    expect(s.outcome).toEqual({ won: false, cause: 'terrain' });
  });
});

describe('MEC-019-R7 invulnerability', () => {
  it('passes through terrain and the own body', () => {
    const sim = quiet(3), s = aim(sim);
    s.invuln = { leftMs: 60000 };
    stepOnce(sim, s); stepOnce(sim, s);
    expect(s.status).toBe('playing');
    expect(s.snake[0]).toEqual({ x: 5, y: 4 });
    s.snake = [{ x: 8, y: 8 }, { x: 9, y: 8 }, { x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }]; s.dir = { x: 0, y: 1 };
    stepOnce(sim, s);
    expect(s.status).toBe('playing');
  });
  it('the board edge still kills', () => {
    const sim = quiet(3), s = stateOf(sim);
    s.invuln = { leftMs: 60000 }; s.mango = null;
    s.snake = [{ x: 16, y: 1 }, { x: 15, y: 1 }, { x: 14, y: 1 }]; s.dir = { x: 1, y: 0 }; s.queue = [];
    stepOnce(sim, s);
    expect(s.outcome).toEqual({ won: false, cause: 'wall' });
  });
  it('the closed shrinking ring still kills', () => {
    const sim = quiet(3), s = stateOf(sim);
    s.invuln = { leftMs: 60000 }; s.mango = null;
    s.families.shrink.active = { t: g.shrink.warnMs, phase: 'closed', cells: [{ x: 3, y: 0, closed: true }] };
    s.snake = [{ x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }]; s.dir = { x: 0, y: -1 }; s.queue = [];
    stepOnce(sim, s); stepOnce(sim, s);
    expect(s.outcome).toEqual({ won: false, cause: 'shrink' });
  });
  it('lasts until the head is on a free cell, then ends with an event', () => {
    const sim = createSimInternal(g, seed0(3), { startLevel: 3 }, { directorEnabled: false, freezeSnake: true }), s = stateOf(sim);
    s.snake = [{ x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 }];
    s.invuln = { leftMs: 5 };
    sim.advance(50);
    expect(s.invuln).toEqual({ leftMs: 0 });
    s.snake[0] = { x: 1, y: 1 };
    sim.drainEvents(); sim.advance(1);
    expect(s.invuln).toBeNull();
    expect(sim.drainEvents()).toContainEqual({ type: 'invulnEnded' });
    expect(sim.snapshot().invuln).toBeNull();
  });
});
