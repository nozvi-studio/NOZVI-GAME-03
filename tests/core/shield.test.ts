import { instanceFamily } from '../support/instanceFamily';
import { describe, it, expect } from 'vitest';
import type { SimEvent } from '../../src/core/types';
import { makeTimed } from '../../src/core/hazards/timed';
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
  it('MEC-006-R26 shield breaks a rock, is consumed and leaves no debris (owner 2026-11-06)', () => {
    const sim = shieldSim('...#..');
    sim.useSkill(0); sim.drainEvents();
    sim.advance(140);
    expect(sim.drainEvents()).toEqual([
      { type: 'skillEnded', skill: 'shield', reason: 'consumed' },
      { type: 'shieldBroke', x: 3, y: 0, family: 'rock' }]);
    expect(sim.snapshot()).toMatchObject({ status: 'playing', shield: null });
    expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 0 });
    expect(sim.snapshot().hazards).toEqual([]);
  });
  it('MEC-006-R27 next step 4 ticks after the break', () => {
    const sim = shieldSim('...#....');
    sim.useSkill(0);
    sim.advance(140); sim.drainEvents();
    sim.turn(0, 1);           // queued during the bonk pause
    sim.advance(4 * 140 - 1); expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 0 });
    sim.advance(1);           expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 1 });
  });
  it('MEC-006-R24 shield breaks fence, terrain up cell, maze hedge, rotten rock and snip wall', () => {
    const maze = makeTimed('maze', [{ x: 3, y: 0 }], 1, 600000);
    maze.spawnSeq = 0; // This fixture supplies the only timed instance directly through extraState.
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
    expect(broke(sim.drainEvents())).toMatchObject({ x: 3 });
    sim.advance(4 * 140);
    expect(died(sim.drainEvents())).toMatchObject({ cause: 'rock' });
  });
  it('MEC-006-R28 a break leaves nothing behind (mango beyond stays, edge) (owner 2026-11-06)', () => {
    const mango = shieldSim('...#M'); mango.useSkill(0); mango.advance(140);   // MEC-006-EC9
    expect(broke(mango.drainEvents())).toMatchObject({ family: 'rock' });
    expect(mango.snapshot().mango).toMatchObject({ x: 4, y: 0 });
    const edge = simFromAscii(b, ['................#'], { snake: [[15, 0], [14, 0], [13, 0], [12, 0]], quiet: true, options: opts });
    edge.useSkill(0); edge.advance(140);                                         // MEC-006-EC10
    expect(broke(edge.drainEvents())).toMatchObject({ x: 16 });
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
