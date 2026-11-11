# Fixed terrain - design (MEC-019)

Status: Draft. Owner approved each section in chat 2026-11-11; spec awaits owner review. IDs: `TER-R<n>` (become `MEC-019-R<n>` when the mechanic spec is written in the plan). Scheduled **after the UI D3 phases (U3..U7)** (owner 2026-11-11).

## 1. Goal
Owner 2026-11-11: hazards appear in random, meaningless places. Add hand-drawn terrain: a few rock rows and fences that stay fixed for 2-3 levels, so each part of a biome reads as a small map with a style and clear corridors. Normal hazards keep falling as today.

## 2. Rules
- **TER-R1 Segments.** Each biome (5 levels) has two segments: segment 1 = its first 2 levels, segment 2 = its last 3 levels (L1-2 / L3-5, L6-7 / L8-10, ... L26-27 / L28-30). Each segment uses one hand-drawn template: 12 templates in total.
- **TER-R2 Variants.** A template has four variants: original, mirror left-right, mirror top-bottom, rotate 180. At the segment start the variant is picked from the run seed. In segment 2 the third level (the biome's challenge level L5, L10, ...) switches to a different variant of the same template (owner idea: same shape, other symmetry). Segment 1 keeps one variant for both levels.
- **TER-R3 Start of a run** (also from a checkpoint): the terrain of the start level's segment and variant is on the board, solid, before the first step.
- **TER-R4 Change at a level up** (new segment or variant switch): cells in both the old and the new layout stay; cells only in the old layout crumble (existing crumble effect); cells only in the new layout warn for `terrain.warnMs` (2000) and then turn solid. A warning cell with a snake cell on it stays warning until the snake leaves (same rule as TimedCells, MEC-004).
- **TER-R5 Collision.** Terrain is solid: hitting it kills like a rock or fence. Death cause `terrain` in the run log.
- **TER-R6 Shield on terrain** (owner 2026-11-11). When the head with an active Shield hits a terrain cell: the Shield is consumed; every terrain cell in a 3 wide x 4 long area ahead of the head breaks (the head sits at the middle of the near side; the area covers the 4 rows in the move direction, 1 column left and right of the head column); only terrain cells break, empty cells, mangoes and other hazards are untouched; broken cells stay open until the next TER-R4 change, which rebuilds them as new cells (warn, then solid). The snake then becomes invulnerable for `skills.shield.invulnMs` (2000).
- **TER-R7 Invulnerable** (owner 2026-11-11): the snake passes through every obstacle, hazard and its own body; the board edge (and the shrinking-board ring, MEC-018) still kills. The snake blinks. If the timer ends while the head is on an obstacle cell or a body cell, invulnerability lasts until the head is on a free cell. The existing bonk pause (MEC-006-R27) does not apply to a terrain hit. Shield on a normal hazard is unchanged (MEC-006-R26..R28).
- **TER-R8 Other systems.** The director never places a hazard, ground tile or mover path on a terrain cell; mangoes never spawn on terrain; the shrinking ring waits at a terrain cell (MEC-018 "waits while a hazard holds a ring cell"); Tail Snip and Mango Rain are unchanged. Terrain survives MEC-003-R8 level ups only through TER-R4.
- **TER-R9 Look.** Terrain uses the biome's rock and fence art. Each template has a display name shown on the biome/level banner when the terrain changes.

## 3. Fairness (every template x 4 variants, checked by a unit test)
- **TER-R10** All free cells form one connected region.
- **TER-R11** Corridors are at least 2 cells wide; no dead end 1 cell wide (the snake cannot reverse).
- **TER-R12** The snake start cells and the 4 cells ahead of the head are free.
- **TER-R13** Terrain covers at most `terrain.maxFraction` (0.12, about 35 of 289 cells); L1-2 (segment 1 of biome 1) has one short row only.
- **TER-R14** Bot fuzz: no single cause above 40% of deaths per biome (P2 exit rule); `terrain` deaths reported per template.

## 4. Technical shape
- **Data:** `config/terrain.json`, 12 templates: `{ id, biome, segment, name, rows: string[17] }`, `.` free, `R` rock, `F` fence (ASCII, readable as a picture). Numbers in `config/balance.json`: `terrain.warnMs`, `terrain.maxFraction`, `terrain.startAhead`, `skills.shield.terrainBreach { w: 3, len: 4 }`, `skills.shield.invulnMs`. Both validated at load.
- **Core:** `src/core/terrain.ts` (pure): segment of a level, variant pick, variant transforms, layout diff (keep / crumble / warn), `isTerrain(cell)`, breach area. Hooks into the sim step order for collision, Shield, invulnerability, director and mango exclusion.
- **Render:** a terrain layer in `src/game/render/` reusing rock/fence parts; banner text from the template name.
- **Docs:** new `docs/specs/mechanics/MEC-019-terrain.md`; edits to MEC-004 (director exclusion), MEC-006 (Shield on terrain, invulnerability), MEC-018 (ring waits), MEC-003 (segments), GDD §5.
- **Owner review of the art:** the 12 templates are shown as a picture board (all 4 variants) before merge.

## 5. Open (provisional defaults in use)
- Template names and shapes: drawn by the lead, reviewed by the owner on the board.
- Whether TER-R7 invulnerability should also follow a Shield hit on a normal hazard (today: no, only terrain).
