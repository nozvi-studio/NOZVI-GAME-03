# Code map
Updated: 2026-11-03 · Keep under ~80 lines. One row per module, not per file.
> The project is currently one single-file prototype. There is no `src/`, `config/` or test setup yet.

## Entry points
| What | File |
|---|---|
| App bootstrap | `prototype/mango-snake-hard.html` (open in a browser) |
| Main game scene / loop | `prototype/mango-snake-hard.html` — `frame()` (rAF render + fixed-step `step()`) |
| Balance config | `prototype/mango-snake-hard.html` — `// ---------- tuning ----------` block (moves to `config/balance.json` at the first gameplay task) |
| Test setup | none yet |

## Modules
| Module (folder) | Responsibility | Key files (max 3) | Depends on | Requirement IDs | Tests |
|---|---|---|---|---|---|
| `prototype/` | Whole playable prototype: tuning, state, hazards director, fairness (BFS), input, rendering, synth audio | `mango-snake-hard.html` | Google Fonts (network, optional) | MEC-001…MEC-004 | none |

Section markers inside the prototype (grep for them): `tuning`, `colors from CSS tokens`, `sizing`, `sound`, `effects`, `state`, `grid helpers`, `mangoes`, `obstacles`, `flow`, `input`, `simulation (fixed tick)`, `rendering`, `main loop`.

## Do not read (generated, vendored or binary)
`dist/`, `build/`, `coverage/`, `node_modules/`, `assets/` binaries, lockfiles — unless the task is specifically about them.

## Conventions that help navigation
- One module = one folder with a small public entry (e.g. `index.ts`); other modules import only that entry.
- Keep source files under ~300 lines; split when larger. (The prototype is ~1000 lines and is exempt until the production stack is chosen.)
- File and folder names match the domain terms in the GDD / MEC specs.
