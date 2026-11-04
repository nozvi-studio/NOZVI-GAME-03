import { instanceFamily } from '../support/instanceFamily';
import { describe, it, expect } from 'vitest';
import type { SimEvent } from '../../src/core/types';
import { makeTimed } from '../../src/core/hazards/timed';
import { rubbleFamily } from '../../src/core/hazards/rubble';
import { exportState } from '../../src/core/sim';
import { circle, simFromAscii, SQUARE, testCtx } from '../../src/core/testing';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const opts = { startLevel: 16, bestLevel: 16, startEnergy: 100, loadout: ['shield', 'mangoRain'] as const };
const SNAKE: [number, number][] = [[2, 0], [1, 0], [0, 0], [0, 1]];
const shieldSim = (row: string, extraState = {}) => simFromAscii(b, [row], { snake: SNAKE, quiet: true, options: opts, extraState });
const broke = (ev: SimEvent[]) => ev.find(e => e.type === 'shieldBroke') as Extract<SimEvent, { type: 'shieldBroke' }> | undefined;
const died = (ev: SimEvent[]) => ev.find(e => e.type === 'died');

describe('MEC-006 Shield', () => {
  it('MEC-006-R26 shield breaks a rock, is consumed and leaves rubble beyond', () => {
    const sim = shieldSim('...#..');
    sim.useSkill(0); sim.drainEvents();
    sim.advance(140);
    expect(sim.drainEvents()).toEqual([
      { type: 'skillEnded', skill: 'shield', reason: 'consumed' },
      { type: 'shieldBroke', x: 3, y: 0, family: 'rock', rubble: { x: 4, y: 0 } }]);
    expect(sim.snapshot()).toMatchObject({ status: 'playing', shield: null, rubble: [{ x: 4, y: 0, state: 'solid', leftMs: 1500 }] });
    expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 0 });
    expect(sim.snapshot().hazards).toEqual([]);
  });
  it('MEC-006-R27 next step 4 ticks after the break', () => {
    const sim = shieldSim('...#....');
    sim.useSkill(0);
    sim.advance(140); sim.drainEvents();
    sim.turn(0, 1);           // queued during the bonk so the snake avoids the rubble
    sim.advance(4 * 140 - 1); expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 0 });
    sim.advance(1);           expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 1 });
  });
  it('MEC-006-R24 shield breaks fence, terrain up cell, maze hedge, rotten rock and snip wall; never rubble', () => {
    const maze = makeTimed('maze', [{ x: 3, y: 0 }], 1, 600000);
    maze.state = 'solid'; maze.landed = true; maze.cells[0]!.on = true;
    const tr = b.terrain, upAt = tr.startDelayMs + tr.periodMs - tr.upMs;
    const terrain = { family: 'terrain' as const, t: upAt, lifeMs: 600000, cells: [{ x: 3, y: 0, delay: 0, up: true, vis: 'up' as const }] };
    const cases: [string, object, string][] = [
      ['...F', {}, 'fence'], ['....', { families: { terrain: [terrain] } }, 'terrain'], ['....', { families: { maze: [maze] } }, 'maze'],
      ['...R', {}, 'rottenRock'], ['...S', {}, 'snipWall']];
    for (const [row, extra, family] of cases) {
      const sim = shieldSim(row, extra); sim.useSkill(0); sim.drainEvents(); sim.advance(140);
      const ev = sim.drainEvents();
      expect(broke(ev)?.family, family).toBe(family);
      expect(sim.snapshot().status).toBe('playing');
    }
    // MEC-006-EC8 rubble from an earlier shield kills even with an active shield
    const sim = shieldSim('...u'); sim.useSkill(0); sim.advance(140);
    expect(died(sim.drainEvents())).toMatchObject({ cause: 'rubble' });
  });
  it('MEC-006-R25 shield never saves from wall or self; warning cells do not consume it', () => {
    const edge = simFromAscii(b, [], { snake: [[16, 0], [15, 0], [14, 0], [13, 0]], quiet: true, options: opts });
    edge.useSkill(0); edge.advance(140);
    expect(died(edge.drainEvents())).toMatchObject({ cause: 'wall' });
    const self = simFromAscii(b, [], { snake: [[1, 1], [1, 0], [0, 0], [0, 1], [0, 2]], dir: [-1, 0], quiet: true, options: opts });
    self.useSkill(0); self.advance(140);
    expect(died(self.drainEvents())).toMatchObject({ cause: 'self' });
    const warn = shieldSim('...w'); warn.useSkill(0); warn.advance(140);
    expect(warn.snapshot()).toMatchObject({ status: 'playing', shield: { leftMs: 5000 - 140 } });
    expect(warn.snapshot().snake[0]).toEqual({ x: 3, y: 0 });
  });
  it('MEC-006-R26 shield breaks each breakable family once and is consumed', () => {
    const sim = shieldSim('...##...'); sim.useSkill(0);
    sim.advance(140);
    expect(broke(sim.drainEvents())).toMatchObject({ x: 3, rubble: null });
    sim.advance(4 * 140);
    expect(died(sim.drainEvents())).toMatchObject({ cause: 'rock' });
  });
  it('MEC-006-R28 rubble beyond the broken cell; skipped on reserved or out-of-bounds cells; kills with cause rubble', () => {
    const mango = shieldSim('...#M'); mango.useSkill(0); mango.advance(140);   // MEC-006-EC9
    expect(broke(mango.drainEvents())).toMatchObject({ rubble: null });
    expect(mango.snapshot().mango).toMatchObject({ x: 4, y: 0 });
    const edge = simFromAscii(b, ['................#'], { snake: [[15, 0], [14, 0], [13, 0], [12, 0]], quiet: true, options: opts });
    edge.useSkill(0); edge.advance(140);                                         // MEC-006-EC10
    expect(broke(edge.drainEvents())).toMatchObject({ x: 16, rubble: null });
    expect(edge.snapshot().rubble).toEqual([]);
    const s = exportState(shieldSim('....'));
    const r = { family: 'rubble' as const, x: 5, y: 5, state: 'solid' as const, leftMs: b.skills.shield.rubbleLifeMs };
    const ctx = testCtx(b, s);
    for (let t = 1; t < 1500; t++) instanceFamily(rubbleFamily).update(r, ctx);
    expect(r.state).toBe('solid');
    expect(instanceFamily(rubbleFamily).solidAt(r, 5, 5)).toBe(true);
    instanceFamily(rubbleFamily).update(r, ctx);
    expect(r).toMatchObject({ state: 'crumble', leftMs: 450 });
    expect(instanceFamily(rubbleFamily).solidAt(r, 5, 5)).toBe(false);
    expect(instanceFamily(rubbleFamily).reservedAt(r, 5, 5) && instanceFamily(rubbleFamily).bfsWallAt(r, 5, 5)).toBe(true);
    for (let t = 1; t < 450; t++) expect(instanceFamily(rubbleFamily).update(r, ctx)).toBe('keep');
    expect(instanceFamily(rubbleFamily).update(r, ctx)).toBe('remove');
  });
  it('MEC-006-R16 shield ends with skillEnded timeout after 5000 ms with no hit', () => {
    const sim = simFromAscii(b, [], { snake: SQUARE, dir: [0, 1], quiet: true, options: opts });
    sim.useSkill(0); sim.drainEvents();
    circle(sim, 4999);
    expect(sim.snapshot().shield).toEqual({ leftMs: 1 });
    expect(sim.drainEvents().some(e => e.type === 'skillEnded')).toBe(false);
    circle(sim, 1);
    expect(sim.snapshot().shield).toBeNull();
    expect(sim.drainEvents()).toContainEqual({ type: 'skillEnded', skill: 'shield', reason: 'timeout' });
  });
});
