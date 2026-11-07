import { expect, it } from 'vitest';
import { bangGeometry, chevronPoints, cubic, hedgeRects, HEDGE, mangoLeaf, MANGO, PART, rockMetrics, ROCK, WARN_SHAPES } from '../../src/game/render/boardParts';
import { toInt } from '../../src/game/uiTokens';

it('P3b1-R2 part colours match the mockup HTML', () => {
  expect(PART.rock).toEqual({ fill: toInt('#9AA3B8'), shade: toInt('#6B7490') });
  expect(PART.wood).toEqual({ rail: toInt('#E3AC6D'), post: toInt('#CF9150') });
  expect(PART.mud).toEqual({ fill: toInt('#B8956A'), puddle: toInt('#8F6F43') });
  expect(PART.stone).toEqual({ top: toInt('#EDEFF4'), front: toInt('#A9B0C0'), warnFill: toInt('#D3D7E0'), warnDash: toInt('#FF9A1F'), chevron: toInt('#B35F00') });
  expect(PART.hedge).toEqual({ fill: toInt('#4FBF7A'), edge: toInt('#FFFFFF'), glow: toInt('#7CF2D4') });
  expect(PART.warn).toEqual({ fill: toInt('#FF6B5B'), dash: toInt('#E5483A'), bang: toInt('#B3261E') });
  expect(PART.mango).toEqual({ body: toInt('#FFA21A'), leaf: toInt('#2E9E4F'), hi: toInt('#FFD27A') });
});

it('P3b1-R2 rock sizes follow Rock.dc: pebble < rock < boulder, edge is a tenth of the cell', () => {
  const [p, r, b] = (['pebble', 'rock', 'boulder'] as const).map(k => rockMetrics(k, 30));
  expect(p!.d).toBeCloseTo(15); expect(r!.d).toBeCloseTo(24.6); expect(b!.d).toBeCloseTo(29.4);
  expect(r!.edge).toBeCloseTo(3);
  expect(r!.h).toBeCloseTo(r!.d * ROCK.aspect);
  expect(r!.hl.w).toBeCloseTo(r!.d * 0.3);
  expect(r!.hl.dx).toBeLessThan(0); expect(r!.hl.dy).toBeLessThan(0);
});

it('P3b1-R2 every warning kind has its own shape id (never colour-only)', () => {
  expect(WARN_SHAPES).toEqual({ hazard: 'bang', rise: 'chevron', mud: 'drop', ice: 'snowflake' });
  expect(new Set(Object.values(WARN_SHAPES)).size).toBe(4);
});

it('P3b1-R2 the bang glyph is centred and the chevron points up', () => {
  const g = bangGeometry(30);
  expect(g.bar.x + g.bar.w / 2).toBeCloseTo(15);
  expect(g.dot.y).toBeGreaterThan(g.bar.y + g.bar.h);
  const [a, apex, c] = chevronPoints(20);
  expect(apex).toEqual([10, 6]); expect(a).toEqual([4, 12]); expect(c).toEqual([16, 12]);
});

it('P3b1-R2 hedge bars join neighbours to the right and below', () => {
  const rects = hedgeRects([{ x: 1, y: 1, k: 1 }, { x: 2, y: 1, k: 1 }, { x: 2, y: 2, k: 1 }], 20);
  expect(rects).toHaveLength(3 + 2);                       // 3 cell bars + 2 connectors
  expect(hedgeRects([{ x: 0, y: 0, k: 1 }], 20)).toHaveLength(1);
  const solo = hedgeRects([{ x: 0, y: 0, k: 1 }], 20)[0]!;
  expect(solo.w).toBeCloseTo(20 * HEDGE.bar);              // BiomeBoardsD2 hedge bars are 16 px in a 20 px cell
});

it('P3b1-R2 cubic hits both end points and the mango leaf stays inside the 32 box', () => {
  const pts = cubic([0, 0], [1, 2], [3, 2], [4, 0], 4);
  expect(pts).toHaveLength(5); expect(pts[0]).toEqual([0, 0]); expect(pts[4]).toEqual([4, 0]);
  const leaf = mangoLeaf();
  expect(leaf[0]).toEqual([16, 9]);
  for (const [x, y] of leaf) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(MANGO.box); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(MANGO.box); }
});
