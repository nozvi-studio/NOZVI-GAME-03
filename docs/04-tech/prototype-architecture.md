# Prototype architecture

File: `prototype/mango-snake-hard.html` (~1000 lines, vanilla HTML/CSS/JS, Canvas 2D, no deps).

## How it works

| Part | Key functions | Notes |
|---|---|---|
| Main loop | `frame()` | rAF rendering + **fixed-step** logic (`acc` accumulator, `tickMs`). `dt` clamped to 100 ms so background tabs don't fast-forward |
| Simulation | `step()` | Moves one cell per tick, resolves eat / death |
| Director | `updateDirector()` | Weighted random choice of what to spawn; retries other options if one doesn't fit |
| Hazards | `addHazard()`, `updateHazards()` | State machine: `warn → solid → crumble`. Cells only turn solid when the snake isn't on them |
| Terrain | `spawnTerrain()`, `updateTerrains()` | Per-cell phase offset (`delay`) for wave / checkerboard |
| Fairness | `reachable()` (BFS), `nearHead()`, `cellFree()` | Mangoes only spawn in reachable cells; hazards avoid the head and lane ahead |
| Rendering | `render()` | Cached checkerboard, interpolated head/tail (`headFrom`, `tailFrom`, `alpha`) |
| Audio | `tone()`, `sfx` | WebAudio oscillator synth, no audio files |
| Persistence | `loadBest()` / `saveBest()` | `localStorage`, wrapped in try/catch |
| Theming | CSS custom properties → `readColors()` | Light/dark mode, re-read on change |

Good decisions worth keeping in any rewrite: fixed timestep, input buffer, the fairness layer,
warn-before-solid, reduced-motion support, CSS-token theming.

## Tech debt / known issues

- One file, one closure, global mutable state → hard to test and to extend with skills.
- `MIN_MS` is never reached (see `../01-design/level-progression.md`).
- `hazardAt()` / `rockAt()` / `snakeOn()` are linear scans; fine at 17×17, but an occupancy
  grid (`Uint8Array(COLS*ROWS)`) would be simpler once more systems exist.
- `Math.random()` everywhere → runs are not reproducible. A seeded RNG is needed for
  daily runs and for replaying bug reports.
- No automated tests. The fairness rules (BFS, spawn rules) are the most valuable to test.

## Changes needed for the proposed features

| Feature | Change |
|---|---|
| Wrap zones | Central `wrap(x, y)` helper used by `step()`, `reachable()`, `nearHead()`; split snake stroke at wraps; skip interpolation across a wrap |
| Stamina / skills | New `skills` module: state, cost, cooldown, active effects; `tickMs` must read a time-scale; input bindings for skills |
| Tail Snip | Convert removed segments into a hazard of a new type `tail` |
| Headbutt | Collision check in `step()` consults an "armed" flag before `gameOver` |
| Humor | String table + random-no-repeat picker; replace `CAUSES` with pools |
| Analytics for playtests | Append `{level, score, cause, durationMs, skillsUsed}` to localStorage on game over |

## Stack decision (postponed to M4)

Keep prototyping in this file until M3 — it is fast and has zero setup. Before a public build,
choose between:

| Option | Pros | Cons |
|---|---|---|
| TypeScript + Canvas (Vite) | Closest to the prototype, tiny bundle, you know TS | Build UI/menus yourself |
| Phaser 3 | Scenes, input, audio, tweens ready-made; web-first | Learning curve, bigger bundle |
| Godot 4 | Native mobile exports, editor, animation tools | New language/tooling; rewrite everything |

Recommendation (to revisit): **TypeScript + Canvas** if web/itch.io is the first target;
**Godot** if native mobile stores are the first target. Record the choice in `../decision-log.md`.
