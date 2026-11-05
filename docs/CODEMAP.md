# Code map
Updated: 2026-11-05 · Keep under ~80 lines. One row per module, not per file.
> Production code is being built in P0 (`src/`); the prototype stays as the behavior reference.

## Entry points
| What | File |
|---|---|
| App bootstrap | `index.html` → `src/game/main.ts` (prototype: `prototype/mango-snake-hard.html`) |
| Main game loop (core) | `src/core/sim.ts` — `stepMs` (1 ms fixed step) |
| Main game loop (game layer) | `src/game/scenes/GameScene.ts` - `GameScene.update` (frame clock, flow, `session.frame` events and rendering) |
| Input | `src/game/input/` - keyboard, CSS-pixel swipe and D-pad adapters |
| Balance config | `config/balance.json` (read via `parseBalance` in `src/core/balance.ts`; P1 balance v2, validated family table) |
| Save / load | `src/meta/save.ts` |
| Save / load (browser) | `src/game/platform/localStore.ts` (Boot creates the session with it; the session owns all saves) |
| Player-facing strings | `src/game/text.ts` |
| Test setup | `vitest.config.ts`, `tests/` (`npm test`, `npm run test:fuzz`) |

## Modules
| Module (folder) | Responsibility | Key files (max 3) | Depends on | Requirement IDs | Tests |
|---|---|---|---|---|---|
| `prototype/` | **Frozen (reference only)** whole playable prototype; run with `python3 -m http.server`: tuning, state, hazards director, fairness (BFS), input, rendering, synth audio | `mango-snake-hard.html` | Google Fonts (network, optional) | MEC-001…MEC-004 | none |
| `src/game/` | Phaser scenes Boot → Home → Loadout → Game + Hud → Results (scenes/HomeScene.ts, LoadoutScene.ts, ResultsScene.ts, ui.ts widgets), banners/tips, countdown, input (input/skillKeys.ts pure J/Q K/E map, input/keyMap.ts pure arrows/WASD/M/flow map; keyboard.ts binds native window keydown), pure flow helpers (flow/homeModel.ts, flow/loadoutEdit.ts, runFlow.ts, flow/debugFlag.ts `?debug=1` → Home Export log + `window.__summarize`), render/skills.ts (orbs, rain, snip wall, rubble, shield, tints), keyed text `t()`, synth/haptics | scenes/GameScene.ts, scenes/HudScene.ts, text.ts | phaser, src/session; src/core + src/meta (types and pure helpers) | GDD-13, GDD-8.4, MEC-001 through MEC-004, MEC-003/006/007/008 §8 | tests/game/, boundary + build; visual QA pending |
| `src/core/` | Pure rules: balance, RNG, grid/BFS, cell queries, snake (length reset, cutTail and run win), 1-based level.ts formulas and family table, mango counters/per-level rot/retry, reserved.ts (the single MEC-002-R2 list), transition.ts (transition timing and level starts), energy.ts (energy, orb placement/pickups/timers), ramp.ts (checkpoint speed ramp), slowdown.ts (level-up slowdown, MEC-003-R22), skills.ts + skills/ (loadout validation/unlocks, Slow-mo, Tail Snip, Shield, Mango Rain), testing.ts (test-only ASCII/circle/context helpers, not exported), hazards/ (registry, director, timed rottenRock family, hazards/snipWall.ts, hazards/rubble.ts; MEC-002/MEC-004/MEC-006) and Sim snapshots | sim.ts, snake.ts, mango.ts | — | MEC-001…004, MEC-003-R22, MEC-006, MEC-007-R11/R12, MEC-008-R8/R9, GDD-7 | tests/core/ |
| `src/core/hazards/` | Stateless state-level family descriptors over `SimState.families`; composite queries; collision.ts resolves head entry, update-time hits, Shield and death context; director.ts builds registry-order capClass options and optional spawn observations; placement.ts validates reserved/head-distance/extra-free cells and preserves mango BFS reachability; P1 timed instances retain cross-family spawn sequence; test-only registry override | registry.ts, director.ts, placement.ts | src/core only | MEC-004-R1..R4/R6/R8..R13/R15/R16, MEC-006-R24..R28 | tests/core/hazards/, director.test.ts, registry.test.ts, hazards.test.ts |
| `src/core/fairness/` | Fixed initial-tick hazard/ice timelines, time-expanded escape and goal-safe BFS; `src/core/simInternal.ts` supplies mutable state, observer and director/movement controls; test-support surfaces, not exported from index | timeline.ts, escape.ts, ../simInternal.ts | src/core only | MEC-004-R17/R18/R20 | tests/core/fairness/ |
| `src/meta/` | Save v2/migration + KeyValueStore port; permanent checkpoint progression, loadout sanitizing, local run log + `summarizeLog` playtest summary | save.ts, progression.ts, loadout.ts / runLog.ts | — | MEC-003-R18..R20, MEC-007-R4, MEC-008 | tests/meta/ |
| `src/session/` | Pure run session: home/loadout models, run start (carry, checkpoint validation), frame event processing (bestLevel, checkpoints, run end, carry), provisional carry on pause/hidden, run log records and flushes | session.ts / index.ts | src/core + src/meta (public indexes only) | MEC-003-R19/R20, MEC-007-R1..R3/R9/R10/R13, MEC-008-R1..R7/R10 | tests/session/, boundary |
| `src/types/` | Ambient type shims for third-party types | phaser-shims.d.ts | — | — | typecheck |
| `tests/` | Vitest tests and helpers (support/fuzz.ts: P0 harness; support/p1fuzz.ts: P1 skills; support/familyFuzz.ts: P2 per-family I1-I7 and escape checks; support/balance.ts: validated solo tables; board.ts/fakeFamily.ts: P2 fixtures; instanceFamily.ts: P0 descriptor assertions); test-support surfaces, not exported from index | boundary.test.ts, support/familyFuzz.ts, support/balance.ts | vitest | GDD-13, MEC-004-R17/R18 | — |

Section markers inside the prototype (grep for them): `tuning`, `colors from CSS tokens`, `sizing`, `sound`, `effects`, `state`, `grid helpers`, `mangoes`, `obstacles`, `flow`, `input`, `simulation (fixed tick)`, `rendering`, `main loop`.

## Do not read (generated, vendored or binary)
`dist/`, `build/`, `coverage/`, `node_modules/`, `assets/` binaries, lockfiles — unless the task is specifically about them.

## Conventions that help navigation
- One module = one folder with a small public entry (e.g. `index.ts`); other modules import only that entry.
- Keep source files under ~300 lines; split when larger. (The prototype is ~1000 lines and is exempt until the production stack is chosen.)
- File and folder names match the domain terms in the GDD / MEC specs.
