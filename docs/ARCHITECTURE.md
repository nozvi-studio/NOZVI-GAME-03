# Architecture
Updated: 2026-11-04 · Source: `docs/superpowers/specs/2026-11-03-p0-foundation-design.md` §3–§4.

## Modules and boundaries
| Module | Contents | May import | Must not use |
|---|---|---|---|
| `src/core/` | Pure game rules (MEC-001…004), `Sim`, hazard registry | itself only | `phaser`, `window`, `document`, `localStorage`, `Math.random`, `performance`, `Date`, `src/meta`, `src/game` |
| `src/meta/` | Save envelope, `KeyValueStore` | itself only | same list as core; `src/core` internals, `src/game` |
| `src/game/` | Phaser scenes, rendering, input, audio, flow, platform adapters | `phaser`, `src/core/index.ts`, `src/meta/index.ts` | core/meta internals |
| `config/balance.json` | Every tuning value | — | — |

Rules: the core holds no player-facing strings (events carry keys; `src/game/text.ts` maps them). `Math.random` only in `src/game` for cosmetic effects. Enforced by `tests/boundary.test.ts`.

## Core time model
- `Sim.advance(ms)` runs `ms` steps of exactly 1 ms (`ms` a non-negative integer); no-op once `status === 'over'`.
- Same seed + balance + `turn` calls at the same sim times ⇒ identical state, however time is split into `advance` calls.
- All state is one plain-data `SimState` (JSON-serializable, RNG state as a 32-bit integer); `clone()` = `structuredClone`.
- The game layer clamps the frame delta to `flow.maxFrameDeltaMs`, keeps a fractional carry and passes the integer part to `advance`.

## Sim step order (one 1 ms step, prototype `frame()` L999–1004)
1. `acc += 1`.
2. Director: `mazeCooldownMs -= 1`, `spawnInMs -= 1`; when `spawnInMs ≤ 0`, reset the interval and try a weighted spawn.
3. Hazards (`SimState.hazards`, rock/fence/maze) in spawn order; removals after the pass.
4. Terrains (`SimState.terrains`) in spawn order; removals after the pass.
5. Speed: `tickMs = tickMsFor(level)`.
6. Mango rot: `leftMs -= 1`; at `≤ 0` rot (rotten rock if fair) and place a new mango.
7. Snake: if still playing and `acc ≥ tickMs`: `acc -= tickMs`, one snake step (at most one per 1 ms step).

## Hazard family registry
`src/core/hazards/registry.ts`: `FAMILIES = [ROCK, FENCE, MAZE, TERRAIN]` (ordered), one `HazardFamily` per `FamilyKey` (`spawn`, `update`, `solidAt`, `bfsWallAt`, `reservedAt`, `cause`, `capClass`, `maxActiveKey`, `breakable`). Cell queries (`src/core/cells.ts`) check snake and rotten rocks first, then families in `FAMILIES` order. `SpawnCtx`/`StepCtx` are per-call views, never stored in state.
