import { describe, expect, it } from 'vitest';
import terrainJson from '../../config/terrain.json';
import { breachCells, checkTemplate, diffLayout, layoutFor, parseTerrain, segmentOf, transform, variantFor, withTerrain } from '../../src/core/fixedTerrain';
import { loadBalance, loadGameBalance } from '../support/balance';

const b = loadBalance();

describe('MEC-019 pure layout', () => {
  it('MEC-019-R1 two segments per biome: 2 levels then 3', () => {
    expect([1, 2, 3, 5, 6, 7, 8, 30].map(n => segmentOf(b, n))).toEqual([
      { biome: 1, segment: 1, index: 0 }, { biome: 1, segment: 1, index: 0 }, { biome: 1, segment: 2, index: 1 },
      { biome: 1, segment: 2, index: 1 }, { biome: 2, segment: 1, index: 2 }, { biome: 2, segment: 1, index: 2 },
      { biome: 2, segment: 2, index: 3 }, { biome: 6, segment: 2, index: 11 }]);
  });
  it('MEC-019-R2 one variant per segment; the challenge level switches to another one', () => {
    for (let seed = 1; seed <= 200; seed++) {
      expect(variantFor(b, 1, seed)).toBe(variantFor(b, 2, seed));
      expect(variantFor(b, 3, seed)).toBe(variantFor(b, 4, seed));
      expect(variantFor(b, 5, seed)).not.toBe(variantFor(b, 4, seed));
    }
    expect(new Set(Array.from({ length: 200 }, (_, i) => variantFor(b, 1, i + 1))).size).toBe(4);
  });
  it('MEC-019-R2 transforms: original, mirror left-right, mirror top-bottom, rotate 180', () => {
    const t = [{ x: 2, y: 3, kind: 'R' as const }];
    expect([0, 1, 2, 3].map(v => transform(t, v as 0 | 1 | 2 | 3, 17, 17)[0])).toEqual([
      { x: 2, y: 3, kind: 'R' }, { x: 14, y: 3, kind: 'R' }, { x: 2, y: 13, kind: 'R' }, { x: 14, y: 13, kind: 'R' }]);
  });
  it('MEC-019-R4 diff keeps shared cells, crumbles old-only cells and warns new-only cells', () => {
    const cur = [{ x: 1, y: 1, tag: 'a' }, { x: 2, y: 1, tag: 'b' }];
    const d = diffLayout(cur, [{ x: 2, y: 1, kind: 'R' }, { x: 3, y: 1, kind: 'F' }]);
    expect(d).toEqual({ keep: [cur[1]], crumble: [cur[0]], warn: [{ x: 3, y: 1, kind: 'F' }] });
  });
  it('MEC-019-R6 breach area is 3 wide and 4 long ahead of the head', () => {
    const cells = breachCells({ x: 5, y: 5 }, { x: 0, y: -1 }, 3, 4);
    expect(cells).toHaveLength(12);
    expect(cells).toContainEqual({ x: 5, y: 4 });
    expect(cells).toContainEqual({ x: 4, y: 1 });
    expect(cells).toContainEqual({ x: 6, y: 1 });
    expect(cells.every(c => c.y >= 1 && c.y <= 4 && c.x >= 4 && c.x <= 6)).toBe(true);
    expect(breachCells({ x: 5, y: 5 }, { x: 1, y: 0 }, 3, 4)).toContainEqual({ x: 9, y: 6 });
  });
});

describe('MEC-019 config/terrain.json', () => {
  const set = parseTerrain(structuredClone(terrainJson), b);
  it('MEC-019-R1 has one template for each of the 12 segments', () => {
    expect(set.templates.map(t => `${t.biome}.${t.segment}`).sort()).toEqual(
      [1, 2, 3, 4, 5, 6].flatMap(n => [`${n}.1`, `${n}.2`]));
  });
  it.each(set.templates.map(t => [t.id, t] as const))('MEC-019-R10..R13/R15/R16 %s is fair in all four variants', (_id, t) => {
    expect(checkTemplate(t, b)).toEqual([]);
  });
  it('MEC-019-R13 the first template is one short row', () => {
    const t = set.templates.find(x => x.id === 'b1s1')!;
    expect(new Set(t.tiles.map(c => c.y)).size).toBe(1);
    expect(t.tiles.length).toBeLessThanOrEqual(b.fixedTerrain.firstMaxCells);
  });
  it('rejects bad files', () => {
    const bad = (edit: (j: any) => void) => { const j = structuredClone(terrainJson) as any; edit(j); return () => parseTerrain(j, b); };
    expect(bad(j => { j.templates.pop(); })).toThrow(/segment/);
    expect(bad(j => { j.templates[0].rows[0] = '...'; })).toThrow(/17/);
    expect(bad(j => { j.templates[0].rows[8] = '.....RRRR........'; })).toThrow(/R12/);
    expect(bad(j => { j.templates[0].rows[0] = 'R................'; })).toThrow(/R15/);
    expect(bad(j => { j.templates[0].rows[4] = '......RRxRR......'; })).toThrow(/character/);
  });
  it('withTerrain attaches the set; layoutFor returns the transformed tiles and the name', () => {
    const g = loadGameBalance();
    expect(b.terrainSet).toBeUndefined();
    const seed = Array.from({ length: 500 }, (_, i) => i + 1).find(s => variantFor(g, 1, s) === 0)!;
    const l = layoutFor(g.terrainSet!, g, 1, seed);
    expect(l).toMatchObject({ templateId: 'b1s1', name: 'Orchard Row', variant: 0 });
    expect(l.tiles.map(c => [c.x, c.y])).toEqual([[6, 4], [7, 4], [8, 4], [9, 4], [10, 4]]);
    expect(withTerrain(b, structuredClone(terrainJson)).terrainSet!.templates).toHaveLength(12);
  });
});
