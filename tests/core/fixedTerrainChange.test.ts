import { describe, expect, it } from 'vitest';
import { layoutFor, variantFor } from '../../src/core/fixedTerrain';
import { createSimInternal, stateOf } from '../../src/core/simInternal';
import { loadBalance, loadGameBalance } from '../support/balance';

const g = loadGameBalance();
const frozen = (level: number, seed: number) => createSimInternal(g, seed, { startLevel: level }, { directorEnabled: false, freezeSnake: true });
const cellsOf = (s: ReturnType<typeof stateOf>, state: string) => s.families.fixedTerrain.cells.filter(c => c.state === state);

describe('MEC-019-R4 terrain change at a level up', () => {
  it('a new segment crumbles old-only cells and warns new-only cells, then they turn solid', () => {
    const sim = frozen(2, 11), s = stateOf(sim), next = layoutFor(g.terrainSet!, g, 3, 11);
    const old = s.families.fixedTerrain.cells.map(c => ({ x: c.x, y: c.y }));
    sim.drainEvents();
    expect(sim.debugSkipTo(3)).toBe(true);
    expect(sim.drainEvents()).toContainEqual({ type: 'terrainChanged', templateId: 'b1s2', name: 'Twin Stones', variant: next.variant, newTemplate: true });
    const shared = old.filter(o => next.tiles.some(n => n.x === o.x && n.y === o.y)).length;
    expect(cellsOf(s, 'crumble')).toHaveLength(old.length - shared);
    expect(cellsOf(s, 'warn')).toHaveLength(next.tiles.length - shared);
    expect(cellsOf(s, 'warn').every(c => c.leftMs === g.fixedTerrain.warnMs)).toBe(true);
    sim.advance(g.hazard.crumbleMs);
    expect(cellsOf(s, 'crumble')).toHaveLength(0);
    sim.advance(g.fixedTerrain.warnMs - g.hazard.crumbleMs);
    expect(cellsOf(s, 'solid')).toHaveLength(next.tiles.length);
  });
  it('the second level of segment 1 keeps the terrain and emits nothing', () => {
    const sim = frozen(1, 11), s = stateOf(sim), before = structuredClone(s.families.fixedTerrain);
    sim.drainEvents(); sim.debugSkipTo(2);
    expect(s.families.fixedTerrain).toEqual(before);
    expect(sim.drainEvents().some(e => e.type === 'terrainChanged')).toBe(false);
  });
  it('MEC-019-R2 the challenge level switches the variant of the same template', () => {
    const sim = frozen(4, 11), s = stateOf(sim);
    sim.drainEvents(); sim.debugSkipTo(5);
    expect(sim.drainEvents()).toContainEqual(expect.objectContaining({ type: 'terrainChanged', templateId: 'b1s2', newTemplate: false, variant: variantFor(g, 5, 11) }));
    expect(s.families.fixedTerrain.variant).toBe(variantFor(g, 5, 11));
  });
  it('a warning cell under the snake stays warning until the snake leaves', () => {
    const sim = frozen(2, 11), s = stateOf(sim);
    sim.debugSkipTo(3);
    const w = cellsOf(s, 'warn')[0]!;
    s.snake = [{ x: w.x, y: w.y }, { x: 1, y: 15 }, { x: 1, y: 16 }];
    sim.advance(g.fixedTerrain.warnMs + 500);
    expect(cellsOf(s, 'warn').some(c => c.x === w.x && c.y === w.y)).toBe(true);
    s.snake[0] = { x: 1, y: 14 };
    sim.advance(1);
    expect(cellsOf(s, 'solid').some(c => c.x === w.x && c.y === w.y)).toBe(true);
  });
  it('FT-7 a warning cell waits while another family reserves it', () => {
    const sim = frozen(2, 11), s = stateOf(sim);
    sim.debugSkipTo(3);
    const w = cellsOf(s, 'warn')[0]!;
    s.families.rottenRock.push({ family: 'rottenRock', x: w.x, y: w.y, state: 'solid', leftMs: g.fixedTerrain.warnMs + 300 });
    sim.advance(g.fixedTerrain.warnMs + 100);
    expect(cellsOf(s, 'warn').some(c => c.x === w.x && c.y === w.y)).toBe(true);
    sim.advance(200 + g.hazard.crumbleMs + 1);
    expect(cellsOf(s, 'solid').some(c => c.x === w.x && c.y === w.y)).toBe(true);
  });
  it('FT-7 orbs and rain mangoes on new cells expire and the mango moves', () => {
    const sim = frozen(2, 11), s = stateOf(sim), next = layoutFor(g.terrainSet!, g, 3, 11);
    const fresh = next.tiles.filter(n => !s.families.fixedTerrain.cells.some(c => c.x === n.x && c.y === n.y));
    s.orbs.push({ x: fresh[0]!.x, y: fresh[0]!.y, ageMs: 0 });
    s.rainMangoes.push({ x: fresh[1]!.x, y: fresh[1]!.y, ageMs: 0, castId: 1 });
    s.mango = { ...s.mango!, x: fresh[2]!.x, y: fresh[2]!.y };
    sim.drainEvents(); sim.debugSkipTo(3);
    const ev = sim.drainEvents();
    expect(s.orbs).toHaveLength(0);
    expect(s.rainMangoes).toHaveLength(0);
    expect(ev.map(e => e.type)).toEqual(expect.arrayContaining(['orbExpired', 'rainMangoExpired', 'mangoDisplaced']));
    expect(next.tiles.some(n => n.x === s.mango!.x && n.y === s.mango!.y)).toBe(false);
  });
  it('without a terrain set a level up emits no terrain event', () => {
    const sim = createSimInternal(loadBalance(), 1, { startLevel: 2 }, { directorEnabled: false, freezeSnake: true });
    sim.drainEvents(); sim.debugSkipTo(3);
    expect(sim.drainEvents().some(e => e.type === 'terrainChanged')).toBe(false);
  });
});
