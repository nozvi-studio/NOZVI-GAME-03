# Fixed Terrain (MEC-019) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hand-drawn fixed terrain (rock rows and fences) to the main 30-level run: one template per level segment, four symmetry variants, a warn/crumble change at level ups, Shield breach plus a short invulnerability.

**Architecture:** A pure layout module (`src/core/fixedTerrain.ts`) owns segments, variants, transforms, diffs, the breach area, parsing and fairness checks of `config/terrain.json`. A new hazard family `fixedTerrain` (`src/core/hazards/fixedTerrain.ts`) holds the live cells in `SimState.families.fixedTerrain`, so the existing registry queries give collision, BFS walls, director exclusion and mango exclusion for free. The parsed template set travels on the balance object (`balance.terrainSet`, optional): a balance without it runs exactly as today, so the existing tests are untouched.

**Tech Stack:** TypeScript strict, Vitest, Phaser 3 (render only). No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-11-fixed-terrain-design.md` (TER-R1..R14). Owner confirmed 2026-11-16 that this is the feature to build now (before U7).

## Global Constraints

- English only in every file (AGENTS §0). Conventional Commits. Branch `feat/fixed-terrain` from `version/v0.3`; merge back with `git merge --no-ff` after `npm test` and `npm run typecheck` pass.
- `src/core/` stays pure: no Phaser import. No magic numbers: every number comes from `config/balance.json`.
- While working run only the touched tests: `npx vitest run <path> --configLoader native --pool threads --maxWorkers 2`. Full suite only before a commit that ends a task: `npm test` then `npm run typecheck` (if the host is loaded add `-- --maxWorkers 1`).
- Requirement IDs: use `MEC-019-R<n>` (same numbers as `TER-R<n>` in the spec) in test names and in a one-line comment at each main function.
- A balance **without** `terrainSet` must behave exactly as before this plan (no terrain, no new events). No existing test may need a behavior change; only the pinned family-key lists change.
- Do not push. Do not install dependencies.

## Rulings by the lead (technical; record in DECISIONS in Task 7)

| ID | Ruling | Why |
|---|---|---|
| FT-1 | The existing family `terrain` is the rising ground (cause `ground`, `balance.terrain`). The new feature uses family key `fixedTerrain`, balance block `fixedTerrain`, state `families.fixedTerrain`; the death cause is `terrain` as the spec says. `config/terrain.json` keeps the spec name. | Name clash found in code. |
| FT-2 | Templates live on `balance.terrainSet` (optional), attached by `withTerrain(balance, json)`. | `restoreSim(b, state)` and every clone already carry the balance; state stays small; old tests see no terrain. |
| FT-3 | The variant comes from a hash of the run seed and the segment index, not from the sim RNG stream. | Keeps the determinism contract and every seeded test unchanged. |
| FT-4 | New rule **R15**: no template tile on the outer ring. | MEC-018 waits while another family holds a ring cell; permanent terrain there would block the shrinking board forever. The TER-R8 "ring waits" case can then never happen. |
| FT-5 | New rule **R16**: a template used on a level with coconut weight > 0 leaves at least `fixedTerrain.minFreeLanes` fully free rows + columns. | Coconut lanes need a free row or column. |
| FT-6 | R11 is checked as: every free cell belongs to a fully free 2 x 2 block. | Simple, symmetric, rules out 1-wide corridors and dead ends. |
| FT-7 | A warning cell turns solid only when its timer is over **and** no snake cell **and** no other family reserves it (extends the TER-R4 snake rule). At a change, orbs and rain mangoes on new cells expire and a regular mango on a new cell is placed again. | Hazards survive level ups (MEC-004-R16); a mover must never be frozen inside new terrain. |
| FT-8 | The terrain name banner shows only when the template changes (not on the challenge-level variant switch, not at run start). | The challenge banner already fills that level up. |

## File structure

| File | Responsibility |
|---|---|
| `config/terrain.json` (new) | 12 templates as ASCII pictures |
| `config/balance.json` | `fixedTerrain` block, `skills.shield.invulnMs`, `skills.shield.terrainBreach`, `ui.invulnBlinkMs`, `ui.invulnLowAlpha` |
| `src/core/fixedTerrain.ts` (new) | Pure: types, `segmentOf`, `variantFor`, `transform`, `layoutFor`, `diffLayout`, `breachCells`, `checkTemplate`, `parseTerrain`, `withTerrain` |
| `src/core/hazards/fixedTerrain.ts` (new) | Family descriptor, `applyStartTerrain`, `changeTerrain`, `breachTerrain`, `fixedTerrainSnapshot` |
| `src/core/invuln.ts` (new) | `invulnTick` |
| `src/core/types.ts`, `balance.ts`, `sim.ts`, `snake.ts`, `transition.ts`, `hazards/registry.ts`, `hazards/collision.ts`, `index.ts` | Wiring |
| `src/game/render/fixedTerrain.ts` (new) | `drawFixedTerrain`, `invulnAlpha` |
| `src/game/scenes/GameScene.ts`, `HudScene.ts`, `BootScene.ts`, `text.ts`, `art/capyHead.ts` | Wiring, strings |
| `tools/bot/runLevel.ts`, `report.ts`, `tools/terrain/board.mjs` (new) | Bot report per template, picture board |
| `tests/core/fixedTerrain.test.ts`, `tests/core/hazards/fixedTerrain.test.ts`, `tests/core/fixedTerrainChange.test.ts`, `tests/core/invuln.test.ts`, `tests/core/fixedTerrainFuzz.test.ts`, `tests/game/fixedTerrainRender.test.ts` (new) | Tests |

---

### Task 1: Balance numbers, templates and the pure layout module

**Files:**
- Modify: `config/balance.json`, `src/core/balance.ts` (interface near line 40, schema near line 182, `parseBalance` checks near line 313)
- Create: `config/terrain.json`, `src/core/fixedTerrain.ts`, `tests/core/fixedTerrain.test.ts`
- Modify: `tests/support/balance.ts`, `src/core/index.ts`

**Interfaces:**
- Produces (all from `src/core/fixedTerrain.ts`):
  - `type TerrainKind = 'R' | 'F'`; `interface TerrainTile { x: number; y: number; kind: TerrainKind }`
  - `interface TerrainTemplate { id: string; biome: number; segment: 1 | 2; name: string; tiles: TerrainTile[] }`
  - `interface TerrainSet { templates: TerrainTemplate[] }`; `type Variant = 0 | 1 | 2 | 3`
  - `interface TerrainLayout { templateId: string; name: string; variant: Variant; tiles: TerrainTile[] }`
  - `segmentOf(b: Balance, level: number): { biome: number; segment: 1 | 2; index: number }`
  - `variantFor(b: Balance, level: number, seed: number): Variant`
  - `transform(tiles: readonly TerrainTile[], v: Variant, cols: number, rows: number): TerrainTile[]`
  - `layoutFor(set: TerrainSet, b: Balance, level: number, seed: number): TerrainLayout`
  - `diffLayout<T extends Cell>(current: readonly T[], next: readonly TerrainTile[]): { keep: T[]; crumble: T[]; warn: TerrainTile[] }`
  - `breachCells(head: Cell, dir: Dir, w: number, len: number): Cell[]`
  - `checkTemplate(t: TerrainTemplate, b: Balance): string[]` (empty = fair)
  - `parseTerrain(json: unknown, b: Balance): TerrainSet` (throws on any problem)
  - `withTerrain(b: Balance, json: unknown): Balance`
  - `Balance.terrainSet?: TerrainSet`, `Balance.fixedTerrain`, `Balance.skills.shield.invulnMs`, `Balance.skills.shield.terrainBreach`, `Balance.ui.invulnBlinkMs`, `Balance.ui.invulnLowAlpha`
  - `loadGameBalance(patch?)` in `tests/support/balance.ts`

- [ ] **Step 1: Add the numbers to `config/balance.json`**

Add a top-level block next to `"terrain"`:

```json
"fixedTerrain": { "warnMs": 2000, "maxFraction": 0.12, "firstMaxCells": 5, "startAhead": 4, "firstSegmentLevels": 2, "minFreeLanes": 8 },
```

Inside `skills.shield` add `"invulnMs": 2000, "terrainBreach": { "w": 3, "len": 4 }`. Inside `ui` add `"invulnBlinkMs": 120, "invulnLowAlpha": 0.45`.

- [ ] **Step 2: Extend `src/core/balance.ts`**

In `interface Balance` add:

```ts
  fixedTerrain: { warnMs: number; maxFraction: number; firstMaxCells: number; startAhead: number; firstSegmentLevels: number; minFreeLanes: number };
  /** MEC-019 parsed templates; absent = no fixed terrain (attached by withTerrain). */
  terrainSet?: TerrainSet;
```

with `import type { TerrainSet } from './fixedTerrain';` at the top. Change the shield line to
`shield: { cost: number; durationMs: number; bonkPauseTicks: number; unlockLevel: number; invulnMs: number; terrainBreach: { w: number; len: number } };`
and add `invulnBlinkMs: number; invulnLowAlpha: number;` to the `ui` type.

In the schema object add, following the existing notation:

```ts
  fixedTerrain: { warnMs: 'int+', maxFraction: 'prob', firstMaxCells: 'int+', startAhead: 'int+', firstSegmentLevels: 'int+', minFreeLanes: 'int0' },
```

the shield schema becomes `{ cost: 'int+', durationMs: 'int+', bonkPauseTicks: 'int+', unlockLevel: 'int+', invulnMs: 'int+', terrainBreach: { w: 'int+', len: 'int+' } }`, and `ui` gets `invulnBlinkMs: 'int+', invulnLowAlpha: 'prob'`.

In `parseBalance`, next to the existing `b.terrain.periodMs` check, add:

```ts
  if (b.skills.shield.terrainBreach.w % 2 === 0) fail('skills.shield.terrainBreach.w', 'must be odd');
  if (b.fixedTerrain.firstSegmentLevels >= b.level.perBiome) fail('fixedTerrain.firstSegmentLevels', 'must be < level.perBiome');
  if (b.fixedTerrain.warnMs < b.fairness.minWarnMs) fail('fixedTerrain.warnMs', 'must be >= fairness.minWarnMs');
```

- [ ] **Step 3: Create `config/terrain.json`**

Every `rows` entry has 17 strings of 17 characters: `.` free, `R` rock, `F` fence. Blank row = `.................`. Rows not listed below are blank; write all 17 rows in the file.

| id | biome | segment | name | non-blank rows (y: string) |
|---|---|---|---|---|
| `b1s1` | 1 | 1 | Orchard Row | 4: `......RRRRR......` |
| `b1s2` | 1 | 2 | Twin Stones | 4: `...RRRRR.........` · 12: `..........RRRR...` |
| `b2s1` | 2 | 1 | Paddy Fence | 2,3,4,5,6: `....F............` · 12: `........FFFFFF...` |
| `b2s2` | 2 | 2 | Field Corner | 3: `...FFFFF.........` · 4,5,6: `...F.............` · 10,11,12: `.............F...` · 13: `..........FFFF...` |
| `b3s1` | 3 | 1 | Pond Stones | 3: `....RR...........` · 4: `...........RR....` · 12: `...RR..RR........` · 13: `...........RR....` |
| `b3s2` | 3 | 2 | Ice Channel | 5: `..RRRRRRRR.......` · 11: `........RRRRRRR..` |
| `b4s1` | 4 | 1 | Hill Pillars | 3,4: `...RR.......RR...` · 12,13: `...RR......RR....` |
| `b4s2` | 4 | 2 | Avalanche Steps | 3: `...RR............` · 4: `.............R...` · 5: `......RR.....R...` · 11: `.........RR......` · 13: `............RR...` |
| `b5s1` | 5 | 1 | Yard Fence | 4: `...FFFF...FFFF...` · 12: `....FFFFFFF......` |
| `b5s2` | 5 | 2 | Backyard Pens | 3: `...FFFF..........` · 4: `...F......RR.....` · 5: `...F.............` · 11: `.............F...` · 12: `.....RR......F...` · 13: `.........FFFFF...` |
| `b6s1` | 6 | 1 | Storm Cross | 2,3,4,5: `........R........` · 7: `.............RR..` · 8: `..RR.............` · 11,12,13,14: `.........R.......` |
| `b6s2` | 6 | 2 | Final Garden | 3: `...........RR....` · 4: `...FFFFF...RR....` · 11: `....F............` · 12: `....F....RRRRR...` · 13: `....F............` |

File shape:

```json
{ "templates": [
  { "id": "b1s1", "biome": 1, "segment": 1, "name": "Orchard Row", "rows": [
    ".................", ".................", ".................", ".................",
    "......RRRRR......", ".................", ".................", ".................",
    ".................", ".................", ".................", ".................",
    ".................", ".................", ".................", ".................",
    "................." ] }
] }
```

If the fairness test of Step 6 rejects a template, move the smallest number of tiles that makes it pass and note the change in the commit message (the owner reviews the shapes on the picture board in Task 6).

- [ ] **Step 4: Add the test helper** to `tests/support/balance.ts`

```ts
import terrainJson from '../../config/terrain.json';
import { withTerrain } from '../../src/core/fixedTerrain';
/** MEC-019 shipped balance plus the shipped terrain templates. */
export const loadGameBalance = (patch?: (json: any) => void): Balance => withTerrain(loadBalance(patch), structuredClone(terrainJson));
```

- [ ] **Step 5: Write the failing tests** `tests/core/fixedTerrain.test.ts`

```ts
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
```

- [ ] **Step 6: Run the test to see it fail**

Run: `npx vitest run tests/core/fixedTerrain.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL, cannot resolve `src/core/fixedTerrain`.

- [ ] **Step 7: Write `src/core/fixedTerrain.ts`**

```ts
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
  const seg = segmentOf(b, level), t = set.templates.find(x => x.biome === seg.biome && x.segment === seg.segment)!;
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
  const biomes = b.level.maxLevel / b.level.perBiome;
  for (let bi = 1; bi <= biomes; bi++) for (const seg of [1, 2])
    if (templates.filter(t => t.biome === bi && t.segment === seg).length !== 1) fail(`biome ${bi} segment ${seg} needs exactly one template`);
  if (templates.length !== biomes * 2) fail('a template has no matching segment');
  const problems = templates.flatMap(t => checkTemplate(t, b));
  if (problems.length) fail(problems.join('; '));
  return { templates };
}

export const withTerrain = (b: Balance, json: unknown): Balance => ({ ...b, terrainSet: parseTerrain(json, b) });
```

- [ ] **Step 8: Export from `src/core/index.ts`**

```ts
export { withTerrain, parseTerrain } from './fixedTerrain';
export type { TerrainSet, TerrainTemplate, TerrainTile, TerrainKind, Variant } from './fixedTerrain';
```

- [ ] **Step 9: Run the tests**

Run: `npx vitest run tests/core/fixedTerrain.test.ts tests/core/balance.test.ts --configLoader native --pool threads --maxWorkers 2` then `npm run typecheck`
Expected: PASS. If a template fails a fairness rule, fix the picture (Step 3 note) and rerun.

- [ ] **Step 10: Commit**

```bash
git add config/balance.json config/terrain.json src/core/balance.ts src/core/fixedTerrain.ts src/core/index.ts tests/core/fixedTerrain.test.ts tests/support/balance.ts
git commit -m "feat(core): MEC-019 terrain templates and pure layout rules"
```

---

### Task 2: The `fixedTerrain` family: state, start terrain, collision, exclusion, snapshot

**Files:**
- Create: `src/core/hazards/fixedTerrain.ts`, `tests/core/hazards/fixedTerrain.test.ts`
- Modify: `src/core/types.ts`, `src/core/sim.ts`, `src/core/hazards/registry.ts`, `src/core/testing.ts` (reset the new family in `simFromAscii`), `src/game/text.ts`
- Modify (pinned lists): `tests/core/registry.test.ts:12`, `tests/core/hazards/queries.test.ts:21,88`, `tests/core/hazards/state.test.ts:18`

**Interfaces:**
- Consumes: `layoutFor`, `TerrainKind` (Task 1).
- Produces:
  - `types.ts`: `CauseKey` gains `'terrain'`; `FamilyKey` gains `'fixedTerrain'`; `interface FixedTerrainCell { x: number; y: number; kind: TerrainKind; state: 'warn' | 'solid' | 'crumble'; leftMs: number }`; `interface FixedTerrainState { templateId: string | null; variant: number; cells: FixedTerrainCell[] }`; `SimState.families.fixedTerrain: FixedTerrainState`; `SimState.terrainSeed: number`; `SimSnapshot.fixedTerrain: { name: string | null; cells: readonly FixedTerrainCell[] }`
  - `hazards/fixedTerrain.ts`: `fixedTerrain: HazardFamily`, `applyStartTerrain(s: SimState, b: Balance): void`, `fixedTerrainSnapshot(s: SimState, b: Balance): SimSnapshot['fixedTerrain']`

- [ ] **Step 1: Write the failing tests** `tests/core/hazards/fixedTerrain.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { cellReserved } from '../../../src/core/cells';
import { variantFor } from '../../../src/core/fixedTerrain';
import { familyAt } from '../../../src/core/hazards/registry';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { loadBalance, loadGameBalance } from '../../support/balance';

const g = loadGameBalance();
const seedFor = (level: number, v: number): number => {
  for (let s = 1; s < 1000; s++) if (variantFor(g, level, s) === v) return s;
  throw new Error('no seed');
};
const quiet = (level: number, seed: number) => createSimInternal(g, seed, { startLevel: level }, { directorEnabled: false });

describe('MEC-019 fixedTerrain family', () => {
  it('MEC-019-R3 the start level terrain is solid before the first step', () => {
    const s = stateOf(quiet(1, seedFor(1, 0)));
    expect(s.families.fixedTerrain.templateId).toBe('b1s1');
    expect(s.families.fixedTerrain.cells.map(c => [c.x, c.y, c.state])).toEqual([6, 7, 8, 9, 10].map(x => [x, 4, 'solid']));
    expect(stateOf(quiet(13, seedFor(13, 0))).families.fixedTerrain.templateId).toBe('b3s2');
  });
  it('a balance without a terrain set has no terrain', () => {
    const s = stateOf(createSimInternal(loadBalance(), 1, {}, {}));
    expect(s.families.fixedTerrain).toEqual({ templateId: null, variant: 0, cells: [] });
  });
  it('MEC-019-R5 hitting terrain kills with cause terrain', () => {
    const sim = quiet(1, seedFor(1, 0)), s = stateOf(sim);
    s.snake = [{ x: 6, y: 6 }, { x: 6, y: 7 }, { x: 6, y: 8 }]; s.dir = { x: 0, y: -1 }; s.queue = []; s.mango = null;
    for (let i = 0; i < 5000 && s.status === 'playing'; i++) sim.advance(1);
    expect(s.outcome).toEqual({ won: false, cause: 'terrain' });
    expect(sim.drainEvents().at(-1)).toMatchObject({ type: 'died', cause: 'terrain' });
  });
  it('MEC-019-R8 terrain cells are solid, reserved and BFS walls; mangoes never spawn on them', () => {
    const s = stateOf(quiet(1, seedFor(1, 0)));
    expect(familyAt(s, 6, 4, 'solidAt')).toBe('fixedTerrain');
    expect(familyAt(s, 6, 4, 'bfsWallAt')).toBe('fixedTerrain');
    expect(cellReserved(s, 6, 4)).toBe(true);
    for (let seed = 1; seed <= 60; seed++) {
      const t = stateOf(quiet(3, seed)), m = t.mango!;
      expect(t.families.fixedTerrain.cells.some(c => c.x === m.x && c.y === m.y)).toBe(false);
    }
  });
  it('MEC-019-R9 the snapshot carries the cells and the template name', () => {
    const snap = quiet(1, seedFor(1, 0)).snapshot();
    expect(snap.fixedTerrain.name).toBe('Orchard Row');
    expect(snap.fixedTerrain.cells).toHaveLength(5);
  });
  it('MEC-019-R8 the director never places a hazard on terrain (60 s on L3)', () => {
    const sim = createSimInternal(g, 7, { startLevel: 3 }, { freezeSnake: true, ignoreOutcomes: true }), s = stateOf(sim);
    const tiles = s.families.fixedTerrain.cells.map(c => `${c.x},${c.y}`);
    for (let i = 0; i < 600; i++) {
      sim.advance(100);
      const snap = sim.snapshot();
      for (const h of snap.hazards) for (const c of h.cells) expect(tiles).not.toContain(`${c.x},${c.y}`);
      for (const p of snap.tiles) for (const c of p.cells) expect(tiles).not.toContain(`${c.x},${c.y}`);
    }
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/core/hazards/fixedTerrain.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL (`families.fixedTerrain` undefined).

- [ ] **Step 3: Types** in `src/core/types.ts`

- `import type { TerrainKind } from './fixedTerrain';`
- `CauseKey`: append `| 'terrain'`. `FamilyKey`: append `| 'fixedTerrain'`.
- Add after `SnipWall`:

```ts
/** MEC-019 one fixed terrain cell; leftMs counts the warn or crumble time down (0 while solid or waiting). */
export interface FixedTerrainCell { x: number; y: number; kind: TerrainKind; state: 'warn' | 'solid' | 'crumble'; leftMs: number }
export interface FixedTerrainState { templateId: string | null; variant: number; cells: FixedTerrainCell[] }
```

- `SimState.families`: add `fixedTerrain: FixedTerrainState` after `shrink`. `SimState`: add `terrainSeed: number;` after `rng`.
- `SimSnapshot`: add `fixedTerrain: { name: string | null; cells: readonly FixedTerrainCell[] };` after `terrains`.

- [ ] **Step 4: Write `src/core/hazards/fixedTerrain.ts`**

```ts
// src/core/hazards/fixedTerrain.ts - MEC-019 fixed terrain family: live cells of the current template.
import type { Balance } from '../balance';
import { layoutFor } from '../fixedTerrain';
import type { FixedTerrainCell, HazardFamily, SimSnapshot, SimState } from '../types';

const at = (s: SimState, x: number, y: number): FixedTerrainCell | undefined =>
  s.families.fixedTerrain.cells.find(c => c.x === x && c.y === y);

// MEC-019-R3 the start level's layout is solid before the first step (also for a checkpoint start).
export function applyStartTerrain(s: SimState, b: Balance): void {
  if (!b.terrainSet) return;
  const l = layoutFor(b.terrainSet, b, s.level, s.terrainSeed);
  s.families.fixedTerrain = { templateId: l.templateId, variant: l.variant,
    cells: l.tiles.map(c => ({ ...c, state: 'solid' as const, leftMs: 0 })) };
}

// MEC-019-R9 presentation view; the name comes from the template in the balance.
export function fixedTerrainSnapshot(s: SimState, b: Balance): SimSnapshot['fixedTerrain'] {
  const st = s.families.fixedTerrain;
  return { name: b.terrainSet?.templates.find(t => t.id === st.templateId)?.name ?? null, cells: st.cells.map(c => ({ ...c })) };
}

// MEC-019-R5/R8 solid cells kill (cause terrain); every non-crumbling cell is a BFS wall; every cell is reserved.
export const fixedTerrain: HazardFamily = {
  key: 'fixedTerrain', cause: 'terrain', capClass: 'none', maxActiveKey: null, breakable: true,
  spawn: () => null,
  update() { /* Task 3 adds the warn and crumble timers */ },
  snapshot: s => structuredClone(s.families.fixedTerrain),
  solidAt: (s, x, y) => at(s, x, y)?.state === 'solid',
  bfsWallAt: (s, x, y) => { const c = at(s, x, y); return !!c && c.state !== 'crumble'; },
  reservedAt: (s, x, y) => !!at(s, x, y),
  count: s => s.families.fixedTerrain.cells.length,
};
```

- [ ] **Step 5: Register the family** in `src/core/hazards/registry.ts`

`import { fixedTerrain } from './fixedTerrain';`, append `fixedTerrain` at the end of `DEFAULT_FAMILIES` and add `fixedTerrain` to the `FAMILY` record.

- [ ] **Step 6: Wire the state** in `src/core/sim.ts`

- `import { applyStartTerrain, fixedTerrainSnapshot } from './hazards/fixedTerrain';`
- In `initialState`: add `fixedTerrain: { templateId: null, variant: 0, cells: [] }` to `families` and `terrainSeed: seed` next to `rng: seedRng(seed)`. Build the object into a `const state: SimState = { ... }`, call `applyStartTerrain(state, b);`, then `return state;`.
- In `snapshotOf` add `fixedTerrain: fixedTerrainSnapshot(s, b),` after `terrains`.

In `src/core/testing.ts` `simFromAscii`, next to `s.families.terrain = [];` add `s.families.fixedTerrain = { templateId: null, variant: 0, cells: [] };`.

- [ ] **Step 7: Strings** in `src/game/text.ts` (the `Record<CauseKey, ...>` types force both)

In `CAUSE_TEXT`:

```ts
  terrain: 'You ran into the terrain.', // MEC-019 provisional
```

In `DEATH_LINES`:

```ts
  terrain: ['The map does not move. You did.', 'That wall was on the map.'], // MEC-019 provisional
```

- [ ] **Step 8: Update the pinned lists**

Append `'fixedTerrain'` to the key lists in `tests/core/registry.test.ts:12`, `tests/core/hazards/queries.test.ts:21`, `tests/core/hazards/state.test.ts:18`, and to the breakable list in `tests/core/hazards/queries.test.ts:88`. Run `npm run typecheck`; for every test fixture that builds a `SimSnapshot` or `SimState` literal (grep `terrains:` and `shrink: { active` in `tests/`), add `fixedTerrain: { name: null, cells: [] }` (snapshot) or `fixedTerrain: { templateId: null, variant: 0, cells: [] }` and `terrainSeed: 1` (state).

- [ ] **Step 9: Run**

Run: `npx vitest run tests/core/hazards tests/core/registry.test.ts tests/core/sim.test.ts tests/core/determinism.test.ts --configLoader native --pool threads --maxWorkers 2`, then `npm run typecheck`
Expected: PASS.

- [ ] **Step 10: Full suite and commit**

```bash
npm test && npm run typecheck
git add -A src/core src/game/text.ts tests
git commit -m "feat(core): MEC-019 fixedTerrain family, start terrain, terrain death cause"
```

---

### Task 3: Terrain change at a level up (MEC-019-R4)

**Files:**
- Modify: `src/core/hazards/fixedTerrain.ts`, `src/core/transition.ts`, `src/core/types.ts`
- Create: `tests/core/fixedTerrainChange.test.ts`

**Interfaces:**
- Consumes: `diffLayout`, `layoutFor` (Task 1); `FixedTerrainCell`, family (Task 2).
- Produces: `changeTerrain(s: SimState, b: Balance, ctx: StepCtx): void`; `SimEvent` gains `{ type: 'terrainChanged'; templateId: string; name: string; variant: number; newTemplate: boolean }`.

- [ ] **Step 1: Write the failing tests** `tests/core/fixedTerrainChange.test.ts`

```ts
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
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/core/fixedTerrainChange.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL (no `terrainChanged`, cells never change).

- [ ] **Step 3: Event type** in `src/core/types.ts`, in `SimEvent` after `levelUp`:

```ts
  | { type: 'terrainChanged'; templateId: string; name: string; variant: number; newTemplate: boolean }
```

- [ ] **Step 4: Implement** in `src/core/hazards/fixedTerrain.ts`

Imports: replace the Task 2 import of `../fixedTerrain` with `import { diffLayout, layoutFor } from '../fixedTerrain';`; add `import { placeMango } from '../mango';`, `import { rngFrom } from '../rng';`, `import { reservedByFamilies } from './queries';`, `import { FAMILIES } from './registry';`, and `StepCtx` in the type import.

Replace the family's `update`:

```ts
  // MEC-019-R4 crumbling cells disappear; a warning cell turns solid when its time is over and the cell is clear (FT-7).
  update(s, ctx) {
    const st = s.families.fixedTerrain;
    if (st.cells.every(c => c.state === 'solid')) return;
    const others = FAMILIES.filter(f => f.key !== 'fixedTerrain');
    st.cells = st.cells.filter(c => {
      if (c.state === 'solid') return true;
      if (c.leftMs > 0) c.leftMs -= 1;
      if (c.leftMs > 0) return true;
      if (c.state === 'crumble') return false;
      if (!ctx.snakeOn(c.x, c.y) && !reservedByFamilies(s, c.x, c.y, others)) c.state = 'solid';
      return true;
    });
  },
```

Add:

```ts
// MEC-019-R4 called from the level-up chain: diff the live cells against the new level's layout.
export function changeTerrain(s: SimState, b: Balance, ctx: StepCtx): void {
  if (!b.terrainSet) return;
  const st = s.families.fixedTerrain, next = layoutFor(b.terrainSet, b, s.level, s.terrainSeed);
  if (next.templateId === st.templateId && next.variant === st.variant) return;
  const live = st.cells.filter(c => c.state !== 'crumble'), d = diffLayout(live, next.tiles);
  const fading = st.cells.filter(c => c.state === 'crumble' && !next.tiles.some(n => n.x === c.x && n.y === c.y));
  st.cells = [...d.keep, ...fading,
    ...d.crumble.map(c => ({ ...c, state: 'crumble' as const, leftMs: b.hazard.crumbleMs })),
    ...d.warn.map(c => ({ ...c, state: 'warn' as const, leftMs: b.fixedTerrain.warnMs }))];
  const fresh = (x: number, y: number) => d.warn.some(c => c.x === x && c.y === y);
  // FT-7 pickups on new cells: orbs and rain mangoes expire, the regular mango is placed again.
  s.orbs = s.orbs.filter(o => { if (!fresh(o.x, o.y)) return true; ctx.emit({ type: 'orbExpired', x: o.x, y: o.y }); return false; });
  s.rainMangoes = s.rainMangoes.filter(m => { if (!fresh(m.x, m.y)) return true; ctx.emit({ type: 'rainMangoExpired', x: m.x, y: m.y }); return false; });
  const m = s.mango, head = s.snake[0]!;
  if (m && fresh(m.x, m.y) && !(m.x === head.x && m.y === head.y)) { // a mango under the head is the one being eaten
    const from = { x: m.x, y: m.y };
    placeMango(s, b, rngFrom(s.rng));
    ctx.emit({ type: 'mangoDisplaced', from, to: s.mango ? { x: s.mango.x, y: s.mango.y } : null });
  }
  ctx.emit({ type: 'terrainChanged', templateId: next.templateId, name: next.name, variant: next.variant, newTemplate: next.templateId !== st.templateId });
  st.templateId = next.templateId; st.variant = next.variant;
}
```

- [ ] **Step 5: Call it from the level-up chain** in `src/core/transition.ts`

`import { changeTerrain } from './hazards/fixedTerrain';` and, directly after the `ctx.emit({ type: 'levelUp', ... })` statement and before `rampOnLevelUp(s, ctx);`:

```ts
  changeTerrain(s, b, ctx); // MEC-019-R4 after levelUp, before rampEnded
```

If the import creates a module cycle error at load (`registry` not ready), import the registry first in `transition.ts` (`import './hazards/registry';`), the remedy named by `assertFamiliesDefined`.

- [ ] **Step 6: Run**

Run: `npx vitest run tests/core/fixedTerrainChange.test.ts tests/core/transition.test.ts tests/core/hazards/fixedTerrain.test.ts --configLoader native --pool threads --maxWorkers 2`, then `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Full suite and commit**

```bash
npm test && npm run typecheck
git add -A src/core tests/core
git commit -m "feat(core): MEC-019-R4 terrain change at a level up"
```

---

### Task 4: Shield breach and invulnerability (MEC-019-R6, R7)

**Files:**
- Create: `src/core/invuln.ts`, `tests/core/invuln.test.ts`
- Modify: `src/core/types.ts`, `src/core/sim.ts`, `src/core/snake.ts`, `src/core/hazards/collision.ts`, `src/core/hazards/fixedTerrain.ts`

**Interfaces:**
- Consumes: `breachCells` (Task 1), family (Task 2).
- Produces: `SimState.invuln: { leftMs: number } | null`; `SimSnapshot.invuln: { leftMs: number } | null`; `SimEvent` gains `{ type: 'terrainBreached'; cells: Cell[] }`, `{ type: 'invulnStarted'; ms: number }`, `{ type: 'invulnEnded' }`; `breachTerrain(s: SimState, ctx: StepCtx, x: number, y: number): void`; `invulnTick(s: SimState, ctx: StepCtx): void`.

- [ ] **Step 1: Write the failing tests** `tests/core/invuln.test.ts`

```ts
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
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/core/invuln.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL (`invuln` unknown; Shield bonks instead of breaching).

- [ ] **Step 3: Types** in `src/core/types.ts`

- `SimState`: `invuln: { leftMs: number } | null;` after `shield`. `SimSnapshot`: `invuln: { leftMs: number } | null;` after `shield`.
- `SimEvent`: add

```ts
  | { type: 'terrainBreached'; cells: Cell[] }
  | { type: 'invulnStarted'; ms: number }
  | { type: 'invulnEnded' }
```

- [ ] **Step 4: Breach** in `src/core/hazards/fixedTerrain.ts`

Add `breachCells` to the `../fixedTerrain` import and:

```ts
// MEC-019-R6 Shield on terrain: consume the Shield, break the terrain cells in the area ahead, start invulnerability; no bonk pause.
export function breachTerrain(s: SimState, ctx: StepCtx, x: number, y: number): void {
  const sh = ctx.balance.skills.shield, st = s.families.fixedTerrain;
  const area = breachCells(s.snake[0]!, s.dir, sh.terrainBreach.w, sh.terrainBreach.len);
  const hit = (c: { x: number; y: number }) => area.some(a => a.x === c.x && a.y === c.y);
  const broken = st.cells.filter(c => c.state !== 'crumble' && hit(c)).map(c => ({ x: c.x, y: c.y }));
  st.cells = st.cells.filter(c => c.state === 'crumble' || !hit(c));
  s.shield = null;
  ctx.emit({ type: 'skillEnded', skill: 'shield', reason: 'consumed' });
  ctx.emit({ type: 'shieldBroke', x, y, family: 'fixedTerrain' });
  ctx.emit({ type: 'terrainBreached', cells: broken });
  s.invuln = { leftMs: sh.invulnMs };
  ctx.emit({ type: 'invulnStarted', ms: sh.invulnMs });
}
```

- [ ] **Step 5: Collision** in `src/core/hazards/collision.ts`

`import { breachTerrain } from './fixedTerrain';`. At the top of `resolveHeadCell`:

```ts
  // MEC-019-R7 invulnerable: only the closed shrinking ring still kills (the board edge is checked by the caller).
  if (s.invuln) {
    const ring = FAMILIES.find(f => f.key === 'shrink');
    return ring?.solidAt(s, x, y) ? { kind: 'death', cause: 'shrink' } : { kind: 'clear' };
  }
```

After the `moverHit` emit line and before the generic `if (s.shield && ...)` branch:

```ts
  // MEC-019-R6 Shield on fixed terrain breaches an area instead of one cell and does not bonk.
  if (s.shield && hit.family.key === 'fixedTerrain') { breachTerrain(s, ctx, x, y); return { kind: 'broke', family: 'fixedTerrain' }; }
```

At the top of `applyHeadHit`, after the status check: `if (s.invuln) return; // MEC-019-R7 update-time hits pass through`.

- [ ] **Step 6: Self collision** in `src/core/snake.ts`

In `stepSnake` change the self test to `: !s.invuln && body.some(c => c.x === nx && c.y === ny) ? 'self'` and add the comment `// MEC-019-R7 an invulnerable snake passes through its own body`.

- [ ] **Step 7: Timer** `src/core/invuln.ts`

```ts
// src/core/invuln.ts - MEC-019-R7 invulnerability timer.
import { headHitAt, solidFamilyAt } from './hazards/queries';
import type { SimState, StepCtx } from './types';

// MEC-019-R7 counts down; when the time is over it lasts until the head is on a free cell.
export function invulnTick(s: SimState, ctx: StepCtx): void {
  const v = s.invuln;
  if (!v) return;
  if (v.leftMs > 0) v.leftMs -= 1;
  if (v.leftMs > 0) return;
  const h = s.snake[0]!;
  if (solidFamilyAt(s, h.x, h.y) || headHitAt(s, h.x, h.y) || s.snake.some((c, i) => i > 0 && c.x === h.x && c.y === h.y)) return;
  s.invuln = null;
  ctx.emit({ type: 'invulnEnded' });
}
```

- [ ] **Step 8: Wire** in `src/core/sim.ts`

`import { invulnTick } from './invuln';`; `initialState`: `invuln: null` next to `shield: null`; `stepMs`: `invulnTick(s, ctx);` directly after `skillTimers(s, b, ctx);`; `snapshotOf`: `invuln: s.invuln && { ...s.invuln },` after `shield`. Add `invuln: null` to the state and snapshot test fixtures the typecheck reports.

- [ ] **Step 9: Run**

Run: `npx vitest run tests/core/invuln.test.ts tests/core/shield.test.ts tests/core/hazards/collision.test.ts tests/core/snake.test.ts --configLoader native --pool threads --maxWorkers 2`, then `npm run typecheck`
Expected: PASS (Shield on normal hazards unchanged, MEC-006-R26..R28).

- [ ] **Step 10: Full suite and commit**

```bash
npm test && npm run typecheck
git add -A src/core tests
git commit -m "feat(core): MEC-019-R6/R7 Shield breach on terrain and invulnerability"
```

---

### Task 5: Render, banner, boot wiring

**Files:**
- Create: `src/game/render/fixedTerrain.ts`, `tests/game/fixedTerrainRender.test.ts`
- Modify: `src/game/render/hazards.ts` (export `drawFence`), `src/game/scenes/GameScene.ts:252-262`, `src/game/scenes/HudScene.ts` (`onEvents`), `src/game/scenes/BootScene.ts:56`, `src/game/text.ts`, `src/game/art/capyHead.ts`

**Interfaces:**
- Consumes: `SimSnapshot.fixedTerrain`, `SimSnapshot.invuln`, `terrainChanged` event, `withTerrain`.
- Produces: `drawFixedTerrain(g, view, cell, look, b, reduced, tel)`, `invulnAlpha(invuln, timeMs, reduced, cfg)`, `CapyHead.setAlpha(a: number)`.

- [ ] **Step 1: Write the failing test** `tests/game/fixedTerrainRender.test.ts`

Read `tests/game/hazardArt.test.ts` first and reuse its Graphics probe (`tests/support/gfx.ts`), look and telegraph setup for the second `describe`.

```ts
import { describe, expect, it } from 'vitest';
import { invulnAlpha } from '../../src/game/render/fixedTerrain';

const cfg = { invulnBlinkMs: 120, invulnLowAlpha: 0.45 };
describe('MEC-019-R7 invulnerable blink', () => {
  it('is opaque when not invulnerable', () => { expect(invulnAlpha(null, 500, false, cfg)).toBe(1); });
  it('alternates every blink period', () => {
    expect(invulnAlpha({ leftMs: 900 }, 0, false, cfg)).toBe(1);
    expect(invulnAlpha({ leftMs: 900 }, 120, false, cfg)).toBe(0.45);
    expect(invulnAlpha({ leftMs: 900 }, 240, false, cfg)).toBe(1);
  });
  it('reduced motion uses a steady low alpha', () => {
    expect(invulnAlpha({ leftMs: 900 }, 0, true, cfg)).toBe(0.45);
    expect(invulnAlpha({ leftMs: 900 }, 120, true, cfg)).toBe(0.45);
  });
});
```

Add a second `describe('MEC-019-R9 drawFixedTerrain')` that calls `drawFixedTerrain` on the probe with one solid `R`, two adjacent solid `F`, one `warn` and one `crumble` cell and asserts: it does not throw; the probe recorded at least one `fillEllipse` (rock), one `fillRoundedRect` (fence) and one `strokeRoundedRect` (warn ring); an empty cell list records nothing.

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/game/fixedTerrainRender.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL (module missing).

- [ ] **Step 3: Write `src/game/render/fixedTerrain.ts`**

In `src/game/render/hazards.ts` change `function drawFence(` to `export function drawFence(`. Then:

```ts
// src/game/render/fixedTerrain.ts - MEC-019-R9 fixed terrain drawn with the biome's rock and fence art.
import type Phaser from 'phaser';
import type { Balance, SimSnapshot } from '../../core';
import type { BoardLook } from './biomePalette';
import { drawFence, drawRock, drawWarn } from './hazards';
import type { TelegraphCtx } from './telegraph';

type Graphics = Phaser.GameObjects.Graphics;
const MIN_CRUMBLE_SCALE = 0.15;

export function drawFixedTerrain(g: Graphics, view: SimSnapshot['fixedTerrain'], cell: number, look: BoardLook, b: Balance, reduced: boolean, tel: TelegraphCtx): void {
  const fences: { x: number; y: number; k: number }[] = [];
  for (const c of view.cells) {
    if (c.state === 'warn') {
      drawWarn(g, c, cell, b.fixedTerrain.warnMs - c.leftMs, b.fixedTerrain.warnMs, look, 'hazard', false, reduced, tel.cfg);
      continue;
    }
    const crumble = c.state === 'crumble', a = crumble ? Math.max(0, c.leftMs / b.hazard.crumbleMs) : 1;
    if (c.kind === 'R') drawRock(g, { x: (c.x + 0.5) * cell, y: (c.y + 0.5) * cell }, cell, look, a, 'rock', crumble);
    else if (crumble) drawFence(g, [{ x: c.x, y: c.y, k: Math.max(MIN_CRUMBLE_SCALE, a) }], cell, look, a);
    else fences.push({ x: c.x, y: c.y, k: 1 });
  }
  if (fences.length) drawFence(g, fences, cell, look, 1);
}

// MEC-019-R7 the invulnerable snake blinks; reduced motion shows a steady lower alpha.
export function invulnAlpha(invuln: { leftMs: number } | null, timeMs: number, reduced: boolean, cfg: { invulnBlinkMs: number; invulnLowAlpha: number }): number {
  if (!invuln) return 1;
  if (reduced) return cfg.invulnLowAlpha;
  return Math.floor(timeMs / cfg.invulnBlinkMs) % 2 === 1 ? cfg.invulnLowAlpha : 1;
}
```

- [ ] **Step 4: GameScene** `src/game/scenes/GameScene.ts`

Import both functions. Directly before the `drawHazards(...)` call (line 253) add:

```ts
    drawFixedTerrain(this.layers.hazards, snapshot.fixedTerrain, cell, this.look, this.balance, this.reduced, this.tel);
```

Directly after the `drawSnake(...)` statement add:

```ts
    const blink = invulnAlpha(snapshot.invuln, time, this.reduced, this.balance.ui); // MEC-019-R7
    this.layers.snake.setAlpha(blink); this.capy.setAlpha(blink);
```

In `src/game/art/capyHead.ts` add a public `setAlpha(a: number): void` that forwards `setAlpha(a)` to every display object the class creates (read the constructor; if it owns one container, forward to that container).

- [ ] **Step 5: Banner and strings**

`src/game/text.ts`: add `'banner.terrain': 'Map: {name}', // MEC-019 provisional` next to the other `banner.` keys.

`src/game/scenes/HudScene.ts`, in the `onEvents` switch after the `levelUp` case:

```ts
      case 'terrainChanged': // MEC-019-R9, FT-8: name only when the template changes
        if (e.newTemplate) this.banners.enqueue({ kind: 'hint', text: t('banner.terrain', { name: e.name }) });
        break;
```

- [ ] **Step 6: Boot** `src/game/scenes/BootScene.ts`

```ts
import terrainJson from '../../../config/terrain.json';
import { parseBalance, withTerrain } from '../../core';
```

and line 56 becomes `const balance = withTerrain(parseBalance(structuredClone(json)), structuredClone(terrainJson));`.

- [ ] **Step 7: Run**

Run: `npx vitest run tests/game/fixedTerrainRender.test.ts tests/game/hud.test.ts tests/boundary.test.ts --configLoader native --pool threads --maxWorkers 2`, then `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Browser check**

Run `npm run dev` (stop the server afterwards) and capture with the headless driver (how-to: PLAYTEST "How to capture"): `?debug=1&level=1`, `&level=3`, `&level=8`, `&level=13`, `&level=18`, `&level=23`, `&level=28` into `tmp/qa/terrain/`. Check: terrain visible in each biome's rock/fence art, no console error, the debug "+1" button from L2 to L3 shows crumble + warning cells and the `Map: Twin Stones` banner.

- [ ] **Step 9: Full suite and commit**

```bash
npm test && npm run typecheck
git add -A src/game tests/game
git commit -m "feat(game): MEC-019 terrain render, map banner, invulnerable blink"
```

---

### Task 6: Bot report per template, terrain fuzz, picture board

**Files:**
- Modify: `tools/bot/runLevel.ts`, `tools/bot/report.ts`, `tools/bot/report.test.ts`
- Create: `tests/tools/report.test.ts` (or extend the existing test that covers `formatReport`; grep `formatReport`), `tools/terrain/board.mjs`, `docs/design/terrain/board.html` (generated), `tests/core/fixedTerrainFuzz.test.ts`

**Interfaces:**
- Consumes: `loadGameBalance`, `stateOf`.
- Produces: `LevelResult.terrain?: string` (template id at the start of the level run).

- [ ] **Step 1: Failing test for the report**

```ts
import { expect, it } from 'vitest';
import { formatReport } from '../../tools/bot/report';

it('MEC-019-R14 lists terrain deaths per template', () => {
  const r = formatReport([
    { level: 3, seed: 1, outcome: 'death', cause: 'terrain', biome: 1, terrain: 'b1s2' },
    { level: 3, seed: 2, outcome: 'death', cause: 'terrain', biome: 1, terrain: 'b1s2' },
    { level: 3, seed: 3, outcome: 'death', cause: 'rock', biome: 1, terrain: 'b1s2' },
    { level: 3, seed: 4, outcome: 'clear', biome: 1, terrain: 'b1s2' },
  ]);
  expect(r.markdown).toContain('### Terrain deaths per template');
  expect(r.markdown).toContain('| b1s2 | 2 | 3 | 67% |');
  expect(r.warnings).toContain('WARN biome 1: terrain 67% of deaths (> 40%)');
});
```

Run: `npx vitest run tests/tools/report.test.ts --configLoader native --pool threads --maxWorkers 2`. Expected: FAIL.

- [ ] **Step 2: Implement**

`tools/bot/runLevel.ts`: add `terrain?: string` to `LevelResult`; right after `stateOf(sim)` capture the template and put it in `base`:

```ts
  const startTerrain = s.families.fixedTerrain.templateId;
  const base = { level, seed, biome: biome(balance, level), ...(startTerrain ? { terrain: startTerrain } : {}) };
```

`tools/bot/report.ts`, before `return`:

```ts
  // MEC-019-R14 terrain deaths per template.
  const templates = [...new Set(results.flatMap(r => (r.terrain ? [r.terrain] : [])))].sort();
  if (templates.length) {
    out.push('', '### Terrain deaths per template', '| template | terrain deaths | all deaths | share |', '|---|---|---|---|');
    for (const id of templates) {
      const deaths = results.filter(r => r.terrain === id && r.outcome === 'death'), hit = deaths.filter(r => r.cause === 'terrain').length;
      out.push(`| ${id} | ${hit} | ${deaths.length} | ${deaths.length ? pct(hit, deaths.length) : 0}% |`);
    }
  }
```

`tools/bot/report.test.ts`: switch its balance to `loadGameBalance()`.

- [ ] **Step 3: Terrain fuzz** `tests/core/fixedTerrainFuzz.test.ts`

```ts
import { expect, it } from 'vitest';
import { createSimInternal, stateOf } from '../../src/core/simInternal';
import { runLevel } from '../../tools/bot/runLevel';
import { loadGameBalance } from '../support/balance';

const g = loadGameBalance();
const LEVELS = [1, 3, 5, 6, 8, 11, 13, 16, 18, 21, 23, 26, 28], SEEDS = [1, 2, 3];

it.each(LEVELS)('MEC-019-R8 L%i: nothing ever shares a cell with fixed terrain (bot run)', level => {
  for (const seed of SEEDS) {
    runLevel(g, level, seed, s => {
      const tiles = new Set(s.families.fixedTerrain.cells.filter(c => c.state === 'solid').map(c => `${c.x},${c.y}`));
      if (s.mango) expect(tiles.has(`${s.mango.x},${s.mango.y}`)).toBe(false);
      for (const o of s.orbs) expect(tiles.has(`${o.x},${o.y}`)).toBe(false);
      for (const f of ['rock', 'fence', 'maze'] as const) for (const h of s.families[f]) for (const c of h.cells) expect(tiles.has(`${c.x},${c.y}`)).toBe(false);
    });
  }
}, 120000);

it('MEC-019 determinism: same seed gives the same terrain and state after 20 s', () => {
  const run = () => { const sim = createSimInternal(g, 42, { startLevel: 8 }, {}); sim.advance(20000); return stateOf(sim); };
  expect(run()).toEqual(run());
});
```

If the host is too slow for the bot runs, reduce `SEEDS` to `[1]`, never the level list. Run: `npx vitest run tests/core/fixedTerrainFuzz.test.ts tests/tools --configLoader native --pool threads --maxWorkers 2`. Expected: PASS.

- [ ] **Step 4: Picture board** `tools/terrain/board.mjs`

```js
// tools/terrain/board.mjs - MEC-019 picture board: every template in its four variants. Run: node tools/terrain/board.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const { templates } = JSON.parse(readFileSync('config/terrain.json', 'utf8'));
const NAMES = ['original', 'mirror left-right', 'mirror top-bottom', 'rotate 180'];
const variant = (rows, v) => {
  const r = v & 2 ? [...rows].reverse() : rows;
  return v & 1 ? r.map(s => [...s].reverse().join('')) : r;
};
const grid = rows => `<div class="g">${rows.map(row => [...row].map(ch => `<i class="${ch === 'R' ? 'r' : ch === 'F' ? 'f' : ''}"></i>`).join('')).join('')}</div>`;
const html = `<!doctype html><meta charset="utf-8"><title>MEC-019 terrain board</title>
<style>body{font:14px system-ui;margin:16px;background:#f4f1ea;color:#222}h2{margin:24px 0 8px}
.row{display:flex;gap:16px;flex-wrap:wrap}.g{display:grid;grid-template-columns:repeat(17,10px);gap:1px;background:#cfd8c0;padding:1px}
.g i{width:10px;height:10px;background:#eef3e2}.g i.r{background:#6b6f76;border-radius:50%}.g i.f{background:#a8743a}
figure{margin:0}figcaption{font-size:12px;margin-top:4px}</style>
<h1>MEC-019 fixed terrain: 12 templates x 4 variants</h1><p>Grey dot = rock, brown = fence. Generated from config/terrain.json.</p>
${templates.map(t => `<h2>${t.id} - ${t.name} (biome ${t.biome}, segment ${t.segment})</h2><div class="row">${
  [0, 1, 2, 3].map(v => `<figure>${grid(variant(t.rows, v))}<figcaption>${NAMES[v]}</figcaption></figure>`).join('')}</div>`).join('\n')}`;
mkdirSync('docs/design/terrain', { recursive: true });
writeFileSync('docs/design/terrain/board.html', html);
console.log('wrote docs/design/terrain/board.html');
```

Run: `node tools/terrain/board.mjs`. Expected: `wrote docs/design/terrain/board.html`. Open the file in a browser and capture it to `tmp/qa/terrain/board.png`.

- [ ] **Step 5: Bot report (MEC-019-R14)**

Run: `npm run bot:report` (long; nothing else heavy at the same time; on a low-RAM kill wait and retry up to 3 times, then stop and report). Record in `docs/PLAYTEST.md` a new entry "MEC-019 terrain bot report": the per-template table and every WARN line. A `terrain` share above 40% in a biome fails R14: lower that template's tile count or widen its corridors, rerun, and note the change. WARN lines that existed before this plan (biome 4 coconut) are reported, not fixed.

- [ ] **Step 6: Full suite and commit**

```bash
npm test && npm run typecheck
git add -A tools tests docs/design/terrain docs/PLAYTEST.md
git commit -m "feat(tools): MEC-019 terrain bot report, fuzz and picture board"
```

---

### Task 7: Specs, maps, memory files, merge

**Files:**
- Create: `docs/specs/mechanics/MEC-019-terrain.md`
- Modify: `docs/specs/mechanics/MEC-003-levels-biomes.md`, `MEC-004-obstacles-director-fairness.md`, `MEC-006-energy-skills.md`, `MEC-018-shrinking-board.md`, `docs/GDD.md` (§5 mechanics index, §5.4), `docs/ARCHITECTURE.md` (step order, registry list), `docs/README.md`, `docs/CODEMAP.md`, `docs/DECISIONS.md`, `CHANGELOG.md`, `docs/STATUS.md`, `docs/superpowers/specs/2026-11-11-fixed-terrain-design.md` (status line)

- [ ] **Step 1: Write `docs/specs/mechanics/MEC-019-terrain.md`**

Follow the section layout of `MEC-018-shrinking-board.md`. Content: rules MEC-019-R1..R14 copied from the design (`TER-R<n>` renamed), with these edits: R8 states that hazards, tiles, mover paths, mangoes and orbs never use a terrain cell and that the shrinking ring is never blocked because of R15; new R15 (no tile on the outer ring), R16 (free lanes for coconut levels), R17 (FT-7: a warning cell waits for the snake and other families; pickups on new cells), R18 (variant from a seed hash; banner only on a template change). List the config keys (`fixedTerrain.*`, `skills.shield.invulnMs`, `skills.shield.terrainBreach`, `ui.invulnBlinkMs`, `ui.invulnLowAlpha`), the events (`terrainChanged`, `terrainBreached`, `invulnStarted`, `invulnEnded`), the snapshot fields and the 12 template ids with names. State that the family key is `fixedTerrain` and the cause is `terrain` (the older `terrain` family is the rising ground, cause `ground`).

- [ ] **Step 2: Edit the related specs**

- MEC-003: one rule line pointing to MEC-019-R1 (segments) and the `terrainChanged` position in the level-up event order (after `levelUp`, before `rampEnded`).
- MEC-004: the registry order now ends with `fixedTerrain`; director exclusion follows from `reservedAt` (MEC-019-R8).
- MEC-006: Shield on fixed terrain (MEC-019-R6) and invulnerability (MEC-019-R7); Shield on normal hazards unchanged.
- MEC-018: the ring is never blocked by fixed terrain (MEC-019-R15); the closed ring kills an invulnerable snake.
- GDD §5: add the MEC-019 row to the mechanics index (status Implemented) and one sentence in §5.4 linking to the spec.
- ARCHITECTURE: step 6 gains "invulnerability timer (MEC-019-R7)"; step 12.2 gains the invulnerable and breach cases; the registry list gains `fixedTerrain`.

- [ ] **Step 3: Maps and memory files**

- `docs/README.md`: row for MEC-019 (the plan and design rows exist), date updated.
- `docs/CODEMAP.md`: the `src/core/` row mentions `fixedTerrain.ts` and `invuln.ts`; the `src/core/hazards/` row mentions `fixedTerrain.ts`; a new row for `src/game/render/fixedTerrain.ts`; a `tools/terrain/` row; the Balance config entry mentions `config/terrain.json` via `withTerrain`.
- `docs/DECISIONS.md`: one entry dated 2026-11-16 "MEC-019 fixed terrain" with rulings FT-1..FT-8 from the table at the top of this plan, and the owner decision to build it before U7.
- `CHANGELOG.md` `[Unreleased]`: `feat: fixed terrain (MEC-019): 12 hand-drawn maps, level-up change, Shield breach, invulnerability`.
- Design spec status line: "Approved (owner 2026-11-16); implemented by plan 2026-11-16-fixed-terrain.md; rule IDs are MEC-019-R<n>".
- `docs/STATUS.md` (keep <= 60 lines): fixed terrain done and merged; owner eye-check items (picture board `docs/design/terrain/board.html`, template shapes and names, breach feel, blink, provisional strings `banner.terrain` and the terrain death lines); the open question from design §5 (invulnerability after a Shield hit on a normal hazard); U7 is next.

- [ ] **Step 4: Verify (superpowers:verification-before-completion)**

Run in order: `npm test`, `npm run typecheck`, `npm run build`. All must pass. Start `npm run dev`, load `/?debug=1&level=3`, confirm no console error, stop the server. `grep -rn "TER-R" src tests` must return nothing (IDs are `MEC-019-R`).

- [ ] **Step 5: Commit, review, merge**

```bash
git add -A docs CHANGELOG.md
git commit -m "docs: MEC-019 fixed terrain spec, maps, decisions, status"
```

Request the final code review (superpowers:requesting-code-review, Opus), apply fixes, then:

```bash
git checkout version/v0.3
git merge --no-ff feat/fixed-terrain -m "Merge branch 'feat/fixed-terrain' into version/v0.3"
npm test && npm run typecheck
node .gitnexus/run.cjs analyze --index-only --workers 2
```

The last command runs in the background; do not wait for it. Remove a worktree only after removing its `node_modules` junction; never `git worktree remove --force`.

---

## Self-review notes

- Spec coverage: R1/R2 Task 1; R3, R5, R8 (reserve, mango, director), R9 snapshot Task 2; R4 Task 3; R6, R7 Task 4; R9 look and banner Task 5; R10..R13 Task 1 (`checkTemplate` test over all templates and variants); R14 Task 6; section 4 data, core, render, docs Tasks 1 to 7; owner art review via the picture board Task 6.
- Spec deviations are listed as rulings FT-1..FT-8 and go to DECISIONS.
- Open point kept from the design §5: invulnerability after a Shield hit on a normal hazard stays off.
