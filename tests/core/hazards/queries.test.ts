import { describe, it, expect } from 'vitest';
import { solidCauseAt, solidFamilyAt, solidFamilyWithPriority, reservedByFamilies, bfsWall, tileAt, headHitAt } from '../../../src/core/hazards/queries';
import { FAMILIES } from '../../../src/core/hazards/registry';
import { cellBfsWall } from '../../../src/core/cells';
import { key, reachable } from '../../../src/core/grid';
import { buildBoard } from '../../support/board';
import { fakeFamily, withFamilies } from '../../support/fakeFamily';

describe('MEC-004 queries', () => {
  it('MEC-002-R7 collision priority prefers solid rotten rocks without changing registry-order queries', () => {
    const s = buildBoard({ walls: [[3, 3], [4, 4]] });
    s.families.rottenRock.push({ family: 'rottenRock', x: 3, y: 3, state: 'solid', leftMs: 5000 });
    expect(solidFamilyWithPriority(s, 3, 3)?.key).toBe('rottenRock');
    expect(solidFamilyAt(s, 3, 3)?.key).toBe('rock');
    expect(solidFamilyWithPriority(s, 4, 4)?.key).toBe('rock');
    expect(solidFamilyWithPriority(s, 5, 5)).toBeNull();
    s.families.rottenRock[0]!.state = 'crumble';
    expect(solidFamilyWithPriority(s, 3, 3)?.key).toBe('rock');
  });
  it('MEC-004-R1 registry order is rock fence maze terrain rottenRock snipWall rubble mud ice coconut gate spike npc bird bomb', () => {
    expect(FAMILIES.map(f => f.key)).toEqual(['rock', 'fence', 'maze', 'terrain', 'rottenRock', 'snipWall', 'rubble', 'mud', 'ice', 'coconut', 'gate', 'spike', 'npc', 'bird', 'bomb']);
  });
  it('MEC-004-R3 solidCauseAt returns the first family cause in registry order', () => {
    const a = fakeFamily({ key: 'rock', cause: 'rock', solid: [[3, 3]] });
    const b = fakeFamily({ key: 'fence', cause: 'fence', solid: [[3, 3], [4, 4]] });
    const s = buildBoard({});
    expect(solidCauseAt(s, 3, 3, [a, b])).toBe('rock');
    expect(solidFamilyAt(s, 3, 3, [a, b])).toBe(a);
    expect(solidCauseAt(s, 4, 4, [a, b])).toBe('fence');
    expect(solidCauseAt(s, 5, 5, [a, b])).toBeNull();
  });
  it('MEC-004-R3 solidCauseAt prefers a family causeAt over its cause', () => {
    const f = { ...fakeFamily({ key: 'gate', cause: 'gate', solid: [[3, 3], [4, 3]] }),
      causeAt: (_s: unknown, x: number): 'fence' | 'gate' => x === 3 ? 'fence' : 'gate' };
    const s = buildBoard({});
    expect(solidCauseAt(s, 3, 3, [f])).toBe('fence');
    expect(solidCauseAt(s, 4, 3, [f])).toBe('gate');
  });
  it('MEC-004-R3 null causeAt falls back to the selected family cause without consulting later families', () => {
    const f = { ...fakeFamily({ key: 'gate', cause: 'gate', solid: [[3, 3]] }), causeAt: () => null };
    const later = fakeFamily({ key: 'fence', cause: 'fence', solid: [[3, 3]] });
    const s = buildBoard({});
    expect(solidCauseAt(s, 3, 3, [f, later])).toBe('gate');
    expect(solidCauseAt(s, 4, 3, [f, later])).toBeNull();
  });
  it('MEC-004-R3 tileAt and headHitAt return the first non-null family answer', () => {
    const t = fakeFamily({ key: 'rock', tile: { kind: 'mud', cells: [[2, 2]] }, hit: { kind: 'area', cells: [[6, 6]] } });
    const s = buildBoard({});
    expect(tileAt(s, 2, 2, [t])).toBe('mud');
    expect(headHitAt(s, 6, 6, [t])?.kind).toBe('area');
    expect(headHitAt(s, 2, 2, [t])).toBeNull();
    const second = fakeFamily({ key: 'fence', tile: { kind: 'ice', cells: [[2, 2]] }, hit: { kind: 'mover', cells: [[6, 6]] } });
    const empty = fakeFamily({ key: 'maze' });
    expect(tileAt(s, 2, 2, [empty, t, second])).toBe('mud');
    expect(headHitAt(s, 6, 6, [empty, t, second])).toEqual({ family: t, kind: 'area' });
    expect(tileAt(s, 0, 0, [empty, t])).toBeNull();
  });
  it('MEC-004-R3 reservedByFamilies is true if any family reserves the cell', () => {
    const a = fakeFamily({ key: 'rock', reserved: [[1, 1]] });
    const b = fakeFamily({ key: 'fence', reserved: [[2, 2]] });
    const s = buildBoard({});
    expect(reservedByFamilies(s, 1, 1, [a, b])).toBe(true);
    expect(reservedByFamilies(s, 2, 2, [a, b])).toBe(true);
    expect(reservedByFamilies(s, 3, 3, [a, b])).toBe(false);
  });
  it('MEC-004-R3 bfsWall is true if any family bfsWallAt is true', () => {
    const a = fakeFamily({ key: 'rock', wall: [[1, 1]] });
    const b = fakeFamily({ key: 'fence', wall: [[2, 2]] });
    const s = buildBoard({});
    expect(bfsWall(s, 1, 1, [a, b])).toBe(true);
    expect(bfsWall(s, 2, 2, [a, b])).toBe(true);
    expect(bfsWall(s, 3, 3, [a, b])).toBe(false);
  });
  it('MEC-004-R4 BFS walls come from bfsWall and the body without its tail', () => {
    const s = buildBoard({ head: [2, 2], body: [[1, 2], [0, 2]] });
    withFamilies(s, [{ key: 'rock', wall: Array.from({ length: 17 }, (_, y) => [4, y]) }], () => {
      const seen = reachable(17, 17, s.snake[0]!, (x, y) => cellBfsWall(s, x, y));
      expect(seen.has(key(17, 3, 8))).toBe(true);
      expect(seen.has(key(17, 5, 8))).toBe(false);
      expect(seen.has(key(17, 0, 2))).toBe(true);
      expect(seen.has(key(17, 1, 2))).toBe(false);
    });
  });
  it('MEC-004-R16 no family has a level-end hook', () => {
    expect(FAMILIES.every(f => !('onLevelEnd' in f))).toBe(true);
  });
  it('MEC-006-R24 shield breakable list equals families with breakable true', () => {
    expect(FAMILIES.filter(f => f.breakable).map(f => f.key)).toEqual(['rock', 'fence', 'maze', 'terrain', 'rottenRock', 'snipWall', 'coconut', 'gate', 'spike', 'npc', 'bomb']);
  });
});
