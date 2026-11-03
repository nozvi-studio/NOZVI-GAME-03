# P0 Foundation — design

> **Status:** Approved (lead, delegated by owner 2026-11-03) · **Date:** 2026-11-03 · **Phase:** P0 (GDD §11), milestone M1
> **Scope source:** GDD §11 row "P0 Foundation", column "In scope" only. Nothing from P1 or later.
> **Behavior source:** `prototype/mango-snake-hard.html` (line numbers below refer to it). This document is the behavior spec for the P0 port of MEC-001…MEC-004. The separate `docs/specs/mechanics/MEC-xxx.md` files are written in P1, when the rules change.

## 1. Goal and exit criteria
Rebuild the prototype's core loop on the production stack, with the same behavior and numbers, so that P1 can change the rules on a tested base.

Exit criteria (GDD §11):
1. Parity with the prototype's core loop (checked with §7.4 checklist).
2. `npm test` and `npm run typecheck` pass.
3. No console errors (desktop browser and phone browser).
4. Runs on a phone browser (portrait, touch).

## 2. Owner decisions taken in this design (2026-11-03)
| # | Decision | Rejected alternatives |
|---|---|---|
| D1 | Phaser **3.90.0** (last 3.x release) | Phaser 4.2.1 (current `latest`; would change the approved stack); a spike comparing both |
| D2 | P0 ports the **prototype's values**, not GDD v0.2 values. GDD v0.2 values arrive with the P1 rule changes | GDD v0.2 values now (parity no longer checkable); hybrid |
| D3 | HUD, banner, overlays, D-pad and sound button are **Phaser game objects** | Phaser board + DOM HUD like the prototype |
| D4 | Save skeleton = versioned envelope + 2 fields (best score, sound) | Full GDD §8.4 schema now |
| D5 | TypeScript 7.0.2 preferred; verified in the first PR, fallback 6.0.3 | Pin 6.0.3 or 5.9.3 without trying 7 |
| D6 | Core time model: integer-millisecond fixed step (§4) | Everything in snake ticks (breaks parity); variable frame `dt` in core (not deterministic) |
| D7 | MEC spec files are written in P1; this document specifies P0 behavior | Write MEC-001/002/004 specs for the old rules now |
| D8 | Hazard families behind a minimal registry interface; plain-data Sim state + clone() (lead, 2026-11-03, for P1/P2) | ad-hoc per-family branches; refactor in P2 |

## 3. Architecture
Matches GDD §13. Module boundaries move to `docs/ARCHITECTURE.md` in the scaffold PR.

```
config/balance.json        every tuning value of the prototype (§6)
src/core/                  pure TypeScript. No Phaser, no DOM, no Math.random, no Date/performance
  types.ts                 public API types: Sim, SimState, SimSnapshot, SimEvent, CauseKey, FamilyKey, HazardFamily
  balance.ts               Balance type + parseBalance(json): validates and throws a readable error
  rng.ts                   seeded RNG (mulberry32): next() in [0,1), int(n) = floor(next()·n), pick(arr) = arr[int(len)], chance(p) = next() < p
  grid.ts                  key(), inBounds(), nearHead(), reachable() BFS (walls via predicate)  MEC-004
  cells.ts                 cellReserved / cellBfsWall / cellSolidCause: snake, rotten rocks, mango, then registry  MEC-004
  snake.ts                 direction queue, step, wall/self collision               MEC-001
  mango.ts                 placement, golden roll, rot timer, rotten rock          MEC-002
  level.ts                 progress, needFor(), tickMs(), unlocks                   MEC-003 (10-level version)
  hazards/shapes.ts        rock shapes, fence shapes, line fence, transform(), maze layouts
  hazards/timed.ts         shared warn → solid → crumble lifecycle of rock/fence/maze  MEC-004
  hazards/rock.ts · fence.ts · maze.ts · terrain.ts   one HazardFamily each (§4.1)  MEC-004
  hazards/registry.ts      FAMILIES (ordered array) + FAMILY lookup
  hazards/director.ts      spawn timer, cap, weighted pick with retry, big-event exclusion
  sim.ts                   createSim(balance, seed) → Sim; plain-data SimState; clone()
  index.ts                 the only public entry of src/core
src/meta/                  pure TypeScript
  storage.ts               interface KeyValueStore { get(k), set(k, v) } + memory implementation
  save.ts                  load/save of the versioned envelope, validation, migrations
  index.ts
src/game/                  Phaser 3.90.0
  main.ts                  Phaser.Game config: Scale.FIT, portrait, parent div, background color
  scenes/BootScene.ts      parse balance, load save, start Game + Hud scenes
  scenes/GameScene.ts      owns the Sim; greybox board rendering with interpolation
  scenes/HudScene.ts       score, best, level bar, banner, overlay card (Play/Resume/Play again), pause, sound, D-pad
  render/*.ts              drawing helpers per layer (palette, board, hazards, mango, snake, effects) to keep scenes small
  flow/runFlow.ts          pure run state machine (ready/countdown/playing/paused/over), no Phaser import; unit-tested
  flow/clock.ts            pure frame-delta clamp + fractional carry → integer ms; unit-tested
  input/keyboard.ts · swipe.ts · dpad.ts   all go through the flow rules of §7.1
  input/swipeMath.ts       pure: CSS-pixel delta + threshold → direction or null
  audio/synth.ts           WebAudio port of the prototype sfx + navigator.vibrate
  platform/localStore.ts   KeyValueStore backed by localStorage (try/catch like the prototype)
  text.ts                  player-facing strings (§7.5)
index.html                 single div + module script; Baloo 2 font link kept as in the prototype
```

Rules:
- `src/game` imports `src/core` and `src/meta` only through their `index.ts`. `src/core` and `src/meta` never import `src/game` or each other's internals (`src/meta` does not need core in P0).
- The core never holds player-facing strings. Events carry keys (`cause: 'fence'`), and `src/game/text.ts` turns them into text.
- `Math.random` is allowed only in `src/game` for cosmetic effects (particles). Every random number that changes gameplay comes from the core RNG.
- Files stay under ~300 lines (CODEMAP convention).

## 4. Core time model and API
```ts
interface Sim {
  turn(dx: -1 | 0 | 1, dy: -1 | 0 | 1): void;  // ignored after the run is over
  advance(ms: number): void;                     // ms must be a non-negative integer; no-op after `over`
  drainEvents(): SimEvent[];                     // events since the last call, in order
  snapshot(): Readonly<SimSnapshot>;             // read-only view for rendering
  clone(): Sim;                                  // independent copy: structuredClone of the state
}
```
- **Plain-data state:** all Sim state (snake, mango, hazards, terrains, timers, pending events, RNG state as a 32-bit integer) is one JSON-serializable `SimState` object: no closures, `Map`/`Set` or class instances. Behavior lives in functions that take the state. `clone()` deep-copies it with `structuredClone`; the clone and the original then evolve independently and identically for identical inputs. Purpose: needed by the P2 fairness search and bot.
- `advance(ms)` runs `ms` steps of exactly 1 ms. Each step runs the prototype `frame()` order (L999–1004): director → hazards → terrains → speed update → mango rot check → snake step when the tick accumulator reaches `tickMs` (at most one snake step per 1 ms step, since `tickMs ≥ 95`). Once status is `over`, `advance` does nothing.
- Same seed + same balance + same sequence of `turn` calls at the same sim times ⇒ identical state. The result does not depend on how the caller splits time into `advance` calls.
- **Accepted difference:** the prototype applies a whole frame `dt` at once, so within one frame the timing of a spawn, landing, rot or step may differ from the prototype by up to one frame. Parity is judged per behavior, not per frame.
- The game layer clamps the frame delta to `flow.maxFrameDeltaMs` (100), adds it to a fractional carry and passes the integer part to `advance`.
- Run, countdown and pause live in the game layer (§7.1). The game layer creates one `Sim` per run with a seed from `crypto.getRandomValues` (in `src/game`) and logs it with `console.info` so a run can be replayed.
- `SimSnapshot`: `snake` (cells, head first), `dir`, `heading` (last queued direction, else `dir`; used by the D-pad), `headFrom`, `tailFrom`, `tickAlpha`, `mango` ({x, y, golden, leftMs, totalMs, ageMs} or null), `rottenRocks`, `hazards` (type, state, t, warnMs, lifeMs, cells with `on` and `ageMs`, fence `kind`), `terrains` (t, lifeMs, cells with `vis`, `delay`), `score`, `level`, `progress`, `need`, `tickMs`, `status` ('playing' | 'over'), `outcome` (null | {won: boolean, cause?: CauseKey}).
  - `tickAlpha = status === 'over' ? 1 : min(1, acc / tickMs)` (L1007).
  - `headFrom`/`tailFrom`: at reset = current head / current tail (L634–635). Before each move = old head / old tail (L778–779). After eating, `tailFrom` = current tail, so the tail does not slide (L794). On death both stay unchanged (L777 returns first).
- `SimEvent`: `ate {x, y, golden, points}`, `levelUp {level, unlocked?: 'fence' | 'terrain' | 'maze'}`, `landed {hazardType}`, `dust {x, y}`, `rotted {x, y, leftRock}`, `hazardIncoming {family: 'fence' | 'maze' | 'terrain'}`, `died {cause, x, y}`, `boardFull`.
- `CauseKey`: `wall | self | rotten | rock | fence | maze | ground` (prototype `CAUSES`).

### 4.1 Hazard family registry (`src/core/hazards/registry.ts`)
```ts
type FamilyKey = 'rock' | 'fence' | 'maze' | 'terrain';
interface HazardFamily<S extends { family: FamilyKey }> {
  key: FamilyKey;
  cause: CauseKey;                                     // rock→'rock', fence→'fence', maze→'maze', terrain→'ground'
  capClass: CapClass;                                  // rock, fence: 'small'; maze, terrain: 'big'
  spawn(ctx: SpawnCtx, rng: Rng): S | null;         // placement rules of §5, unchanged
  update(state: S, ctx: StepCtx): 'keep' | 'remove';   // one 1 ms step
  solidAt(state: S, x: number, y: number): boolean;    // collision
  bfsWallAt(state: S, x: number, y: number): boolean;  // reachability walls
  reservedAt(state: S, x: number, y: number): boolean; // placement reserved
  breakable: boolean;                                  // false for all in P0 (Shield is P1)
}
```
Reproduces the prototype exactly:
- **Cap:** the prototype counts `hazards.filter(h => h.type !== 'maze')` (L540). Terrains are a separate list (`terrains`), so they never count. Hence `capClass` is `'small'` for rock and fence only.
- **Per family:** rock/fence/maze share `hazards/timed.ts` (`solidAt` = cell `on`; `bfsWallAt` and `reservedAt` = cell present in any state). Terrain: `solidAt` = cell `up`; `bfsWallAt` = false (L373 checks only rotten rocks and `hazards`); `reservedAt` = cell present in any state.
- **State layout:** `SimState.hazards` holds rock/fence/maze instances in spawn order (prototype `hazards` array) and `SimState.terrains` holds terrain instances (prototype `terrains`). Each instance carries its `family` key.
- **Update order:** all `hazards` in spawn order, then all `terrains` (L1000–1001); removal after the pass (L575, L595). This keeps the event order.
- **Queries** (`cellReserved`, `cellBfsWall`, `cellSolidCause` in `src/core/cells.ts`) check snake/rotten rocks as today, then families in `FAMILIES order ['rock', 'fence', 'maze', 'terrain']`. Because placement never lets two hazard/terrain cells overlap, this order gives the same answer as the prototype's list scans; cause order stays `rotten` → hazard type → `ground`. Snapshot lists also follow spawn order.
- **Spawning:** the director (`director.ts`) keeps the option list, weights and retry logic of §5 and calls `FAMILIES[key].spawn`. On success it pushes the instance, emits `hazardIncoming` (fence, maze, terrain) and, for maze, sets the maze cooldown. No RNG call moves.
- `SpawnCtx` and `StepCtx` are per-call views (they may hold functions); they are never stored in `SimState`.

## 5. Port of MEC-001…MEC-004 (behavior to keep exactly)
Port function by function. Names follow the GDD domain terms. Each main function has a one-line `// MEC-00x` comment.

### MEC-001 Snake (prototype `turn`, `step`)
- Start: cells (8,8), (7,8), (6,8); direction right; empty queue.
- `turn`: compare with the last queued direction (or the current one if the queue is empty). Ignore a reverse and ignore the same direction. Queue at most 3 turns.
- Step: take one queued direction, then compute the new head. "Eating" = new head is on the mango. The body used for self-collision includes the tail only when eating (otherwise the tail moves away this step). Cause order: `wall` → `self` → solid cell cause (`rotten` → hazard type → `ground`). On death: status `over`, emit `died`; nothing moves.
- Solid cell (L341–345): a rotten rock always; a hazard cell only when `on` (warning, crumbling and not-yet-landed cells are passable); a terrain cell only when `up` (`down` and `warn` are passable).
- On eating: score += 1 (golden 3), eaten += 1, progress += 1 (golden 2), place a new mango; the snake grows by 1 (no tail pop). If no mango can be placed: status `over`, outcome `won`, emit `boardFull`.

### MEC-002 Mangoes (prototype `placeFood`, `rot`)
- Reserved (L348–351) = snake, rotten rock, any hazard cell in any state, any terrain cell, the mango if present. Placement first clears the current mango (L382), then scans (L386), so the old mango cell is not reserved for mango placement (it stays reserved for hazard placement while the mango exists). Candidates: every cell not reserved. "Good" = also reachable (BFS) and not near the head with distance 3. Pick from good, else from any; if both are empty, placement fails. So after an unfair rot (no rock left) the same cell can be picked again.
- Golden: rolled after the cell pick, only when eaten ≥ 3 (no RNG call below 3), with chance 0.15.
- Rot time: `max(4000, 8000 − 150 × eaten) × (golden ? 0.5 : 1)` ms.
- When the timer runs out: the mango is "fair" if it is reachable and not near the head (distance 3). Fair → a permanent rotten rock on that cell (added before the new placement, so it reserves the cell). Always emit `rotted` and place a new mango (failure → board full, as above).

### MEC-003 Levels, 10-level prototype version (prototype `addProgress`, `updateSpeed`)
- Level is 0-based inside the core (`level + 1` is shown). Max level index 10 (shown as "Level 11", bar shows "Max level"; progress stays 0).
- `needFor(level) = 4 + level`. Progress overflow carries into the next level (while loop).
- `tickMs = max(95, 140 − 4 × level)`.
- Unlocks (0-based): fence 2, terrain 4, maze 6. `levelUp` carries the unlocked family for the banner.

### MEC-004 Obstacles, director and fairness (prototype obstacles section)
- `nearHead(x, y, d)`: Manhattan distance to the head < d, **or** one of the 4 cells straight ahead of the head (always 4, independent of d). "Ahead" uses the current `dir`, not queued turns (L356).
- `cellFree(x, y, d = 4)`: in bounds (so off-board cells are rejected), not reserved, not near the head.
- `reachable()`: BFS from the head over in-bounds cells; walls = snake body without the last cell, rotten rocks, and every hazard cell **in any state, including warning** (prototype behavior, kept on purpose). Terrain cells are not walls for BFS (prototype behavior, kept).
- Hazard lifecycle: `warn` (warnMs) → `solid` (lifeMs) → `crumble` (450 ms) → removed. In `solid`, a cell turns `on` only when the snake is not on it; until then it keeps warning. The first cell that lands emits `landed`; every landing cell emits `dust`. Hazard life = `lifeMs + next() × lifeRandMs`, drawn only after a successful placement.
- Rocks: shape pool by level — < 2: single; < 4: + lineH, lineV; else + corner, block. The shape is picked once, before the tries (L429). 40 tries; origin `int(COLS), int(ROWS)`, not clamped, so shapes may stick out and are then rejected by `cellFree`. warn 1500, life 6000 + rng × 4000.
- Fences: pool line, L; from fence unlock + 1: + T, Z; from + 2: + F, U, plus. RNG order: pick kind → (line only) length `5 + int(1 + min(4, level − fenceUnlock))`, then if length ≥ 7 one gap at index `1 + int(len − 2)` → `transform` once: `int(4)` quarter turns of `[x, y] → [−y, x]`, then `chance(0.5)` mirror `[x, y] → [−x, y]`, then shift so min x and min y are 0. Then 60 tries with origin `int(COLS − w + 1), int(ROWS − h + 1)` (w, h = transformed size). warn 2000, life 9000 + rng × 4000. Emits `hazardIncoming fence`.
- Mazes: one of the 4 hand-made layouts; drop cells that are not free; reject if < 6 cells left. warn 2600, life 14000 + rng × 4000; sets maze cooldown 26000. Emits `hazardIncoming maze`.
- Terrain (rising ground): 40 tries. Per try: `chance(0.5)` → **wave**: `horiz = chance(0.5)`, `len = 6 + int(3)`, origin `ox = int(horiz ? COLS − len + 1 : COLS − 1)`, `oy = int(horiz ? ROWS − 1 : ROWS − len + 1)`; cells i < len, j < 2 (wave width 2) at `horiz ? (ox+i, oy+j) : (ox+j, oy+i)`, delay i × 260 ms. Else **checker**: origin `int(COLS − 3), int(ROWS − 3)`; 4×4 cells (i, j < 4), delay ((i + j) mod 2) × period / 2. Keep cells free with d = 3; need ≥ 6. life 18000 + rng × 6000. Cycle: start delay 600, period 3400 = down 1100 → warn 900 → up 1400. A cell that wants to rise while the snake is on it stays `warn`. After life, all cells go down and the terrain is removed 500 ms later. Emits `hazardIncoming terrain`.
- Director: first spawn after 2500 ms; then interval `max(2000, 5000 − 300 × level)`. Small-hazard cap `min(8, 2 + floor(level / 2))` counts non-maze hazards in any state (warn, solid, crumble). Options, in this order, with weights: rock 3 and (from fence unlock) fence 2 when under the cap; terrain 2 when unlocked, no maze active and terrains < (level ≥ 8 ? 2 : 1); maze 2 when unlocked, cooldown ≤ 0, no maze active and no terrain. Weighted pick (L550–551): `total = sum(w); r = next() × total; i = 0; while (i < n − 1 && r > w[i]) { r -= w[i]; i++ }`. If option i fails to place, remove it and pick again (new `total`, new `next()`) until one succeeds or none is left.
- RNG consumption order follows the prototype call order, so behavior is reproducible per seed (it will not match the prototype's `Math.random` runs, which are not reproducible).

## 6. `config/balance.json`
Every number below comes from the prototype. The game reads it through `parseBalance`; tests use the same file.

| Group | Keys (prototype value) |
|---|---|
| board | cols 17, rows 17 |
| snake | start [[8,8],[7,8],[6,8]], startDir [1,0], maxQueuedTurns 3 |
| speed | startMs 140, minMs 95, msPerLevel 4 |
| level | maxLevel 10, needBase 4, needPerLevel 1, unlock {fence 2, terrain 4, maze 6} |
| mango | rotBaseMs 8000, rotPerEatenMs 150, rotMinMs 4000, goldenRotFactor 0.5, goldenChance 0.15, goldenMinEaten 3, points {normal 1, golden 3}, progress {normal 1, golden 2}, nearHeadDist 3 |
| fairness | nearHeadDist 4, frontLaneCells 4, terrainNearHeadDist 3 |
| hazard | crumbleMs 450 |
| rock | warnMs 1500, lifeMs 6000, lifeRandMs 4000, tries 40, shapePoolByLevel [{minLevel 0: single}, {2: lineH, lineV}, {4: corner, block}], shapes |
| fence | warnMs 2000, lifeMs 9000, lifeRandMs 4000, tries 60, lineBase 5, lineExtraMax 4, gapMinLen 7, mirrorChance 0.5, poolAfterUnlock [{offset 0: line, L}, {1: T, Z}, {2: F, U, plus}], shapes |
| maze | warnMs 2600, lifeMs 14000, lifeRandMs 4000, minCells 6, cooldownMs 26000, layouts (segments + excluded cells) |
| terrain | periodMs 3400, upMs 1400, warnMs 900, startDelayMs 600, fadeOutMs 500, lifeMs 18000, lifeRandMs 6000, tries 40, minCells 6, waveChance 0.5, horizChance 0.5, waveLenMin 6, waveLenRand 3, waveWidth 2, waveDelayMs 260, checkerSize 4, maxActive 1, maxActiveLate 2, lateLevel 8 |
| director | firstSpawnMs 2500, intervalBaseMs 5000, intervalPerLevelMs 300, intervalMinMs 2000, capBase 2, capPerLevels 2, capMax 8, weights {rock 3, fence 2, terrain 2, maze 2} |
| flow | countdownMs 1500, countdownDigits 3, maxFrameDeltaMs 100, deathCardDelayMs 550 |
| ui | bannerMs 1800, swipeMinPx 18, swipeBoardFactor 0.05, haptics {eatMs 12, level [15, 40, 15], deathMs 90}, terrainFadeInMs 600, hazardFlickerMs 1500 |

Shape tables (rock shapes, fence shapes, maze layouts) are level design data and also live in the config. `parseBalance` checks types, positive values and `minMs ≤ startMs`. The terrain checker origin is `int(COLS − checkerSize + 1)` and the wave's cross origin is `int(COLS − waveWidth + 1)`, which give the prototype's `COLS − 3` and `COLS − 1`.

## 7. Game layer (greybox)
### 7.1 Screens and flow
One portrait layout (logical size about 540 × 960, Scale.FIT, centered): header (title, score, best, sound, pause) → level bar → square board → D-pad. States: `ready` → `countdown` → `playing` ⇄ `paused` → `over`.
- **ready:** start card (title, text, legend, best line, "Play"). Best line = `Best score N` if best > 0, else empty (L1013).
- **Start a run** (Play button, Space, or any turn input in `ready`/`over`): create a new `Sim` (new seed), hide banner and overlay, enable the pause button, go to `countdown`, unlock audio.
- **countdown** (1500 ms, digits 3-2-1 over the board): a tick sound on each new digit, the "go" sound at 0, then `playing`.
- **Turn input:** in `ready`/`over` it starts a run and then forwards the same turn to the new Sim (so it is queued); in `countdown` and `playing` it is forwarded (queued during countdown); in `paused` the game layer drops it (L699–700).
- **Pause:** `P`, `Esc` and `Space` pause from `playing`/`countdown` and resume from `paused`; only `Space` also starts a run from `ready`/`over` (L724–729). The pause button toggles pause/resume and is disabled in `ready` and `over`. Tab hidden and window blur pause. Paused card: "Paused" / resume text / "Resume"; resume runs a new countdown.
- **Sound:** `M` and the sound button toggle sound; the setting is saved; turning sound on plays the eat chirp (L272).
- **Banners** (level up, fence/maze/terrain incoming): shown for `ui.bannerMs` (1800 ms), a new banner replaces the old one; hidden at run start and at game over.
- **over:** the best score is saved at run end when score > best. If died (not won): die sound, death haptic, red flash, burst at the head, screen shake (each subject to reduced motion as in §7.2). A won run (board full) plays none of these. The death card appears after `reduceMotion ? 0 : 550` ms (only if still `over`): title, `<cause or won text> Score S, level L.`, "Play again", best line = "New best score!" if a new best and score > 0, else `Best score N` if best > 0, else empty (L693).
- The legend is part of the overlay card and is shown on every card (start, paused, death), as in the prototype (L144–148; `showOverlay` never hides it).

### 7.2 Rendering (flat greybox, prototype colors)
Checkerboard drawn once to a texture. Rocks, fences (rails toward neighbors), hedges, rising ground (fade in over `ui.terrainFadeInMs`), warnings (blink speeds up as landing approaches), solid hazards flicker in their last `ui.hazardFlickerMs`, mango with rot ring (throbs below 30%), snake as one thick rounded path from the interpolated head to the interpolated tail, eyes (closed when dead), particles, "+N" floats, level glow, death flash, screen shake. Light/dark palette follows `prefers-color-scheme`. `prefers-reduced-motion` disables shake, particles, bob, pop and blink, and makes the death card delay 0, as in the prototype.

### 7.3 Input and audio
- Keyboard: arrows/WASD.
- Swipe: starts only on a pointer down on the board (including the overlay card area, but not its button, L747); ends on pointer up or pointer cancel. Deltas and threshold are in CSS pixels: deltas from `pointer.event.clientX/clientY`; threshold `max(ui.swipeMinPx, boardCssPx × ui.swipeBoardFactor)` with `boardCssPx = boardLogicalPx / scale.displayScale.x`. When either |dx| or |dy| reaches the threshold: the axis with the larger delta wins, and a tie (|dx| = |dy|) goes vertical (L755). After each attempted turn the start point is re-anchored to the current pointer.
- D-pad: react on pointer down, show `heading` and dim the reverse button.
- Audio: synth tones eat, golden, level, land, rot, tick, go, die; unlocked on the first user gesture. Haptics from `ui.haptics`: eat 12 ms, level [15, 40, 15], death 90 ms.

### 7.4 Parity checklist (manual, recorded in `docs/PLAYTEST.md`)
Side by side with the prototype on desktop and on a phone: start/pause/resume/countdown flow; turning feel, buffered double turns, no reverse; eating, growth, golden mango; rot ring and rotten rock; level bar and banners at levels 3, 5, 7; each obstacle family appears, warns, lands, avoids the snake and crumbles; death causes and texts; best score kept after reload; sound toggle kept after reload. The entry must also state that prototype saves are not carried over (§8).

### 7.5 `text.ts` string table (verbatim from the prototype)
| Key | Text |
|---|---|
| page title (index.html) / start card title | `Mango Snake: Hard` |
| header title | `Mango Snake` + small `hard` |
| stat labels | `score`, `best` |
| start text | `Fill the bar with mangoes to level up. Each level brings new obstacles.` |
| legend | `Lands soon` (red), `Ground rising` (orange), `Mango rotting` (ring) |
| buttons | `Play`, `Resume`, `Play again` |
| paused | title `Paused`, text `You get a short countdown when you resume.` |
| level bar | `Level ${level + 1}`, `${progress}/${need} mangoes`, `Max level` |
| level banners | `Level ${level + 1}: ${name} unlocked` (names: fence `fences`, terrain `rising ground`, maze `hedge mazes`), else `Level ${level + 1}: a bit faster` |
| hazard banners | `Fence incoming`, `Maze incoming`, `The ground is shaking` |
| death card | titles `Game over` / `You filled the board!`; message `${why} Score ${score}, level ${level + 1}.`; won `why` = `No room left for mangoes.` |
| best line | `New best score!`, `Best score ${best}` |
| causes | wall `You hit the edge of the board.` · self `You bit your own tail.` · rotten `You hit a rock left by a rotten mango.` · rock `A falling rock got you.` · fence `You ran into a fence.` · maze `You ran into a hedge.` · ground `The ground rose in front of you.` |

## 8. Save skeleton (`src/meta`)
- One localStorage key: `mango-snake.save`.
- Envelope: `{ "version": 1, "data": { "bestScore": 0, "settings": { "sound": true } } }`.
- `load(store)`: missing, unparsable, wrong shape or unknown future version → defaults (never throws). Older version → run `migrations[from]` in order up to the current version (the list is empty in P0, but the loop is tested with a fake v0 → v1 migration).
- `save(store, data)` writes the full envelope; storage errors are swallowed (prototype behavior), returning `false`.
- The prototype's old keys (`mango-snake-hard2-best`, `mango-snake-sound`) are not imported: old prototype saves (best score, sound setting) are not carried over. The PLAYTEST parity entry must state this.

## 9. Test strategy
Vitest, `node` environment, test names start with the requirement ID.
1. **Unit tests per core module, written first (TDD):** RNG determinism and ranges; BFS walls and pockets; turn queue (limit 3, no reverse, no repeat); collision causes and their order; warning/crumbling hazard cells and non-`up` terrain are passable; moving into the cell the tail just left; eating near the tail; golden gating; rot formula, fair/unfair rotten rock, and re-picking the same cell after an unfair rot; hazard timeline warn → solid → crumble → removed; a solid cell never turns on under the snake; terrain waits for the snake; director unlocks, cap, weighted pick and retry, maze/terrain exclusion and maze cooldown; `needFor`, overflow, max level, `tickMs`; `headFrom`/`tailFrom`/`tickAlpha` rules; `advance` is a no-op after `over`.
2. **Invariant fuzz tests (own code, seeded, no new dependency):** random turns × 120 s of sim time per seed; 50 seeds in `npm test`, 200 seeds in `npm run test:fuzz`. Invariants are checked after every snake step and every 16 ms of sim time: the mango is never on a reserved cell; no cell turns solid while the snake is on it; new hazard cells never spawn near the head; the snake never moves after `over`. Determinism: same seed + same inputs → same snapshot hash, also when time is split into different `advance` chunks; `clone()` at time T, then the same inputs to both → identical snapshot hash, and advancing the clone does not change the original. `SimState` survives `JSON.parse(JSON.stringify(state))` unchanged (plain-data check). Registry: `capClass`, `bfsWallAt` (terrain false) and `FAMILIES` order are pinned by unit tests. Target: the whole `npm test` run takes < 10 s.
3. **Config tests:** `balance.json` passes `parseBalance`; a parity table test pins every value of §6 to the prototype constant; a test pins the cell count and the exact cells of each maze layout (20, 30, 20, 28; layout 4 drops x = 12 on y = 5 and x = 4 on y = 11); invalid configs throw readable errors.
4. **Boundary test:** no file under `src/core` or `src/meta` imports `phaser` or uses `window`, `document`, `localStorage`, `Math.random`, `performance` or `Date`.
5. **Save tests:** round trip; corrupt JSON; wrong shape; future version; migration order.
6. **Pure input helper tests:** `swipeMath` thresholds, axis choice and the vertical tie rule.
7. **Not unit-tested:** Phaser scenes. They are covered by `npm run build`, a manual run with no console errors (desktop + phone via `vite --host`) and the §7.4 checklist.

## 10. Tooling and verified versions
Checked on the npm registry on 2026-11-03 (`npm view`, `npm pack --dry-run`; nothing installed yet). All pinned exactly (no `^`), lockfile committed.

| Package | Version | Evidence |
|---|---|---|
| phaser (dependency) | 3.90.0 | last 3.x release (2025-05-23); ships `types/phaser.d.ts` and `src/physics/matter-js/`; MIT; only dependency `eventemitter3` |
| vite (dev) | 8.3.5 | `latest`; engines node `^20.19.0 \|\| >=22.12.0` |
| vitest (dev) | 5.1.0 | `latest`; peer vite `^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0`; engines node `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` |
| typescript (dev) | 7.0.2, fallback 6.0.3 | 7.0.2 is `latest` (2026-07-08) and provides `tsc`; 6.0.3 is the last 6.x (2026-04-16) |
| Node / npm (local) | v24.13.1 / 11.13.0 | satisfies vite and vitest engines |

Not added: `@types/node`, coverage plugin, lint tools, property-testing libraries (not needed in P0).

Scripts: `dev` (vite), `build` (vite build), `preview`, `test` (vitest run), `test:fuzz` (`vitest run --mode fuzz`; the fuzz test reads `import.meta.env.MODE` and uses 200 seeds, so no env-var tool is needed on Windows), `typecheck` (tsc --noEmit, strict). `package.json` `engines.node` = `^22.12.0 || ^24.0.0 || >=26.0.0` (the vitest range, which also satisfies vite). `tsconfig.json` sets `resolveJsonModule: true` so `config/balance.json` can be imported by the game and tests, and lists `vite/client` in `types` (types `import.meta.env`).

Risks verified in the first PR (scaffold), reported to the owner before any workaround:
- TypeScript 7.0.2 type-checks `phaser.d.ts` and Vitest types in strict mode; otherwise use 6.0.3 and log the actual error in DECISIONS.
- Phaser 3.90.0 builds and runs with Vite 8 (Rolldown bundler).

Installing dependencies is a protected action (AGENTS §8): ask the owner right before `npm install`.

## 11. Delivery outline (detailed in the plan)
One PR each: (1) scaffold + version checks + ARCHITECTURE.md + CODEMAP; (2) balance config + parseBalance + RNG + grid/BFS; (3) snake + level; (4) mangoes; (5) hazards + director + fuzz tests; (6) save skeleton; (7) Phaser board rendering + input; (8) HUD, overlays, audio, flow; (9) parity check on desktop and phone, PLAYTEST entry, prototype frozen.

## 12. Out of scope for P0
Length reset, 30 levels and biomes, GDD v0.2 numbers, energy and skills, loadout, checkpoints, new obstacle families, art and juice beyond the prototype, Home/Results/Settings screens, optional D-pad setting (the D-pad is always shown, as in the prototype), analytics, meta economy.
