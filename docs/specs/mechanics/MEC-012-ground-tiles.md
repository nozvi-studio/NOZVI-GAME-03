# MEC-012 — Ground tiles: mud and ice

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P2a · Date: 2026-11-03

## 1. Purpose & links
- Defines the two ground-tile families: **mud** (the snake moves at half speed while its head is on it) and **ice** (the snake cannot turn while its head is on it). Neither can kill.
- GDD: §5.1 (biome 2 mud, biome 3 ice), §5.3 (fairness), §5.4 (catalogue rows "Mud tiles", "Ice tiles"; "Never use" list), §6.3 (Slow-mo), §7.
- Framework: MEC-004 (registry, GroundTiles block R5, collision R6, speed R7, fairness R11–R14, death context R15, level end R16, verification R17–R18). Design: P2 design §5, §8, §9, §10, §11.
- Related: MEC-001 (turn queue, step), MEC-002 (`reserved`, mango placement), MEC-003 (table, introduction, level up), MEC-006 (Slow-mo tick, Shield, step order), MEC-008 (speed ramp).

## 2. Player-facing summary
- **Mud (from level 7):** brown patches warn, then turn to mud. While your head is in mud, the snake moves at half speed. Mud never kills.
- **Ice (from level 13):** pale patches warn, then freeze. While your head is on ice you cannot turn: you slide straight until you are off. Turns you press meanwhile are kept and used as soon as you leave the ice. Every slide ends on a free cell, never at the board edge.
- Neither tile ever appears under the snake or right in front of it, and mangoes never spawn on them.

## 3. State & data
`SimState.families.mud` / `.ice` (JSON, MEC-004 §3):
| Field | Type | Meaning |
|---|---|---|
| `patches` | `TilePatch[]` | active instances, in spawn order |
| `nextId` | number | id for the next patch |
`TilePatch = {id, state: 'warn' | 'active' | 'fade', t, warnMs, lifeMs, cells: {x, y, on}[]}`; ice patches also have `ring: {x, y}[]`. `t` = ms in the current state. `on` = the cell's tile is active.
Descriptors: mud `{cause: null, capClass: 'small', maxActiveKey: 'mud.maxActive', breakable: false}`; ice `{cause: null, capClass: 'small', maxActiveKey: 'ice.maxActive', breakable: false}`.
Save fields: none.

## 4. Rules
### Spawn (both)
- **MEC-012-R1 Shape and tries.** `<family>` below is the config group `mud` or `ice`. RNG order, as P0 fences: `kind = rng.pick(<family>.shapePool)` → `transform(<family>.shapes[kind])` (P0: `int(4)` quarter turns, `chance(0.5)` mirror, normalize) → up to `<family>.tries` origins `ox = int(COLS − w + 1)`, `oy = int(ROWS − h + 1)`. A candidate is valid per MEC-004-R10 (in bounds, not `reserved`, MEC-004-R11 with d = `fairness.nearHeadDist`, MEC-004-R12; ice cells count as new BFS walls) plus R7 for ice. On the first valid candidate: `lifeMs = <family>.lifeMs + rng.next() × <family>.lifeRandMs` (P0 hazard life formula), state `warn`, `t = 0`, all cells `on = false`; emit `hazardIncoming {family}`.
- **MEC-012-R2 Lifecycle (GroundTiles, MEC-004-R5).** `warn` for `<family>.warnMs` (1500) → `active` for `lifeMs` → `fade` for `hazard.crumbleMs` (450) → removed. In `active`, a cell turns `on` at the first ms when no snake cell is on it; a cell that is never free stays off. In `fade` all cells are off. Patch timers run in sim time (Slow-mo does not slow them, MEC-006-R19) and keep running through a level up (MEC-003-R9).
- **MEC-012-R3 Not lethal.** `solidAt` and `headHit` are always false/null; no death cause. Shield ignores tiles.
- **MEC-012-R4 Level up.** No level-end hook (MEC-004-R16): patches keep their lifecycle through a level up (MEC-003-R8).

### Mud
- **MEC-012-R5 (mud) Reserved and BFS.** Mud cells are `reserved` in every state (no mango, orb, rain mango, rubble or other hazard on them). They are not BFS walls.
- **MEC-012-R6 Half speed.** `tileAt(x, y) = 'mud'` for an `on` mud cell. In each speed update, `tileFactor = mud.tickFactor` (2) if `tileAt(head) = 'mud'`, else 1, and the effective tick is MEC-004-R7: `round(baseTickMs × slowFactor × tileFactor)`. The head cell is read at every 1 ms step, so the step after entering mud takes the slow tick and the step after leaving takes the normal tick (MEC-006-R18 clamp prevents a double step).

### Ice
- **MEC-012-R7 Ring.** The ring of an ice candidate = every 4-neighbour of a patch cell that is not a patch cell. A candidate is valid only if every ring cell is in bounds and not `reserved` at spawn. The ring is stored with the patch.
- **MEC-012-R8 (ice) Reserved and BFS.** Ice cells and ring cells are `reserved` in every state. Ice cells are BFS walls in every state (conservative rule 3: the mango stays reachable without crossing ice). Ring cells are not BFS walls.
- **MEC-012-R9 No turning.** `tileAt(x, y) = 'ice'` for an `on` ice cell. In the snake step, if `tileAt(head before the move) = 'ice'`, the step does **not** take a direction from the turn queue and moves in the current `dir`. `turn()` keeps working with the MEC-001-R1 rules (max 3, compared with the last queued direction), so turns pressed on ice wait in the queue. The first step that starts off active ice takes one queued turn as usual.
- **MEC-012-R10 Safe exits.** Because the ring is in bounds and reserved for the patch's whole life (R7, R8), a slide always leaves the patch onto an in-bounds cell holding no hazard, mango, orb or rain mango. Only the player's own body or snip wall (MEC-006, player-made) can be there; collisions with them follow MEC-004-R6.

### Introduction and context
- **MEC-012-R11 Table.** `level.table` rows L7…30 get `mud: 2`; rows L13…30 get `ice: 2` (P2 design §11; P2c retunes). Mud is introduced at L7, ice at L13 (MEC-003-R16 holds: L6 fence, L11 terrain, L12 rotten rock).
- **MEC-012-R12 Death context.** MEC-004-R15: `died.context = 'ice' | 'mud'` when the head started the fatal step on an active tile of that kind.

## 5. Edge cases
1. **Ice melts during a slide** (patch enters `fade`): the next step starts off active ice and dequeues normally.
2. **Head enters a warning ice cell** (not `on`): no effect; turning is free.
3. **Ice cell under the body when the patch activates:** that cell stays off until the body leaves (R2); the patch may be partly active.
4. **Three turns queued during a long slide, a fourth pressed:** ignored (MEC-001-R1 max 3).
5. **Slide ends into the snake's own body or a snip wall:** death `self` / `snipWall` with context `ice` (or Shield breaks the snip wall).
6. **Mud with Slow-mo at base tick 128 (L7):** `round(128 × 1.6 × 2)` = 410 ms; without Slow-mo 256 ms.
7. **Shield bonk on mud:** MEC-006-R27 uses the effective tick, so the bonk pause is longer on mud (3 × the slowed tick).
8. **Checkpoint ramp on mud:** the ramp tick is the base tick and is multiplied by 2.
9. **Level up with the head on mud or ice:** patches stay and keep their own lifetime (MEC-003-R8); the snake keeps stepping with the patch effect.
10. **Two ice patches:** each ring must avoid the other's cells and ring (reserved), so the rings never overlap and two patches always have at least 2 free cells between them; a mud patch can never touch an ice patch (its cells would be on the ring).
11. **Ice candidate touching the board edge:** its ring is out of bounds, so it is rejected; ice never uses the outer ring of the board.
12. **Mango unreachable except across ice:** MEC-004-R12 rejects that ice candidate.
13. **Head on mud when the mud patch fades:** the next speed update uses factor 1.

## 6. Interactions with other mechanics
- **MEC-001:** R9 changes the dequeue step only while on active ice; queue rules unchanged (P2 design §20 item 8).
- **MEC-002:** tiles and ice rings are `reserved` (MEC-004-R3); ice cells are BFS walls for the "good" set and the fair-rock check.
- **MEC-003:** table rows and introductions (R11); tiles survive a level up (R4); timers keep running.
- **MEC-004:** GroundTiles block, small cap, `maxActive`, fairness rules, death context, verification layers.
- **MEC-006:** Slow-mo × mud multiply (MEC-004-R7); Shield never interacts with tiles; orbs and rain drops never land on tiles or rings.
- **MEC-008:** ramp tick × mud factor.

## 7. Core API changes
- `FamilyKey` adds `mud | ice`. `TileKind = 'mud' | 'ice'` (MEC-004 §7).
- `SimSnapshot` adds `tiles: {family: TileKind, id, state: 'warn' | 'active' | 'fade', leftMs, cells: {x, y, on}[]}[]` and `headTile: TileKind | null` (= `tileAt(head)`).
- `hazardIncoming {family: 'mud' | 'ice'}`; `died.context` (MEC-004-R15).
- Modules: `src/core/hazards/blocks/groundTiles.ts`, `src/core/hazards/mud.ts`, `src/core/hazards/ice.ts`, each main function with `// MEC-012-Rn`.

## 8. Feedback (greybox)
- Mud: brown tile with three dark dots; warning: dashed outline blink + mud-drop icon. Head on mud: the snake's interpolation simply runs at the slower tick (visible), plus small drip marks at the head.
- Ice: very light blue tile with two diagonal shine lines (shape, not color only); warning: dashed outline blink + snowflake icon. Head on ice: a small arrow ahead of the head in `dir`; queued turns show as a faint arrow at the patch exit.
- Text keys: `banner.new.mud` "Mud! You slow down while your head is in it.", `banner.new.ice` "Ice! You slide straight until you're off it.", `death.context.mud`, `death.context.ice` (MEC-004 §8).
- Sounds: reuse P0 `land` (quiet) when a patch activates; no new assets.

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `mud.warnMs` / `lifeMs` / `lifeRandMs` | 1500 / 9000 / 3000 | lead (rock-like warn; GDD §5.3 rule 1) |
| `mud.tries` / `maxActive` / `tickFactor` | 40 / 2 / 2 | lead; GDD §5.4 "half speed" |
| `mud.shapePool` | `["pair", "line3", "square", "plus"]` | lead |
| `mud.shapes` | pair `[[0,0],[1,0]]` · line3 `[[0,0],[1,0],[2,0]]` · square `[[0,0],[1,0],[0,1],[1,1]]` · plus `[[1,0],[0,1],[1,1],[2,1],[1,2]]` | lead |
| `ice.warnMs` / `lifeMs` / `lifeRandMs` | 1500 / 10000 / 4000 | lead |
| `ice.tries` / `maxActive` | 40 / 2 | lead |
| `ice.shapePool` | `["line2", "line3", "line4", "square"]` | lead |
| `ice.shapes` | line2 `[[0,0],[1,0]]` · line3 `[[0,0],[1,0],[2,0]]` · line4 `[[0,0],[1,0],[2,0],[3,0]]` · square `[[0,0],[1,0],[0,1],[1,1]]` | lead (slides ≤ 4 cells) |
`parseBalance` checks: `warnMs ≥ 900` (MEC-004-R13), positive integers, `tickFactor > 1`, every `shapePool` name exists in `shapes`, every shape non-empty and 4-connected.

## 10. Acceptance tests
- `MEC-012-R1 mud spawn picks shape, transforms and tries origins in P0 fence RNG order`
- `MEC-012-R1 no tile cell spawns near the head or in the front lane`
- `MEC-012-R2 tile patch warns 1500 ms, is active for its life, fades 450 ms, then is removed`
- `MEC-012-R2 a tile cell under the snake stays off until the snake leaves`
- `MEC-012-R3 entering mud or ice never kills and never consumes shield`
- `MEC-012-R5 mango orbs and hazards are never placed on mud`
- `MEC-012-R6 head on active mud doubles the tick: L7 256 ms, with slow-mo 410 ms`
- `MEC-012-R6 leaving mud causes at most one immediate step`
- `MEC-012-R7 ice candidate touching the edge or a reserved ring cell is rejected`
- `MEC-012-R8 ice cells are BFS walls and ring cells are reserved`
- `MEC-012-R9 turns queued on ice are applied on the first step off the ice`
- `MEC-012-R9 head on warning ice can turn`
- `MEC-012-R10 fuzz: every slide exit is in bounds and holds no hazard mango orb or rain mango`
- `MEC-012-R11 mud is introduced at L7 and ice at L13 only`
- `MEC-012-R12 died context is mud or ice for deaths starting on that tile`
- `MEC-012-EC10 a mud patch never touches an ice patch`
- Fuzz (MEC-004-R17/R18): I1–I7 and the escape check for mud and ice, solo and full table.

## 11. Lead decisions & escalations
### Lead decisions
- **L1** Mud is `reserved` for all placement: no mango or orb in mud (keeps "where is the mango" readable; mud tests rhythm on the way, not at the target).
- **L2** Half speed = effective tick × 2, read from the head cell every 1 ms step; stacks multiplicatively with Slow-mo (P2-D5).
- **L3** Turns pressed on ice stay queued and apply after the slide ("planning ahead", GDD §5.4), instead of being dropped.
- **L4** The 4-neighbour ring of an ice patch must be in bounds and free at spawn and stays reserved, so every slide exits onto a free cell and ice never touches the board edge.
- **L5** Ice cells are BFS walls (conservative rule 3); mud is not (it never blocks a path).
- **L6** Both are small-cap families with max 2 active; patch sizes 2–5 (mud) and 2–4 (ice) cells.
- **L7** Tiles activate per cell only when no snake cell is on them (same "never appears inside the snake" rule as hazards).
### Escalate to owner
- None.
