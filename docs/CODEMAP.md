# Code map
Updated: 2026-11-04 · Keep under ~80 lines. One row per module, not per file.
> Production code is being built in P0 (`src/`); the prototype stays as the behavior reference.

## Entry points
| What | File |
|---|---|
| App bootstrap | `index.html` → `src/game/main.ts` (prototype: `prototype/mango-snake-hard.html`) |
| Main game loop (core) | `src/core/sim.ts` — `stepMs` (1 ms fixed step) |
| Main game scene / loop | `prototype/mango-snake-hard.html` — `frame()` (rAF render + fixed-step `step()`) |
| Balance config | `config/balance.json` (read via `parseBalance` in `src/core/balance.ts`; prototype values, D2) |
| Test setup | `vitest.config.ts`, `tests/` (`npm test`, `npm run test:fuzz`) |

## Modules
| Module (folder) | Responsibility | Key files (max 3) | Depends on | Requirement IDs | Tests |
|---|---|---|---|---|---|
| `prototype/` | Whole playable prototype: tuning, state, hazards director, fairness (BFS), input, rendering, synth audio | `mango-snake-hard.html` | Google Fonts (network, optional) | MEC-001…MEC-004 | none |
| `src/game/` | Phaser game layer (scenes, rendering, input, audio, flow) | main.ts | phaser, src/core, src/meta | — | build + manual |
| `src/core/` | Pure rules: balance, RNG, grid/BFS, cell queries, snake, levels, mango placement/rot (MEC-002), hazards/ (registry, director, families; MEC-004) and Sim snapshots | sim.ts, snake.ts, mango.ts | — | MEC-001…004, GDD-7 | tests/core/ |
| `src/types/` | Ambient type shims for third-party types | phaser-shims.d.ts | — | — | typecheck |
| `tests/` | Vitest tests and helpers | boundary.test.ts, support/boundary.ts, support/balance.ts | vitest | GDD-13 | — |

Section markers inside the prototype (grep for them): `tuning`, `colors from CSS tokens`, `sizing`, `sound`, `effects`, `state`, `grid helpers`, `mangoes`, `obstacles`, `flow`, `input`, `simulation (fixed tick)`, `rendering`, `main loop`.

## Do not read (generated, vendored or binary)
`dist/`, `build/`, `coverage/`, `node_modules/`, `assets/` binaries, lockfiles — unless the task is specifically about them.

## Conventions that help navigation
- One module = one folder with a small public entry (e.g. `index.ts`); other modules import only that entry.
- Keep source files under ~300 lines; split when larger. (The prototype is ~1000 lines and is exempt until the production stack is chosen.)
- File and folder names match the domain terms in the GDD / MEC specs.
