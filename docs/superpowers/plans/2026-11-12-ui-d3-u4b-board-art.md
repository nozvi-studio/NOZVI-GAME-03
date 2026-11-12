# UI D3 U4b Board Art Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The board gets the D3 art: per-biome frame with inner top shadow, two-tone checker without grid lines, the D3 snake (head 1.4 cells, outlined body with a highlight stripe), outlined mango with halo, shaded pebble rocks, dashed red warn tiles, and every other hazard family recoloured and outlined for D3-R2.

**Architecture:** `boardLook(biome)` (pure, `render/biomePalette.ts`) becomes the single source of every board colour, read from `TOKENS.d3.biomes`, `TOKENS.d3.outline` / `outlineStorm` and `TOKENS.d3.snake`. Renderers keep their shapes and timing and only take colours and outline widths from the look. The `theme` argument and grid lines go away (D3-R3, D3-R4).

**Tech Stack:** Phaser 3.90, TypeScript strict, Vitest (Windows: `npx vitest run --configLoader native --pool threads --maxWorkers 1 <path>`).

**Spec:** `docs/superpowers/specs/2026-11-10-ui-d3-juicy-design.md` §4 D3-R1..R4, §7 D3-R12. Roadmap `docs/superpowers/plans/2026-11-10-ui-d3-roadmap.md` U4 items 4-7 and the "head drawn larger than a cell" risk. Boards: `docs/design/mockups/d3/boards.html` `boardSvg()` and `png/Biomes.png`, `Game-360.png`.

## Global Constraints
- Branch `feat/ui-d3-u4b-board-art` from `version/v0.3`; merge back `--no-ff` after `npm test` and `npm run typecheck` (sequential).
- No change to `src/core/`, `src/meta/`, save format, collision, grid size or ART-001 anchors. Visual only.
- No hex literals outside `src/game/uiTokens.ts` (board part colours move there as `TOKENS.d3.board`); shape fractions stay in `render/boardParts.ts`; no magic numbers.
- D3-R2: on the board, the outline (or rim) colour of the snake, mango, rocks, warn tiles and every hazard family keeps contrast >= 3:1 against BOTH cell colours of all six biomes (`contrastRatio` in `biomePalette.ts`).
- D3-R28 reduced motion: no new motion in this plan; existing bob/pulse rules unchanged.
- Requirement IDs in test names and at implementing functions; CHANGELOG line per commit; CODEMAP updated in the last task.

## Lead rulings
- **B1 One look for all biomes.** `BoardLook` drops `theme`, `grid`, `gridAlpha`, `snakeRim`; it gains `frame`, `outline: { snake, mango, rock, warn }` and `snake: { body, head, belly }`. `edge` (hazard outline) = `outline.rock`; `woodEdge` = `outline.rock` too (one outline per biome set; biome 6 uses the light set).
- **B2 Snake outline in every biome.** The old biome-6-only rim (UIFIX-R5) becomes the normal outline: dark `#2B2F9E` in biomes 1-5, light `#7CF2D4` in biome 6.
- **B3 Capy face size unchanged.** The head disc grows to 1.4 cells (radius 0.7 + outline); the capy face image keeps `balance.capy.headCellScale` 1.2 so it sits inside the disc. No balance change.
- **B4 Head hiding a hazard.** The Task 6 screenshot pass checks "rock ahead" and "warn tile ahead". If the head covers more than about half of the next cell's symbol, drop `SNAKE.head` to 0.625 (1.25 cells) in the same task and record it in DECISIONS.
- **B5 Biome sweep** keeps using `look.groundA` (now the D3 cell colour).

## File structure
| Path | Action | Responsibility |
|---|---|---|
| `src/game/uiTokens.ts` | modify | `TOKENS.d3.board` part colours (rock, warn, mango, wood, mud, ice, stone, hedge, frame shadow) |
| `src/game/render/biomePalette.ts` | modify | D3 `BoardLook`, `boardLook(biome)` |
| `src/game/render/board.ts` | modify | checker without grid, frame + inner shadow (`drawBoardFrame`) |
| `src/game/render/boardParts.ts` | modify | `PART` reads `TOKENS.d3.board`; `SNAKE`, `FRAME` fractions; drop `GRID_LINE` |
| `src/game/render/snake.ts` | modify | D3 snake |
| `src/game/render/mango.ts`, `hazards.ts`, `tiles.ts`, `movers.ts`, `cycles.ts`, `blasts.ts`, `shrink.ts` | modify | colours/outlines from the look |
| `src/game/scenes/GameScene.ts` | modify | `boardLook(biome)` calls, frame redraw on biome change |
| tests | modify/create | `biomePalette`, `boardGround`, `boardBorder`, `snakeHead`, `snakeRim`, `mango`, `hazardArt`, new `boardContrast.test.ts` |

---

### Task 1: D3 board look and checker ground (D3-R4, B1, B5)

**Files:**
- Modify: `src/game/render/biomePalette.ts`, `src/game/render/board.ts` (`groundRects`), `src/game/render/boardParts.ts` (remove `GRID_LINE`), `src/game/scenes/GameScene.ts` (3 `boardLook(...)` calls), every other caller found by `grep -rn "boardLook(\|themeOf\|snakeRim\|gridAlpha\|look.grid" src tests`
- Test: `tests/game/biomePalette.test.ts`, `tests/game/boardGround.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface BoardLook {
    biome: number; frame: number; groundA: number; groundB: number;
    outline: { snake: number; mango: number; rock: number; warn: number };
    snake: { body: number; head: number; belly: number };
    edge: number; woodEdge: number; // hazard outlines (= outline.rock), kept so hazard renderers change little
  }
  export function boardLook(biome: number): BoardLook;
  export const DEFAULT_LOOK: BoardLook; // boardLook(1)
  ```
  `groundRects(look, cols, rows, cell)` returns only the checker cells (no grid rects).

- [ ] **Step 1: Failing tests.** Replace the D2 cases in `biomePalette.test.ts` (keep `contrastRatio`/`mixInt` tests) with:

```ts
import { TOKENS, toInt } from '../../src/game/uiTokens';
import { boardLook } from '../../src/game/render/biomePalette';

it('D3-R4 B1 each biome takes frame and cells from TOKENS.d3.biomes', () => {
  for (let n = 1; n <= 6; n++) {
    const l = boardLook(n), b = TOKENS.d3.biomes[n - 1]!;
    expect(l).toMatchObject({ biome: n, frame: toInt(b.frame), groundA: toInt(b.cells[0]), groundB: toInt(b.cells[1]) });
  }
});
it('D3-R4 B1 B2 biome 6 uses the light outline set, others the dark set; edge = rock outline', () => {
  expect(boardLook(1).outline.snake).toBe(toInt(TOKENS.d3.outline.snake));
  expect(boardLook(6).outline.snake).toBe(toInt(TOKENS.d3.outlineStorm.snake));
  for (const n of [1, 6]) expect(boardLook(n).edge).toBe(boardLook(n).outline.rock);
});
it('D3-R4 biome is clamped to 1..6', () => {
  expect(boardLook(0).biome).toBe(1); expect(boardLook(9).biome).toBe(6);
});
```

In `boardGround.test.ts`, replace the grid-line cases with: `groundRects(boardLook(1), 17, 17, 30)` has exactly `17 * 17` rects, alternating `groundA` / `groundB` by `(x + y) % 2`, all alpha 1 (test name `D3-R4 checker ground has no grid lines`).

- [ ] **Step 2: Run** both files → FAIL.
- [ ] **Step 3: Implement** `biomePalette.ts` (keep `mixInt`, `contrastRatio`):

```ts
import { TOKENS, toInt } from '../uiTokens';

// D3-R4 per-biome board look: frame, two-tone checker of one hue, outline set (biome 6 = light set). Pure: no Phaser.
export interface BoardLook {
  biome: number; frame: number; groundA: number; groundB: number;
  outline: { snake: number; mango: number; rock: number; warn: number };
  snake: { body: number; head: number; belly: number };
  edge: number; woodEdge: number;
}
const STORM = 6;
export function boardLook(biome: number): BoardLook {
  const n = Math.min(STORM, Math.max(1, Math.round(biome)));
  const b = TOKENS.d3.biomes[n - 1]!, o = n === STORM ? TOKENS.d3.outlineStorm : TOKENS.d3.outline, s = TOKENS.d3.snake;
  const outline = { snake: toInt(o.snake), mango: toInt(o.mango), rock: toInt(o.rock), warn: toInt(o.warn) };
  return { biome: n, frame: toInt(b.frame), groundA: toInt(b.cells[0]), groundB: toInt(b.cells[1]), outline,
    snake: { body: toInt(s.body), head: toInt(s.head), belly: toInt(s.belly) }, edge: outline.rock, woodEdge: outline.rock };
}
export const DEFAULT_LOOK: BoardLook = boardLook(1);
```

`board.ts` `groundRects`: drop the two grid loops and the `GRID_LINE` import. Remove `GRID_LINE` from `boardParts.ts`.
- [ ] **Step 4: Callers.** `GameScene`: `boardLook(1)`, `boardLook(snapshot.biome)`, `boardLook(v.biome)`; drop `themeOf` imports that become unused (keep `themeOf` in `palette.ts` only if something else imports it; otherwise delete it and its test case). `drawSnake(..., this.look.snakeRim, ...)` → pass `this.look` for now and keep the old body drawing: Task 3 rewrites it (change the parameter type to `BoardLook` and use `look.outline.snake` where `rim` was used, so biome 6 still gets its rim). Fix every other caller from the grep.
- [ ] **Step 5: Run** the two files, then `npm test -- --maxWorkers 1` and `npm run typecheck`. Tests that pinned D2 ground colours read `boardLook(n)` instead of literals.
- [ ] **Step 6: Commit** `feat(ui): D3 board look per biome, checker without grid (D3-R4)` + CHANGELOG.

### Task 2: Board frame with inner top shadow (D3-R12)

**Files:**
- Modify: `src/game/render/board.ts`, `src/game/render/boardParts.ts` (`FRAME`), `src/game/uiTokens.ts` (`TOKENS.d3.board.frameShadow`), `src/game/scenes/GameScene.ts`
- Test: `tests/game/boardBorder.test.ts`

**Interfaces:**
- Produces: `frameRects(look: BoardLook, size: number, cell: number): { drop: RoundRect; frame: RoundRect; shadow: RoundRect }` (pure, board px relative to the board origin) and `drawBoardFrame(g: Graphics, look: BoardLook, size: number, cell: number): void` replacing `drawBoardBorder(g, p)`.
  `interface RoundRect { x: number; y: number; w: number; h: number; r: number; color: number; alpha: number }`

Geometry from `boardSvg()` (board units, 1 unit = 1 cell): frame overhang 0.4 cell on every side, frame radius 1.3 cells, drop shadow = frame shifted 0.2 cell down in ink `#0F4578` alpha 0.5, inner top shadow = black alpha 0.16 band 0.5 cell tall over the top of the ground. Put these in `boardParts.ts`:

```ts
export const FRAME = { pad: 0.4, radius: 1.3, groundRadius: 0.7, dropY: 0.2, dropAlpha: 0.5, shadowH: 0.5, shadowAlpha: 0.16, shadowRadius: 0.2 } as const;
```

and `TOKENS.d3.board.frameShadow: '#000000'` (ink for the drop is `TOKENS.d3.inkDeep`).

- [ ] **Step 1: Failing test** (replace the old outline cases):

```ts
it('D3-R12 frame overhangs 0.4 cell, drop shadow 0.2 cell lower, inner shadow 0.5 cell on top', () => {
  const cell = 30, size = 510, f = frameRects(boardLook(1), size, cell);
  expect(f.frame).toMatchObject({ x: -12, y: -12, w: 534, h: 534, r: 39, color: boardLook(1).frame, alpha: 1 });
  expect(f.drop.y - f.frame.y).toBeCloseTo(6); expect(f.drop.alpha).toBe(0.5);
  expect(f.shadow).toMatchObject({ x: 0, y: 0, w: size, h: 15, alpha: 0.16 });
});
```

(GameScene passes `BOARD.size` and `cellPx(balance)`.)
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `frameRects` + `drawBoardFrame` (fill drop, then frame, both rounded; the ground image is drawn above by the container order; the inner shadow is drawn in a Graphics ABOVE the ground image but below the layers — add it to the existing `board` container right after the ground image). The ground keeps its own rounded mask `FRAME.groundRadius` (replace `BOARD_RADIUS` 18 px with `cell * FRAME.groundRadius`). Delete `BOARD_OUTLINE` and `drawBoardBorder`.
- [ ] **Step 4: GameScene.** Draw the frame in `create()` and redraw it (clear + `drawBoardFrame`) whenever the look changes (the `lookStale || biome changed` branch) and on `settings-closed`.
- [ ] **Step 5: Run** `boardBorder`, `boardScene` tests, full suite, typecheck. **Step 6: Commit** `feat(ui): D3 board frame with drop and inner top shadow (D3-R12)` + CHANGELOG.

### Task 3: D3 snake (D3-R12, B2, B3)

**Files:**
- Modify: `src/game/render/snake.ts`, `src/game/render/boardParts.ts` (`SNAKE`), `src/game/scenes/GameScene.ts` (call)
- Test: `tests/game/snakeHead.test.ts`, `tests/game/snakeRim.test.ts`, `tests/game/snakeBulge.test.ts`

**Interfaces:**
- Produces: `drawSnake(g, s, cell, look: BoardLook, gulp, drawFace = true, bulge = 0)` (the `p: Palette` and `rim` parameters are removed; colours come from `look.snake` and `look.outline.snake`); pure `snakeWidths(cell)` returning `{ body, outline, stripe, head, headOutline, belly }` in px.

```ts
// boardParts.ts — D3-R12 snake, fractions of one cell (boardSvg: outline 0.96, body 0.76, stripe 0.14, head r 0.7 + 0.1 outline)
export const SNAKE = { body: 0.76, outline: 0.96, stripe: 0.14, stripeAlpha: 0.4, stripeOffset: 0.16, head: 0.7, headOutline: 0.1, belly: 0.26, gulp: 0.18 } as const;
```

- [ ] **Step 1: Failing tests.** In `snakeHead.test.ts` add `D3-R12 head disc is 1.4 cells wide plus outline` → `snakeWidths(30)` gives `head` 21, `headOutline` 3, `body` 22.8, `outline` 28.8. In `snakeRim.test.ts` replace the biome-6-only rim cases with `D3-R12 B2 outline is drawn in every biome in look.outline.snake` using the existing Graphics spy pattern of that file: for `boardLook(1)` the first stroke colour is `0x2B2F9E`; for `boardLook(6)` it is `0x7CF2D4`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Draw order: outline stroke (width `outline`) + outline discs at every point and head disc `head + headOutline`; body stroke (`body`, `look.snake.body`) + discs; highlight stripe: the same polyline offset by `-stripeOffset * cell` on the y axis (screen up, like the board's `hi` path), white `stripeAlpha`, width `stripe`, skipping the head point; head disc `look.snake.head` radius `head * (1 + SNAKE.gulp * gulp)`; bulge disc unchanged (body colour). Keep eyes code for `drawFace` (used when no capy face). Remove `SNAKE_BODY_CELL`, `SNAKE_HEAD_CELL`, `SNAKE_RIM_CELL` (replace imports elsewhere with `SNAKE`). `snakeHeadPoint` unchanged (ART-001).
- [ ] **Step 4: GameScene** call: `drawSnake(this.layers.snake, snapshot, cell, this.look, Math.max(...), false, bulge)`.
- [ ] **Step 5: Run** snake tests, `boardScene`, full suite, typecheck. **Step 6: Commit** `feat(ui): D3 snake - 1.4-cell head, outlined body, highlight stripe (D3-R12)` + CHANGELOG.

### Task 4: Mango, rocks, warn tiles (D3-R12, D3-R2)

**Files:**
- Modify: `src/game/uiTokens.ts` (`TOKENS.d3.board`), `src/game/render/boardParts.ts` (`PART`, `MANGO`, `ROCK`, `WARN`), `src/game/render/mango.ts`, `src/game/render/hazards.ts` (`drawRock`, `drawWarn`)
- Test: `tests/game/mango.test.ts`, `tests/game/hazardArt.test.ts`, create `tests/game/boardContrast.test.ts`

**Interfaces:**
- Consumes: `look.outline.mango/rock/warn`.
- Produces: `TOKENS.d3.board` with at least:
  ```ts
  board: {
    mango: { body: '#FFAB1A', leaf: '#3FC23D', shine: '#FFFFFF', halo: '#FFFFFF' },
    rock: { body: '#9FB0C0', hi: '#FFFFFF' },
    warn: { fill: '#FF5A5A', bang: '#C81E1E' },
    frameShadow: '#000000',
  }
  ```
  `PART.mango` / `PART.rock` / `PART.warn` read these via `toInt`.

- [ ] **Step 1: Failing tests** `tests/game/boardContrast.test.ts`:

```ts
import { expect, it } from 'vitest';
import { boardLook, contrastRatio } from '../../src/game/render/biomePalette';

// D3-R2 board outlines keep >= 3:1 against both cells of every biome.
it('D3-R2 snake, mango, rock and warn outlines vs both cells, biomes 1..6', () => {
  for (let n = 1; n <= 6; n++) {
    const l = boardLook(n);
    for (const k of ['snake', 'mango', 'rock', 'warn'] as const) for (const cell of [l.groundA, l.groundB])
      expect(contrastRatio(l.outline[k], cell), `biome ${n} ${k}`).toBeGreaterThanOrEqual(3);
  }
});
```

In `mango.test.ts` add `D3-R12 mango draws halo, outline, body, shine in that order` with the file's Graphics spy: first fill is the halo (white, alpha 0.35, radius `0.62 * cell`), then an outline ellipse in `look.outline.mango` scaled 1.16 of the body. In `hazardArt.test.ts` change the rock and warn colour assertions to `look.outline.rock` / `look.outline.warn` and add `D3-R12 warn tile dashes use the warn outline colour`.
- [ ] **Step 2: Run** → FAIL (contrast test may already pass: that is fine, it guards later edits; the mango/hazard cases must fail).
- [ ] **Step 3: Implement.**
  - Mango (`boardSvg` mango): soft halo circle (white, alpha `MANGO.haloAlpha` 0.35, radius `MANGO.halo` 0.62 cell) before the bob/scale transform; outline = the body ellipse drawn first at scale `MANGO.outline` 1.16 in `look.outline.mango`; body `PART.mango.body`, golden keeps `p.gold`; shine = small white ellipse (alpha 0.7) at the upper left instead of the D2 highlight curve; leaf in `PART.mango.leaf`. Ripeness arc unchanged (MEC-002). Put `halo`, `haloAlpha`, `outline`, `shine` numbers in `MANGO`.
  - Rock (`boardSvg` pebble): outline ellipse in `look.outline.rock` (offset down `ROCK.drop`), body `PART.rock.body`, top highlight white 0.55; crumble crack/debris colours use `look.outline.rock`. Keep `rockMetrics` sizes per kind.
  - Warn: tile fill `PART.warn.fill` at the existing pulse alpha, dashed border in `look.outline.warn`, outer ring in `look.outline.warn`, "!" in `PART.warn.bang`. Rise-warn keeps the stone colours but its outer ring uses `look.edge`. All `telegraphPulse` rules unchanged (MOT-4).
- [ ] **Step 4: Run** the three files, full suite, typecheck. **Step 5: Commit** `feat(ui): D3 mango, pebble rocks and warn tiles (D3-R12)` + CHANGELOG.

### Task 5: Other hazard families - recolour and outline (D3-R12, D3-R2)

**Files:**
- Modify: `src/game/uiTokens.ts` (`TOKENS.d3.board` entries for wood, mud, ice, stone, hedge, coconut/bomb/NPC/spike/gate/shrink colours that are hex in `render/*` today), `src/game/render/boardParts.ts` (`PART`), `src/game/render/hazards.ts` (fences, hedges, rising stone), `tiles.ts` (mud, ice), `movers.ts`, `cycles.ts`, `blasts.ts`, `shrink.ts`, `skills.ts` if it holds board colours
- Test: `tests/game/boardContrast.test.ts` (extend), existing family tests

**Interfaces:**
- Produces: `export const HAZARD_EDGES: Record<'fence' | 'hedge' | 'mud' | 'ice' | 'stone' | 'coconut' | 'bomb' | 'npc' | 'spike' | 'gate' | 'shrink', (l: BoardLook) => number>` in `biomePalette.ts`: the outline colour each family draws with in that biome (default `l.edge`; a family may use another token if it reads better, as long as the test passes).

- [ ] **Step 1: Inventory.** `grep -n "0x[0-9a-fA-F]\{6\}\|toInt('#\|PART\.\|look\.\|p\.\(wood\|hedge\|earth\|rock\|warn\|danger\)" src/game/render/{hazards,tiles,movers,cycles,blasts,shrink,skills}.ts`. List each family, the colour(s) it draws and where its outline comes from; put the list in the task report.
- [ ] **Step 2: Failing test** (append to `boardContrast.test.ts`):

```ts
import { HAZARD_EDGES } from '../../src/game/render/biomePalette';
it('D3-R2 every hazard family outline vs both cells, biomes 1..6', () => {
  for (let n = 1; n <= 6; n++) {
    const l = boardLook(n);
    for (const [k, edge] of Object.entries(HAZARD_EDGES)) for (const cell of [l.groundA, l.groundB])
      expect(contrastRatio(edge(l), cell), `biome ${n} ${k}`).toBeGreaterThanOrEqual(3);
  }
});
```

- [ ] **Step 3: Run** → FAIL (no export). **Step 4: Implement** `HAZARD_EDGES` and make each family draw its outline with `HAZARD_EDGES.<family>(look)` (pass `look` where a renderer only has the `Palette` today). Fill colours move from `Palette`/hex literals to `TOKENS.d3.board.<family>`; shapes, sizes, alpha rules and timings stay exactly as they are. Families that had no outline get one: a stroke of `max(1, cell * 0.08)` px in their edge colour around the existing shape (`BOARD_EDGE = 0.08` in `boardParts.ts`).
- [ ] **Step 5: Run** family tests (`hazardArt`, `boardParts`, tests matching `mover|cycle|blast|shrink|tile`), full suite, typecheck. Do not delete behaviour tests; update colour expectations to the look. **Step 6: Commit** `feat(ui): D3 hazard families recoloured and outlined (D3-R12, D3-R2)` + CHANGELOG.

### Task 6: Screenshot pass, docs, merge

- [ ] **Step 1:** Full suite + typecheck (sequential).
- [ ] **Step 2: Lead captures** with `tools/qa/shot.mjs` (dev server; tap PLAY at the centre x, 450/640 of the height; wait 3 s): `?debug=1&level=N` for one level in each biome 1..6 at 360x640, plus 390x844 for biome 1. Compare with `png/Biomes.png` and `Game-360.png`. Check B4 (head over a rock or warn tile ahead: steer with `swipe:` toward one) and the frame/inner shadow. Defects → fix task (Claude subagent) → recapture.
- [ ] **Step 3: Docs:** CODEMAP rows (`biomePalette.ts` D3 look, `HAZARD_EDGES`, `drawBoardFrame`), UI-MOCKUPS `Biomes` row and `Game` row "U4b (built)", PLAYTEST entry, STATUS, DECISIONS (B1..B5; B4 outcome).
- [ ] **Step 4: Final review** (Opus) over the branch; one fix wave; merge `--no-ff` into `version/v0.3`; full suite + typecheck after merge; GitNexus refresh in the background.
