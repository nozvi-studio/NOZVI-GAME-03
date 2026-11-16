# MEC-019 — Fixed terrain

> Status: Implemented (owner approved 2026-11-16; branch `feat/fixed-terrain`) · Phase: M2 P3 (built before UI D3 U7) · Date: 2026-11-16

## 1. Purpose & links
- Defines hand-drawn fixed terrain: rock and fence cells that stay for a level segment, so each part of a biome reads as a small map with a style and clear corridors. Normal hazards keep falling as before.
- Design: `docs/superpowers/specs/2026-11-11-fixed-terrain-design.md` (its rule numbers R1..R14 are kept as `MEC-019-R<n>`). Plan: `docs/superpowers/plans/2026-11-16-fixed-terrain.md` (rulings FT-1..FT-8, DECISIONS 2026-11-16).
- Related: MEC-003 (segments, level up), MEC-004 (registry, director, fairness), MEC-006 (Shield, R26..R28), MEC-018 (shrinking ring, R15 here), MEC-002 (mango placement).
- **Names:** the family key is `fixedTerrain` and the death cause is `terrain`. The older `terrain` family is the rising ground (cause `ground`, `balance.terrain`); do not confuse them (FT-1).

## 2. Player-facing summary
- Each biome has two maps: its first 2 levels use one, its last 3 levels use another. The map is a few rock rows and fences you steer around; it is there from the first step.
- When the map changes, old cells crumble and new cells flash for 2 seconds, then turn solid. A banner shows `Map: <name>`.
- Touching terrain kills you. With Shield active, the Shield breaks the terrain ahead of you (3 wide, 4 long) and you are invulnerable for 2 seconds (the snake blinks); the board edge still kills.

## 3. State & data
`SimState.families.fixedTerrain` (JSON): `{templateId: string | null, variant: number, cells: FixedTerrainCell[]}`; `FixedTerrainCell = {x, y, kind: 'R' | 'F', state: 'warn' | 'solid' | 'crumble', leftMs}`. `SimState.invuln: {leftMs} | null`. `SimState.terrainSeed` is the run seed used for the variant hash.
Descriptor: `{key: 'fixedTerrain', cause: 'terrain', capClass: 'none', maxActiveKey: null, breakable: true}`; `spawn` always returns `null` (the director never places it).
Templates: `config/terrain.json`, `{id, biome, segment, name, rows: string[17]}`, `.` free, `R` rock, `F` fence. Parsed by `parseTerrain` and attached by `withTerrain(balance, json)` as optional `balance.terrainSet` (FT-2). A balance without `terrainSet` runs exactly as before (no terrain, no new events).
Snapshot: `SimSnapshot.fixedTerrain = {name: string | null, cells}` and `SimSnapshot.invuln = {leftMs} | null`.
Events: `terrainChanged {templateId, name, variant, newTemplate}`, `terrainBreached {cells}`, `invulnStarted {ms}`, `invulnEnded`; the Shield break also emits `skillEnded {skill: 'shield', reason: 'consumed'}` and `shieldBroke {x, y, family: 'fixedTerrain'}`.
Template ids and names:
| Biome | Segment 1 (levels 1-2 of the biome) | Segment 2 (levels 3-5) |
|---|---|---|
| 1 | `b1s1` Orchard Row | `b1s2` Twin Stones |
| 2 | `b2s1` Paddy Fence | `b2s2` Field Corner |
| 3 | `b3s1` Pond Stones | `b3s2` Ice Channel |
| 4 | `b4s1` Hill Pillars | `b4s2` Avalanche Steps |
| 5 | `b5s1` Yard Fence | `b5s2` Backyard Pens |
| 6 | `b6s1` Storm Cross | `b6s2` Final Garden |
Code: pure layout in `src/core/fixedTerrain.ts`, family in `src/core/hazards/fixedTerrain.ts`, timer in `src/core/invuln.ts`, drawing in `src/game/render/fixedTerrain.ts`.

## 4. Rules
- **MEC-019-R1 Segments.** Each biome (5 levels) has two segments: segment 1 = its first `fixedTerrain.firstSegmentLevels` (2) levels, segment 2 = the rest (L1-2 / L3-5, L6-7 / L8-10, ... L26-27 / L28-30). Each segment uses one template: 12 in total.
- **MEC-019-R2 Variants.** A template has four variants: 0 original, 1 mirror left-right, 2 mirror top-bottom, 3 rotate 180. The variant is picked at the segment start from a hash of the run seed and the segment index (FT-3; not from the sim RNG stream, so seeded runs and the determinism contract are unchanged). In segment 2 the challenge level (L5, L10, ...) takes a different variant of the same template. Segment 1 keeps one variant for both levels. The first template `b1s1` is left-right symmetric, so it has 2 distinct variants; the other 11 have 4.
- **MEC-019-R3 Start of a run** (also from a checkpoint): the layout of the start level's segment and variant is on the board, all cells `solid`, before the first step (`applyStartTerrain`).
- **MEC-019-R4 Change at a level up** (new segment or variant switch), in the level-up chain after `levelUp` and before `rampEnded`: cells in both layouts stay; cells only in the old layout turn `crumble` for `hazard.crumbleMs` (450) and are then removed; cells only in the new layout turn `warn` for `fixedTerrain.warnMs` (2000), then `solid`. A warning cell with a snake cell on it stays warning until the snake leaves (TimedCells rule, MEC-004). Event `terrainChanged`.
- **MEC-019-R5 Collision.** A `solid` cell is solid: entering it kills like a rock or fence, cause `terrain`. `warn` and `crumble` cells are not solid. Every non-crumbling cell is a BFS wall.
- **MEC-019-R6 Shield on terrain.** When the head with an active Shield enters a solid terrain cell: the Shield is consumed; every non-crumbling terrain cell in an area of `skills.shield.terrainBreach.w` (3) wide x `len` (4) long ahead of the head is removed (the area starts at the cell in front of the head and covers the 4 rows in the move direction, centred on the head column); empty cells, mangoes and other hazards are untouched; broken cells stay open until the next R4 change, which rebuilds them as new cells (warn, then solid). The snake becomes invulnerable (R7). Events `skillEnded`, `shieldBroke`, `terrainBreached {cells}`, `invulnStarted`. The bonk pause (MEC-006-R27) does not apply. This branch in `resolveHeadCell` runs before the generic Shield branch.
- **MEC-019-R7 Invulnerable.** For `skills.shield.invulnMs` (2000) the snake passes through every obstacle, hazard and its own body; the board edge and a closed shrinking ring (MEC-018) still kill. Update-time hits (areas, movers) do not kill. The timer is a plain countdown in the sim state: it runs in sim time, persists across a level up and is not reset by it. If the time is over while the head is on a solid cell, a hit area or a body cell, invulnerability lasts until the head is on a free cell, then `invulnEnded`. The snake blinks (`ui.invulnBlinkMs` 120, low alpha `ui.invulnLowAlpha` 0.45). Shield on a normal hazard is unchanged (MEC-006-R26..R28) and starts no invulnerability.
- **MEC-019-R8 Other systems.** Terrain cells are `reserved` in every state: the director never places a hazard, ground tile or mover path, and no mango, orb or rain mango is placed, on a terrain cell (including a warn cell). Tail Snip and Mango Rain are unchanged. Terrain survives MEC-003-R8 level ups only through R4. The family is `capClass: 'none'` (no cap, never offered by the director).
- **MEC-019-R9 Look.** Terrain uses the biome's rock and fence art; a warn cell uses the warning look and crumble reuses the rock crumble. Each template has a display name shown on the banner `Map: <name>` when the template changes (R18).
- **MEC-019-R10 Connected.** For every template in all four variants, all free cells form one connected region.
- **MEC-019-R11 No narrow corridor (FT-6).** Every free cell belongs to a fully free 2 x 2 block: corridors are at least 2 wide and have no 1-wide dead end.
- **MEC-019-R12 Start area.** The snake start cells and the `fixedTerrain.startAhead` (4) cells ahead of the head are free.
- **MEC-019-R13 Size.** A template covers at most `fixedTerrain.maxFraction` (0.12) of the board; segment 1 of biome 1 has at most `fixedTerrain.firstMaxCells` (5) cells.
- **MEC-019-R14 Fuzz.** Bot fuzz: no single death cause above 40% per biome (P2 exit rule); `terrain` deaths are reported per template (`tools/bot`). The verdict is in `docs/PLAYTEST.md`.
- **MEC-019-R15 No tile on the outer ring (FT-4).** No template tile lies on the outer ring (`x` or `y` equal to 0 or 16), so the shrinking ring (MEC-018-R1) is never blocked by fixed terrain; the design's "ring waits at a terrain cell" case cannot happen.
- **MEC-019-R16 Free lanes (FT-5).** A template used on a level with coconut weight > 0 leaves at least `fixedTerrain.minFreeLanes` (8) fully free rows plus columns, so coconut lanes (MEC-013) exist.
- **MEC-019-R17 Warn cells wait; pickups on new cells (FT-7).** A warn cell turns solid only when its timer is over, no snake cell is on it and no other family reserves it (a mover is never frozen inside new terrain; hazards survive level ups, MEC-004-R16). At a change, orbs and rain mangoes on new (warn) cells expire (`orbExpired`, `rainMangoExpired`); a regular mango on a new cell is placed again by MEC-002 placement (`mangoDisplaced`), unless the head is on it (that mango is being eaten).
- **MEC-019-R18 Variant source and banner (FT-3, FT-8).** The variant comes from the seed hash (R2). The `Map: <name>` banner shows only when the template changes (`terrainChanged.newTemplate`), not on the challenge-level variant switch and not at run start.

## 5. Edge cases
1. **Snake on a warn cell at a change:** the cell stays warn until the snake leaves and nothing else reserves it (R4, R17).
2. **Breach hits warn cells:** warn cells in the area are removed too (only crumbling cells are kept); they are rebuilt at the next change.
3. **Change while cells are crumbling:** crumbling cells not in the new layout keep fading; those in the new layout become warn.
4. **Level up while invulnerable:** the timer keeps running (R7); new warn cells are not solid, so there is no conflict.
5. **Closed shrinking ring while invulnerable:** still kills (R7, MEC-018).
6. **Registry `onBreak`:** the family stays `breakable: true` with a no-op `onBreak` only because a registry test (MEC-006-R24) requires `onBreak` on every breakable family; a Shield head entry never reaches it (R6).

## 6. Interactions with other mechanics
- **MEC-003:** segments by level (R1), level-up order (R4).
- **MEC-004:** registry order ends with `fixedTerrain`; the director never offers it and excludes terrain cells through `reservedAt` (R8).
- **MEC-006:** Shield breach and invulnerability (R6, R7); normal Shield unchanged.
- **MEC-018:** the ring is never blocked (R15); a closed ring kills an invulnerable snake (R7).
- **MEC-002:** mango placement avoids terrain and re-places a mango on a new cell (R8, R17).

## 7. Core API changes
- `FamilyKey` adds `fixedTerrain`; `CauseKey` adds `terrain`. `SimEvent` adds `terrainChanged`, `terrainBreached`, `invulnStarted`, `invulnEnded`. `SimSnapshot` adds `fixedTerrain` and `invuln`. `Balance` adds optional `terrainSet`, block `fixedTerrain`, `skills.shield.invulnMs` and `terrainBreach`, `ui.invulnBlinkMs`, `ui.invulnLowAlpha`.
- `src/core/fixedTerrain.ts`: `segmentOf`, `variantFor`, `transform`, `layoutFor`, `diffLayout`, `breachCells`, `checkTemplate`, `parseTerrain`, `withTerrain`. `src/core/hazards/fixedTerrain.ts`: `fixedTerrain` family, `applyStartTerrain`, `changeTerrain`, `breachTerrain`, `fixedTerrainSnapshot`. `src/core/invuln.ts`: `invulnTick`. The family is the last entry of the registry.

## 8. Feedback (greybox)
- Provisional strings (owner review): `banner.terrain` "Map: {name}"; `CAUSE_TEXT.terrain` "You ran into the terrain."; two death lines "The map does not move. You did." and "That wall was on the map.".
- Invulnerable: the head blinks between full alpha and `ui.invulnLowAlpha` every `ui.invulnBlinkMs`.
- Picture board of all templates and variants: `docs/design/terrain/board.html` (built by `tools/terrain/board.mjs`).

## 9. Tuning
| Key | Value |
|---|---|
| `fixedTerrain.warnMs` | 2000 |
| `fixedTerrain.maxFraction` | 0.12 |
| `fixedTerrain.firstMaxCells` | 5 |
| `fixedTerrain.startAhead` | 4 |
| `fixedTerrain.firstSegmentLevels` | 2 |
| `fixedTerrain.minFreeLanes` | 8 |
| `skills.shield.invulnMs` | 2000 |
| `skills.shield.terrainBreach` | `{w: 3, len: 4}` |
| `ui.invulnBlinkMs` | 120 |
| `ui.invulnLowAlpha` | 0.45 |
`parseTerrain` validates the templates against the balance (every R10..R13, R15, R16 problem is listed in one error).

## 10. Acceptance tests
- `tests/core/fixedTerrain.test.ts` (R1, R2, R4 diff, R6 area, R10..R13, R15, R16 over all templates and variants), `tests/core/hazards/fixedTerrain.test.ts` (R3, R5, R8, family queries), `tests/core/fixedTerrainChange.test.ts` (R4, R17), `tests/core/invuln.test.ts` (R6, R7), `tests/game/fixedTerrainRender.test.ts` (R9).
- `tests/core/fixedTerrainFuzz.test.ts` (R14): 13 levels x 3 seeds of bot runs plus a determinism test. The determinism test stays in the normal suite; the bot-run fuzz runs only in fuzz mode: `npx vitest run --mode fuzz tests/core/fixedTerrainFuzz.test.ts` (14/14 passed, 6 min 28 s, 2026-11-16).
- Bot report per template: `npm run bot:report` (verdict pending, see `docs/PLAYTEST.md`).

## 11. Lead decisions & escalations
### Lead decisions
- FT-1..FT-8 (names, templates on the balance, seed hash, ring rule R15, free lanes R16, 2 x 2 corridor check, warn cells wait R17, banner R18): DECISIONS 2026-11-16 "MEC-019 fixed terrain".
- `breakable: true` with a no-op `onBreak` (edge case 6).
### Escalations (owner)
- Template names and shapes: the owner reviews the picture board.
- Open (design §5): should invulnerability also follow a Shield hit on a normal hazard? Today: no.
