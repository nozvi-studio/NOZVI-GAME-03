// src/core/fixedTerrain.ts - MEC-019 pure layout rules: segments, variants, transforms, diff, breach area, template checks.
import type { Balance } from './balance';
import { inBounds, key, reachable } from './grid';
import { biome, familyRow, isChallenge } from './level';
import type { Cell, Dir } from './types';

export type TerrainKind = 'R' | 'F';
export interface TerrainTile { x: number; y: number; kind: TerrainKind }
export interface TerrainTemplate { id: string; biome: number; segment: 1 | 2; name: string; tiles: TerrainTile[] }
export interface TerrainSet { templates: TerrainTemplate[] }
export type Variant = 0 | 1 | 2 | 3;
export interface TerrainLayout { templateId: string; name: string; variant: Variant; tiles: TerrainTile[] }
const VARIANTS: readonly Variant[] = [0, 1, 2, 3];
const CHALLENGE_SALT = 1000;

// MEC-019-R1 segment 1 = the first `firstSegmentLevels` levels of a biome, segment 2 = the rest.
export function segmentOf(b: Balance, level: number): { biome: number; segment: 1 | 2; index: number } {
  const bi = biome(b, level), pos = (level - 1) % b.level.perBiome + 1;
  const segment = pos <= b.fixedTerrain.firstSegmentLevels ? 1 : 2;
  return { biome: bi, segment, index: (bi - 1) * 2 + segment - 1 };
}

// FT-3 a seed hash, independent of the sim RNG stream.
function mix(seed: number, salt: number): number {
  let h = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// MEC-019-R2 one variant per segment from the run seed; the challenge level of segment 2 takes a different one.
export function variantFor(b: Balance, level: number, seed: number): Variant {
  const seg = segmentOf(b, level), base = mix(seed, seg.index) % 4;
  if (seg.segment === 2 && isChallenge(b, level)) return ((base + 1 + mix(seed, seg.index + CHALLENGE_SALT) % 3) % 4) as Variant;
  return base as Variant;
}

// MEC-019-R2 0 original, 1 mirror left-right, 2 mirror top-bottom, 3 rotate 180.
export function transform(tiles: readonly TerrainTile[], v: Variant, cols: number, rows: number): TerrainTile[] {
  return tiles.map(c => ({ x: v & 1 ? cols - 1 - c.x : c.x, y: v & 2 ? rows - 1 - c.y : c.y, kind: c.kind }));
}

export function layoutFor(set: TerrainSet, b: Balance, level: number, seed: number): TerrainLayout {
  const seg = segmentOf(b, level), t = set.templates.find(x => x.biome === seg.biome && x.segment === seg.segment);
  if (!t) throw new Error(`layoutFor: no terrain template for biome ${seg.biome} segment ${seg.segment}`);
  const variant = variantFor(b, level, seed);
  return { templateId: t.id, name: t.name, variant, tiles: transform(t.tiles, variant, b.board.cols, b.board.rows) };
}

// MEC-019-R4 shared cells stay, old-only cells crumble, new-only cells warn.
export function diffLayout<T extends Cell>(current: readonly T[], next: readonly TerrainTile[]): { keep: T[]; crumble: T[]; warn: TerrainTile[] } {
  const at = (list: readonly Cell[], c: Cell) => list.some(o => o.x === c.x && o.y === c.y);
  return { keep: current.filter(c => at(next, c)), crumble: current.filter(c => !at(next, c)), warn: next.filter(c => !at(current, c)) };
}

// MEC-019-R6 `len` rows ahead of the head, `w` wide, centred on the head column (w is odd).
export function breachCells(head: Cell, dir: Dir, w: number, len: number): Cell[] {
  const out: Cell[] = [], half = (w - 1) / 2;
  for (let i = 1; i <= len; i++) for (let j = -half; j <= half; j++)
    out.push({ x: head.x + dir.x * i + dir.y * j, y: head.y + dir.y * i + dir.x * j });
  return out;
}

const levelsOf = (b: Balance, t: TerrainTemplate): number[] =>
  Array.from({ length: b.level.maxLevel }, (_, i) => i + 1).filter(n => { const s = segmentOf(b, n); return s.biome === t.biome && s.segment === t.segment; });

// MEC-019-R10..R13, R15, R16 fairness of one template in all four variants; an empty list means fair.
export function checkTemplate(t: TerrainTemplate, b: Balance): string[] {
  const { cols, rows } = b.board, ft = b.fixedTerrain, out: string[] = [];
  const max = Math.floor(cols * rows * ft.maxFraction);
  if (t.tiles.length > max) out.push(`${t.id}: ${t.tiles.length} tiles > ${max} (R13)`);
  if (t.biome === 1 && t.segment === 1 && t.tiles.length > ft.firstMaxCells) out.push(`${t.id}: more than ${ft.firstMaxCells} tiles (R13)`);
  const needsLanes = levelsOf(b, t).some(n => (familyRow(b, n).weights.coconut ?? 0) > 0);
  const start = b.snake.start.map(([x, y]) => ({ x, y })), [dx, dy] = b.snake.startDir, head = start[0]!;
  const lane = [...start, ...Array.from({ length: ft.startAhead }, (_, i) => ({ x: head.x + dx * (i + 1), y: head.y + dy * (i + 1) }))];
  for (const v of VARIANTS) {
    const tiles = transform(t.tiles, v, cols, rows), wall = new Set(tiles.map(c => key(cols, c.x, c.y))), tag = `${t.id} v${v}`;
    const free = (x: number, y: number) => inBounds(cols, rows, x, y) && !wall.has(key(cols, x, y));
    if (tiles.some(c => c.x === 0 || c.y === 0 || c.x === cols - 1 || c.y === rows - 1)) out.push(`${tag}: tile on the outer ring (R15)`);
    if (lane.some(c => !free(c.x, c.y))) { out.push(`${tag}: start cells or the cells ahead are blocked (R12)`); continue; }
    if (reachable(cols, rows, head, (x, y) => wall.has(key(cols, x, y))).size !== cols * rows - wall.size) out.push(`${tag}: free cells are not one region (R10)`);
    const inBlock = (x: number, y: number) => [[0, 0], [-1, 0], [0, -1], [-1, -1]].some(([ox, oy]) =>
      free(x + ox!, y + oy!) && free(x + ox! + 1, y + oy!) && free(x + ox!, y + oy! + 1) && free(x + ox! + 1, y + oy! + 1));
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
      if (free(x, y) && !inBlock(x, y)) out.push(`${tag}: cell ${x},${y} is in a corridor 1 cell wide (R11)`);
    if (needsLanes) {
      const freeRows = Array.from({ length: rows }, (_, y) => y).filter(y => !tiles.some(c => c.y === y)).length;
      const freeCols = Array.from({ length: cols }, (_, x) => x).filter(x => !tiles.some(c => c.x === x)).length;
      if (freeRows + freeCols < ft.minFreeLanes) out.push(`${tag}: only ${freeRows + freeCols} free lanes (R16)`);
    }
  }
  return out;
}

// MEC-019 section 4: validate config/terrain.json against the balance; throws with every problem listed.
export function parseTerrain(json: unknown, b: Balance): TerrainSet {
  const fail = (m: string): never => { throw new Error('terrain.json: ' + m); };
  const list = (json as { templates?: unknown })?.templates;
  if (!Array.isArray(list)) return fail('templates must be an array');
  const templates: TerrainTemplate[] = list.map((raw, i) => {
    const t = raw as { id?: unknown; biome?: unknown; segment?: unknown; name?: unknown; rows?: unknown };
    if (typeof t.id !== 'string' || !t.id) fail(`templates[${i}].id must be a string`);
    if (typeof t.name !== 'string' || !t.name) fail(`${t.id}: name must be a string`);
    if (!Number.isInteger(t.biome) || t.segment !== 1 && t.segment !== 2) fail(`${t.id}: biome must be an integer and segment 1 or 2`);
    if (!Array.isArray(t.rows) || t.rows.length !== b.board.rows) fail(`${t.id}: rows must have ${b.board.rows} entries`);
    const tiles: TerrainTile[] = [];
    (t.rows as unknown[]).forEach((row, y) => {
      if (typeof row !== 'string' || row.length !== b.board.cols) fail(`${t.id}: row ${y} must have ${b.board.cols} characters`);
      [...(row as string)].forEach((ch, x) => {
        if (ch === 'R' || ch === 'F') tiles.push({ x, y, kind: ch });
        else if (ch !== '.') fail(`${t.id}: bad character '${ch}' at ${x},${y}`);
      });
    });
    return { id: t.id as string, biome: t.biome as number, segment: t.segment as 1 | 2, name: t.name as string, tiles };
  });
  if (!Number.isInteger(b.level.maxLevel) || !Number.isInteger(b.level.perBiome) || b.level.perBiome <= 0 || b.level.maxLevel % b.level.perBiome !== 0)
    fail('level.maxLevel and level.perBiome must be integers and maxLevel a multiple of perBiome');
  const biomes = b.level.maxLevel / b.level.perBiome;
  for (let bi = 1; bi <= biomes; bi++) for (const seg of [1, 2])
    if (templates.filter(t => t.biome === bi && t.segment === seg).length !== 1) fail(`biome ${bi} segment ${seg} needs exactly one template`);
  if (templates.length !== biomes * 2) fail('a template has no matching segment');
  const problems = templates.flatMap(t => checkTemplate(t, b));
  if (problems.length) fail(problems.join('; '));
  return { templates };
}

export const withTerrain = (b: Balance, json: unknown): Balance => ({ ...b, terrainSet: parseTerrain(json, b) });
