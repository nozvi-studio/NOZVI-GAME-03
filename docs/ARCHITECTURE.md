# Architecture
Updated: 2026-11-04 · Source: `docs/superpowers/specs/2026-11-03-p0-foundation-design.md` §3–§4.

## Modules and boundaries
| Module | Contents | May import | Must not use |
|---|---|---|---|
| `src/core/` | Pure game rules (MEC-001…004), `Sim`, hazard registry | itself only | `phaser`, `window`, `document`, `localStorage`, `Math.random`, `performance`, `Date`, `src/meta`, `src/game` |
| `src/meta/` | Save envelope, `KeyValueStore` | itself only | same list as core; `src/core` internals, `src/game` |
| `src/session/` | Pure run session: save, `Sim` and run log wiring (P1-D1) | `src/core/index.ts`, `src/meta/index.ts` only | same list as core; core/meta internals, `src/game` |
| `src/game/` | Phaser scenes, rendering, input, audio, flow, platform adapters | `phaser`, `src/core/index.ts`, `src/meta/index.ts` | core/meta internals |
| `config/balance.json` | Every tuning value | — | — |

Rules: the core holds no player-facing strings (events carry keys; `src/game/text.ts` maps them). `Math.random` only in `src/game` for cosmetic effects. Enforced by `tests/boundary.test.ts`.

## Core time model
- `Sim.advance(ms)` runs `ms` steps of exactly 1 ms (`ms` a non-negative integer); no-op once `status === 'over'`.
- Same seed + balance + `turn` calls at the same sim times ⇒ identical state, however time is split into `advance` calls.
- All state is one plain-data `SimState` (JSON-serializable, RNG state as a 32-bit integer); `clone()` = `structuredClone`.
- The game layer clamps the frame delta to `flow.maxFrameDeltaMs`, keeps a fractional carry and passes the integer part to `advance`.

## Sim step order
> **To be copied into `docs/ARCHITECTURE.md` "Sim step order" in P1 PR 1.** After that, ARCHITECTURE.md is the single source and MEC-006-R35 points to it.

`advance(ms)` runs `ms` steps of 1 ms (P0 §4). `turn()` and `useSkill()` run between steps, never inside one (MEC-006-R11). One step:
1. If `status = 'over'`: return.
2. `timeMs += 1`.
3. **If `phase = 'transition'`** (MEC-003-R7/R9):
   1. For each family in registry order: `update` (after `onLevelEnd` only crumble and terrain fade-out timers remain, so this advances exactly those).
   2. `transitionLeftMs −= 1`; at 0 run `levelStart()` (MEC-003-R7 step 3 + R11: `phase = 'playing'`, accumulator 0, director timer `director.firstSpawnMs`, maze cooldown 0, emit `transitionEnd`).
   3. Return. (Snake, mango, retry, director, orbs, rain and skill timers are frozen.)
4. `levelTimeMs += 1`.
5. Director (P0, with MEC-003-R4/R14 inputs; skipped while `mango = null`, MEC-003-R13).
6. Hazard families `update` in registry order (P0 families, then `rottenRock` MEC-002-R7, `snipWall` MEC-006-R22, `rubble` MEC-006-R28).
7. Skill effect timers: Slow-mo, Shield (`skillEnded` on timeout; MEC-006-R16). Tail Snip "active" is derived from the `snipWall` family (MEC-006-R14).
8. Speed: `base = rampActive ? rampTick(rampEaten) : levelTickMs(level)` (MEC-008-R8, MEC-003-R3); `eff = slowmo ? round(base × tickFactor) : base` (MEC-006-R17); if `eff` changed, `acc = min(acc, eff)` (MEC-006-R18).
9. Mango: `ageMs += 1` and rot expiry (MEC-002-R6), then placement retry (MEC-002-R9).
10. Orbs: age and expire, then spawn timer and spawn (MEC-006-R4..R7).
11. Rain: rain mango age and expire, then drop schedule (MEC-006-R29..R31).
12. `acc += 1`; if `acc ≥ eff`: `acc −= eff` and run the snake step:
    1. Take one queued turn; compute the new head (P0).
    2. Collision in P0 order `wall → self → solid cell`; the solid-cell stage asks families in registry order `solidAt` (first hit gives `cause`); Shield break per MEC-006-R25..R28 (sets `acc` for the bonk).
    3. Move. If the head is on the regular mango → eat (MEC-002-R3/R5); else on a rain mango → eat rain (MEC-006-R32); else on an orb → orb (MEC-006-R8).
    4. After eating any mango: ramp counter (MEC-008-R8); then, if `progress ≥ need`: level 30 → run win (MEC-003-R6); else the level-up chain (MEC-001-R4/R5, MEC-003-R7 step 1, MEC-007-R12; R7 step 1 includes the MEC-002-R8(b) placement when the regular mango was eaten, and sets the tick accumulator to 0 for the transition, MEC-001-R9); else, if the regular mango was eaten, place the next one (MEC-002-R8).

**Event order inside one snake step** (tests pin it): `ate` → `energyChanged` (golden, only if the gain is > 0, MEC-006-R9) → `rampEnded` (if this was the 5th ramp mango) → then either `runWon`, or `shrunk` → `levelUp` → `rampEnded` (if the ramp is still active, it ends with this level up) → `slotUnlocked` → `skillUnlocked`. `rampEnded` is emitted at most once per run and never for a start at L1 (MEC-008 §7). An orb step emits `orbEaten` → `energyChanged` (only if `gained > 0`, MEC-006-R8). A death emits only `died`.

All randomness uses the core RNG in this order. Determinism contract unchanged (P0 §4): same seed + balance + timed `turn`/`useSkill` calls ⇒ same state for any `advance` chunking.

MEC-006-R35 points here.

## Hazard family registry
`src/core/hazards/registry.ts`: `FAMILIES = [ROCK, FENCE, MAZE, TERRAIN]` (ordered), one `HazardFamily` per `FamilyKey` (`spawn`, `update`, `solidAt`, `bfsWallAt`, `reservedAt`, `cause`, `capClass`, `maxActiveKey`, `breakable`). Cell queries (`src/core/cells.ts`) check snake and rotten rocks first, then families in `FAMILIES` order. `SpawnCtx`/`StepCtx` are per-call views, never stored in state.
