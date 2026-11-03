# P0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the prototype's core loop (MEC-001…MEC-004, prototype rules and numbers) on Phaser 3.90.0 + TypeScript strict + Vite, with a pure deterministic core, so that P1 can change the rules on a tested base.

**Architecture:** A pure TypeScript core (`src/core/`, no engine or browser APIs) owns one plain-data `SimState` and advances it in integer 1 ms steps in the prototype `frame()` order; hazard families sit behind a minimal `HazardFamily` registry. A pure `src/meta/` holds the versioned save skeleton. `src/game/` (Phaser) renders snapshots, runs the ready/countdown/playing/paused/over flow, input, audio and HUD as Phaser game objects.

**Tech Stack:** Phaser 3.90.0, Vite 8.3.5 (Rolldown), TypeScript 7.0.2 (fallback 6.0.3), Vitest 5.1.0 (`node` environment), Node `^22.12.0 || ^24.0.0 || >=26.0.0`.

**Spec:** `docs/superpowers/specs/2026-11-03-p0-foundation-design.md` (APPROVED). Behavior reference: `prototype/mango-snake-hard.html` (line numbers `Lnnn` below refer to it). Executors read the spec section named in each task before coding.

## Global Constraints

Every task's requirements implicitly include this section. Values copied verbatim from the design.

- Pinned versions, exact (no `^`), lockfile committed: `phaser` **3.90.0** (dependency); `vite` **8.3.5**, `vitest` **5.1.0**, `typescript` **7.0.2** (fallback **6.0.3** if 7.0.2 fails the strict check; log it in `docs/DECISIONS.md`) (dev).
- `package.json` `engines.node` = `"^22.12.0 || ^24.0.0 || >=26.0.0"`.
- Not added: `@types/node`, coverage plugin, lint tools, property-testing libraries. Any other new dependency needs owner approval + a DECISIONS line.
- Boundary: `src/core` and `src/meta` never import `phaser` and never use `window`, `document`, `localStorage`, `Math.random`, `performance` or `Date`. `src/game` imports `src/core` and `src/meta` only through their `index.ts`. `src/core` and `src/meta` never import `src/game` or each other's internals (`src/meta` does not need core in P0).
- The core never holds player-facing strings. Events carry keys (`cause: 'fence'`); `src/game/text.ts` turns them into text.
- `Math.random` is allowed only in `src/game` for cosmetic effects (particles). Every random number that changes gameplay comes from the core RNG.
- Plain-data state: all Sim state is one JSON-serializable `SimState` (no closures, `Map`/`Set` or class instances); behavior lives in functions that take the state; `clone()` = `structuredClone` of the state.
- Hazard families sit behind the `HazardFamily` registry (design §3, §4.1, D8): `FAMILIES` is the ordered registry (`rock, fence, maze, terrain`), `FAMILY[key]` the keyed lookup, keys typed `FamilyKey`; members use the P2 vocabulary from P0 on (`cause`, `capClass`, `maxActiveKey`, `spawn`; P1/P2 add `onBreak(s, x, y)`, `onLevelEnd(s)`), so no later rename is needed; `SpawnCtx` / `StepCtx` are per-call views and are never stored in `SimState`.
- P0 ports the **prototype's values** (D2), not GDD v0.2 values. Every tuning value lives in `config/balance.json`, read through `parseBalance`.
- Files stay under ~300 lines.
- Test names start with the requirement ID (`MEC-001 …`, `MEC-004 …`, `GDD-8.4 …`, `GDD-13 …`); each main implementing function has a one-line `// MEC-00x` comment.
- All repository content in English only (player-facing strings are English too in P0).
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- One task = one branch = one PR. Pushing and `npm install` need the owner's approval (AGENTS §8). Never read or print `.env` files.
- Every task: add one line under `## [Unreleased]` in `CHANGELOG.md`, rewrite `docs/STATUS.md` (Now / Next / Blockers / Last session, ≤ 60 lines), update `docs/CODEMAP.md` when a module or entry point appears, update `docs/README.md` when a doc appears.
- Definition of done per task: `npm test` and `npm run typecheck` pass (and `npm run build` from Task 1 on); game starts with no console errors (from Task 7 on).

## File map

| File | Responsibility | Task |
|---|---|---|
| `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html` | Toolchain, scripts, pinned versions, page shell | 1 |
| `tests/support/boundary.ts`, `tests/boundary.test.ts` | Boundary scanner + repo scan (GDD-13) | 1 (scan list extended in 7) |
| `docs/ARCHITECTURE.md` | Module boundaries, time model, Sim step order | 1 |
| `config/balance.json` | Every prototype tuning value + shape tables (design §6) | 2 |
| `src/core/balance.ts` | `Balance` type, `parseBalance` | 2 |
| `src/core/rng.ts` | mulberry32 RNG over a plain `RngState` | 2 |
| `src/core/types.ts` | Public API types (Sim, SimState, SimSnapshot, SimEvent, CauseKey, FamilyKey, HazardFamily, ctx types) | 2 |
| `src/core/grid.ts` | `key`, `inBounds`, `nearHead`, `reachable` (MEC-004) | 2 |
| `src/core/index.ts` | Only public entry of the core | 2 (grows each core task) |
| `tests/support/balance.ts` | `loadBalance()` used by all core tests (also used by P2a) | 2 |
| `src/core/level.ts` | `needFor`, `tickMsFor`, `addProgress`, unlocks (MEC-003) | 3 |
| `src/core/cells.ts` | `snakeOn`, `cellReserved`, `cellBfsWall`, `cellSolidCause` | 3 (registry part in 5) |
| `src/core/snake.ts` | `queueTurn`, `stepSnake` (MEC-001) | 3 |
| `src/core/sim.ts` | `createSim`, `restoreSim`, `stateOf`, 1 ms step, snapshot | 3 (grows in 4, 5) |
| `tests/support/state.ts` | `buildState()` test helper | 3 |
| `src/core/mango.ts` | `placeMango`, `rotMsFor`, `rotMango`, `endBoardFull` (MEC-002) | 4 |
| `src/core/hazards/shapes.ts` | `lineFence`, `transform`, `mazeCells` | 5 |
| `src/core/hazards/timed.ts` | warn → solid → crumble lifecycle shared by rock/fence/maze | 5 |
| `src/core/hazards/rock.ts` · `fence.ts` · `maze.ts` · `terrain.ts` | One `HazardFamily` each | 5 |
| `src/core/hazards/registry.ts` | `FAMILIES` (ordered), `FAMILY` (by key), `instancesOf` | 5 |
| `src/core/hazards/director.ts` | Spawn timer, cap, weighted pick with retry | 5 |
| `tests/support/fuzz.ts`, `tests/core/fuzz.test.ts`, `tests/core/determinism.test.ts` | Invariant fuzz + determinism | 5 |
| `src/meta/storage.ts`, `src/meta/save.ts`, `src/meta/index.ts` | `KeyValueStore`, versioned save envelope (GDD-8.4) | 6 |
| `src/game/main.ts` | `Phaser.Game` config | 1 (rewritten in 7) |
| `src/game/layout.ts` | Logical size (540 × 960) and board/HUD rectangles | 7 |
| `src/game/scenes/BootScene.ts`, `GameScene.ts` | Boot (balance, save), Sim owner + board render | 7 (Boot extended in 8) |
| `src/game/render/palette.ts`, `board.ts`, `hazards.ts`, `mango.ts`, `snake.ts`, `effects.ts` | Drawing helpers per layer | 7 |
| `src/game/flow/clock.ts`, `flow/runFlow.ts` | Pure frame clock and run state machine | 7 |
| `src/game/input/keyboard.ts`, `swipe.ts`, `swipeMath.ts` | Keyboard and swipe input | 7 |
| `src/game/scenes/HudScene.ts`, `input/dpad.ts`, `audio/synth.ts`, `platform/localStore.ts`, `text.ts` | HUD, overlays, D-pad, audio + haptics, save adapter, strings | 8 |
| `docs/PLAYTEST.md` | Parity checklist evidence | 9 |

---

### Task 1: Scaffold, version checks, ARCHITECTURE.md

**Branch:** `chore/p0-scaffold`

**Files:**
- Create: `package.json`, `package-lock.json` (generated by `npm install`), `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/game/main.ts`, `tests/support/boundary.ts`, `tests/boundary.test.ts`, `docs/ARCHITECTURE.md`
- Modify: `.gitignore` (ensure `node_modules/`, `dist/`, `coverage/` are listed; create the file if missing), `docs/CODEMAP.md`, `docs/README.md`, `docs/DECISIONS.md`, `CHANGELOG.md`, `docs/STATUS.md`

**Interfaces:**
- Consumes: nothing.
- Produces: scripts `dev`, `build`, `preview`, `test`, `test:fuzz`, `typecheck`; `findViolations(files: Record<string, string>): string[]` in `tests/support/boundary.ts`; `import.meta.env.MODE` typed via `vite/client`; JSON imports via `resolveJsonModule`.

- [ ] **Step 1: Create the branch**

Run: `git switch master; git switch -c chore/p0-scaffold`

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "mango-snake",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "engines": { "node": "^22.12.0 || ^24.0.0 || >=26.0.0" },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:fuzz": "vitest run --mode fuzz",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": { "phaser": "3.90.0" },
  "devDependencies": { "typescript": "7.0.2", "vite": "8.3.5", "vitest": "5.1.0" }
}
```

- [ ] **Step 3: STOP — ask the owner before installing (AGENTS §8)**

Send the owner exactly what will run and why: "`npm install` will install phaser 3.90.0, vite 8.3.5, vitest 5.1.0, typescript 7.0.2 (exact pins, design §10) and create `package-lock.json`. OK to run?" Do not continue until the owner approves.

- [ ] **Step 4: Install and confirm versions**

Run: `npm install` then `npm ls --depth=0` and `npx tsc --version`
Expected: `phaser@3.90.0`, `typescript@7.0.2`, `vite@8.3.5`, `vitest@5.1.0`; `tsc` prints `Version 7.0.2`.

- [ ] **Step 5: Write `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": false,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts"]
}
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';

// Phaser alone is about 1.2 MB minified; raise the warning limit so the build log stays readable.
const PHASER_CHUNK_WARNING_KB = 2000;

export default defineConfig({
  build: { target: 'es2022', chunkSizeWarningLimit: PHASER_CHUNK_WARNING_KB },
});
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
```

- [ ] **Step 6: Write the failing boundary test**

```ts
// tests/boundary.test.ts
import { describe, expect, it } from 'vitest';
import { findViolations } from './support/boundary';

// Vite raw glob: no @types/node needed. Extended with pure src/game files in Task 7.
const pureSources = import.meta.glob(['../src/core/**/*.ts', '../src/meta/**/*.ts'], {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;

describe('GDD-13 boundary', () => {
  it('GDD-13 boundary: the scanner flags each forbidden API', () => {
    const src = "import Phaser from 'phaser';\nconst r = Math.random();\nwindow.x = 1; document.title;\n"
      + 'localStorage.x; performance.now(); Date.now();';
    expect(findViolations({ 'a.ts': src })).toEqual([
      'a.ts: phaser import', 'a.ts: window', 'a.ts: document', 'a.ts: localStorage',
      'a.ts: Math.random', 'a.ts: performance', 'a.ts: Date',
    ]);
  });
  it('GDD-13 boundary: comments are ignored', () => {
    expect(findViolations({ 'b.ts': '// Date and window in prose\n/* performance */\nexport const x = 1;' })).toEqual([]);
  });
  it('GDD-13 boundary: src/core and src/meta use no engine or browser API', () => {
    expect(findViolations(pureSources)).toEqual([]);
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./support/boundary`.

- [ ] **Step 8: Implement the scanner**

```ts
// tests/support/boundary.ts
// Boundary rules for the pure modules (design §3, §9.4). GDD-13
const FORBIDDEN: readonly { name: string; re: RegExp }[] = [
  { name: 'phaser import', re: /from\s+['"]phaser['"]|import\s*\(\s*['"]phaser['"]\s*\)/ },
  { name: 'window', re: /\bwindow\b/ },
  { name: 'document', re: /\bdocument\b/ },
  { name: 'localStorage', re: /\blocalStorage\b/ },
  { name: 'Math.random', re: /\bMath\.random\b/ },
  { name: 'performance', re: /\bperformance\b/ },
  { name: 'Date', re: /\bDate\b/ },
];

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

export function findViolations(files: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [path, text] of Object.entries(files)) {
    const code = stripComments(text);
    for (const f of FORBIDDEN) if (f.re.test(code)) out.push(`${path}: ${f.name}`);
  }
  return out;
}
```

- [ ] **Step 9: Run tests**

Run: `npm test`
Expected: PASS, 3 tests (the repo scan passes vacuously until `src/core` exists).

- [ ] **Step 10: Write `index.html` and a minimal `src/game/main.ts`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<title>Mango Snake: Hard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; height: 100%; background: #dfe9c8; overscroll-behavior: none; }
  @media (prefers-color-scheme: dark) { html, body { background: #131d15; } }
  #game { width: 100vw; height: 100dvh; touch-action: none; user-select: none; -webkit-user-select: none; }
</style>
</head>
<body>
<div id="game"></div>
<script type="module" src="/src/game/main.ts"></script>
</body>
</html>
```

```ts
// src/game/main.ts — temporary hello scene; replaced by Boot/Game/Hud in Tasks 7–8
import Phaser from 'phaser';

const WIDTH = 540;
const HEIGHT = 960;

class HelloScene extends Phaser.Scene {
  constructor() { super('Hello'); }
  create(): void {
    this.add.text(WIDTH / 2, HEIGHT / 2, 'Mango Snake', {
      fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '48px', color: '#22311a',
    }).setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#dfe9c8',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [HelloScene],
});
```

- [ ] **Step 11: Risk check 1 — TypeScript 7.0.2 strict against `phaser.d.ts` and Vitest types**

Run: `npm run typecheck`
Expected: exit 0 with `skipLibCheck: false` (so `node_modules/phaser/types/phaser.d.ts` and the Vitest/Vite types are fully checked).
If it fails: copy the first 20 error lines, **STOP and report to the owner** (do not change `skipLibCheck`, do not edit types). On the owner's approval run `npm install --save-exact --save-dev typescript@6.0.3`, rerun `npm run typecheck`, and if it is still red, STOP again with both error logs. If the default import `import Phaser from 'phaser'` is the only error, report it too; the candidate fix is `import * as Phaser from 'phaser'`, applied only after approval.

- [ ] **Step 12: Risk check 2 — Phaser 3.90.0 with Vite 8 (Rolldown)**

Run: `npm run build` then `npm run preview` and open the printed URL; also `npm run dev` and open `http://localhost:5173/`.
Expected: build exits 0; both pages show "Mango Snake" centered on the green background; DevTools console shows only the Phaser banner, no errors or warnings. If the build fails or the console shows errors, **STOP and report to the owner** with the log before any workaround.

- [ ] **Step 13: Log the version results in `docs/DECISIONS.md`**

Append (fill in the observed result, one of the two bracketed variants, no other wording):

```markdown
## 2026-11-03 — TypeScript version for P0: [7.0.2 passes | 6.0.3 fallback]
**Context:** Design D5 prefers TypeScript 7.0.2 if it type-checks `phaser.d.ts` (Phaser 3.90.0) and the Vitest 5.1.0 types in strict mode with `skipLibCheck: false`.
**Decision:** [7.0.2: `npm run typecheck` exit 0 on <date>. | 6.0.3: 7.0.2 failed with `<first error line>`; owner approved the fallback on <date>.]
**Also checked:** Phaser 3.90.0 builds with Vite 8.3.5 (Rolldown) and runs with no console errors (`npm run build`, `npm run dev`).
```

- [ ] **Step 14: Write `docs/ARCHITECTURE.md`**

```markdown
# Architecture
Updated: 2026-11-03 · Source: `docs/superpowers/specs/2026-11-03-p0-foundation-design.md` §3–§4.

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
```

- [ ] **Step 15: Update maps and memory docs**

- `docs/CODEMAP.md`: set "Updated: 2026-11-03"; replace the "> The project is currently one single-file prototype…" note with "> Production code is being built in P0 (`src/`); the prototype stays as the behavior reference."; Entry points rows: App bootstrap → `index.html` → `src/game/main.ts`; Test setup → `vitest.config.ts`, `tests/` (`npm test`, `npm run test:fuzz`); Modules: add row `| src/game/ | Phaser game layer (scenes, rendering, input, audio, flow) | main.ts | phaser, src/core, src/meta | — | build + manual |` and row `| tests/ | Vitest tests and helpers | boundary.test.ts, support/boundary.ts | vitest | GDD-13 | — |`.
- `docs/README.md` index: add `| ARCH | docs/ARCHITECTURE.md | Module boundaries, time model, Sim step order | Draft |` and `| P0-PLAN | docs/superpowers/plans/2026-11-03-p0-foundation.md | P0 task plan (9 PRs) | Approved |`; remove the ARCH line from the HTML comment.
- `CHANGELOG.md` under `## [Unreleased]`: `- chore: Vite 8 + Phaser 3.90 + TypeScript strict + Vitest scaffold with boundary test and ARCHITECTURE.md (P0 PR 1).`
- `docs/STATUS.md`: Now = "P0 PR 1 scaffold done"; Next = PR 2 balance/RNG/grid; record the TS version result.

- [ ] **Step 16: Verify and commit**

Run: `npm test`; `npm run typecheck`; `npm run build`
Expected: all exit 0.

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts index.html .gitignore src/game/main.ts tests/ docs/ARCHITECTURE.md docs/CODEMAP.md docs/README.md docs/DECISIONS.md docs/STATUS.md CHANGELOG.md
git commit -m "chore: scaffold Vite + Phaser 3.90 + TypeScript strict + Vitest"
```

### Task 2: Balance config, parseBalance, RNG, core types, grid/BFS

**Branch:** `feat/p0-balance-rng-grid` · **Spec:** design §3, §4, §4.1, §6; §5 MEC-004 `nearHead`/`reachable`.

**Files:**
- Create: `config/balance.json`, `src/core/balance.ts`, `src/core/rng.ts`, `src/core/types.ts`, `src/core/grid.ts`, `src/core/index.ts`, `tests/support/balance.ts`
- Test: `tests/core/balance.test.ts`, `tests/core/rng.test.ts`, `tests/core/grid.test.ts`
- Modify: `docs/CODEMAP.md`, `CHANGELOG.md`, `docs/STATUS.md`

**Interfaces:**
- Consumes: `findViolations` (Task 1) — the boundary test now scans real files.
- Produces (later tasks and P1/P2 rely on these exact names):
  - `parseBalance(json: unknown): Balance`; types `Balance`, `Pair`, `RockShapeKey`, `FenceShapeKey`, `FenceKind`, `MazeLayout`.
  - `seedRng(seed: number): RngState`; `rngFrom(state: RngState): Rng` with `next() ∈ [0,1)`, `int(n) = floor(next()·n)`, `pick(arr) = arr[int(arr.length)]`, `chance(p) = next() < p`.
  - All types in `src/core/types.ts` below (full code).
  - `key(cols, x, y)`, `inBounds(cols, rows, x, y)`, `nearHead(head, dir, x, y, d, lane)`, `reachable(cols, rows, head, isWall): Set<number>`.
  - `loadBalance(): Balance` in `tests/support/balance.ts`.

- [ ] **Step 1: Branch** — `git switch master; git switch -c feat/p0-balance-rng-grid`

- [ ] **Step 2: Write `config/balance.json`** (every value from the prototype; L166–174 constants, L393–394 mango, L423–426 rock shapes, L427–438 rocks, L441–482 fences, L484–506 mazes, L508–530 terrain, L533–555 director, L753 swipe, L608/L683/L790 haptics, L856 fade-in, L879 flicker, L989 frame clamp, L694 death delay, L414 banner)

```json
{
  "board": { "cols": 17, "rows": 17 },
  "snake": { "start": [[8, 8], [7, 8], [6, 8]], "startDir": [1, 0], "maxQueuedTurns": 3 },
  "speed": { "startMs": 140, "minMs": 95, "msPerLevel": 4 },
  "level": { "maxLevel": 10, "needBase": 4, "needPerLevel": 1, "unlock": { "fence": 2, "terrain": 4, "maze": 6 } },
  "mango": {
    "rotBaseMs": 8000, "rotPerEatenMs": 150, "rotMinMs": 4000, "goldenRotFactor": 0.5, "goldenChance": 0.15,
    "goldenMinEaten": 3, "points": { "normal": 1, "golden": 3 }, "progress": { "normal": 1, "golden": 2 }, "nearHeadDist": 3
  },
  "fairness": { "nearHeadDist": 4, "frontLaneCells": 4, "terrainNearHeadDist": 3 },
  "hazard": { "crumbleMs": 450 },
  "rock": {
    "warnMs": 1500, "lifeMs": 6000, "lifeRandMs": 4000, "tries": 40,
    "shapePoolByLevel": [
      { "minLevel": 0, "add": ["single"] }, { "minLevel": 2, "add": ["lineH", "lineV"] }, { "minLevel": 4, "add": ["corner", "block"] }
    ],
    "shapes": {
      "single": [[0, 0]], "lineH": [[0, 0], [1, 0], [2, 0]], "lineV": [[0, 0], [0, 1], [0, 2]],
      "corner": [[0, 0], [1, 0], [0, 1]], "block": [[0, 0], [1, 0], [0, 1], [1, 1]]
    }
  },
  "fence": {
    "warnMs": 2000, "lifeMs": 9000, "lifeRandMs": 4000, "tries": 60, "lineBase": 5, "lineExtraMax": 4, "gapMinLen": 7,
    "mirrorChance": 0.5,
    "poolAfterUnlock": [
      { "offset": 0, "add": ["line", "L"] }, { "offset": 1, "add": ["T", "Z"] }, { "offset": 2, "add": ["F", "U", "plus"] }
    ],
    "shapes": {
      "L": [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]],
      "T": [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [2, 1], [2, 2], [2, 3]],
      "Z": [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [3, 2], [4, 2]],
      "F": [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [1, 2], [0, 3], [0, 4]],
      "U": [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 1], [3, 0]],
      "plus": [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [2, 3], [2, 4]]
    }
  },
  "maze": {
    "warnMs": 2600, "lifeMs": 14000, "lifeRandMs": 4000, "minCells": 6, "cooldownMs": 26000,
    "layouts": [
      { "segments": [[4, 4, 6, 4], [10, 4, 12, 4], [4, 12, 6, 12], [10, 12, 12, 12], [4, 5, 4, 6], [4, 10, 4, 11], [12, 5, 12, 6], [12, 10, 12, 11]], "exclude": [] },
      { "segments": [[4, 1, 4, 10], [8, 6, 8, 15], [12, 1, 12, 10]], "exclude": [] },
      { "segments": [[2, 8, 6, 8], [10, 8, 14, 8], [8, 2, 8, 6], [8, 10, 8, 14]], "exclude": [] },
      { "segments": [[0, 5, 4, 5], [7, 5, 16, 5], [0, 11, 9, 11], [12, 11, 16, 11]], "exclude": [[12, 5], [4, 11]] }
    ]
  },
  "terrain": {
    "periodMs": 3400, "upMs": 1400, "warnMs": 900, "startDelayMs": 600, "fadeOutMs": 500, "lifeMs": 18000, "lifeRandMs": 6000,
    "tries": 40, "minCells": 6, "waveChance": 0.5, "horizChance": 0.5, "waveLenMin": 6, "waveLenRand": 3, "waveWidth": 2,
    "waveDelayMs": 260, "checkerSize": 4, "maxActive": 1, "maxActiveLate": 2, "lateLevel": 8
  },
  "director": {
    "firstSpawnMs": 2500, "intervalBaseMs": 5000, "intervalPerLevelMs": 300, "intervalMinMs": 2000,
    "capBase": 2, "capPerLevels": 2, "capMax": 8, "weights": { "rock": 3, "fence": 2, "terrain": 2, "maze": 2 }
  },
  "flow": { "countdownMs": 1500, "countdownDigits": 3, "maxFrameDeltaMs": 100, "deathCardDelayMs": 550 },
  "ui": {
    "bannerMs": 1800, "swipeMinPx": 18, "swipeBoardFactor": 0.05,
    "haptics": { "eatMs": 12, "level": [15, 40, 15], "deathMs": 90 }, "terrainFadeInMs": 600, "hazardFlickerMs": 1500
  }
}
```

- [ ] **Step 3: Write `src/core/balance.ts` types first (full code; implementation of `parseBalance` in Step 7)**

```ts
// src/core/balance.ts — Balance type + parseBalance (design §6). GDD-7
export type Pair = [number, number];
export type RockShapeKey = 'single' | 'lineH' | 'lineV' | 'corner' | 'block';
export type FenceShapeKey = 'L' | 'T' | 'Z' | 'F' | 'U' | 'plus';
export type FenceKind = 'line' | FenceShapeKey;
export interface MazeLayout { segments: [number, number, number, number][]; exclude: Pair[] }

export interface Balance {
  board: { cols: number; rows: number };
  snake: { start: Pair[]; startDir: Pair; maxQueuedTurns: number };
  speed: { startMs: number; minMs: number; msPerLevel: number };
  level: { maxLevel: number; needBase: number; needPerLevel: number; unlock: { fence: number; terrain: number; maze: number } };
  mango: {
    rotBaseMs: number; rotPerEatenMs: number; rotMinMs: number; goldenRotFactor: number; goldenChance: number;
    goldenMinEaten: number; points: { normal: number; golden: number }; progress: { normal: number; golden: number };
    nearHeadDist: number;
  };
  fairness: { nearHeadDist: number; frontLaneCells: number; terrainNearHeadDist: number };
  hazard: { crumbleMs: number };
  rock: {
    warnMs: number; lifeMs: number; lifeRandMs: number; tries: number;
    shapePoolByLevel: { minLevel: number; add: RockShapeKey[] }[]; shapes: Record<RockShapeKey, Pair[]>;
  };
  fence: {
    warnMs: number; lifeMs: number; lifeRandMs: number; tries: number; lineBase: number; lineExtraMax: number;
    gapMinLen: number; mirrorChance: number; poolAfterUnlock: { offset: number; add: FenceKind[] }[];
    shapes: Record<FenceShapeKey, Pair[]>;
  };
  maze: { warnMs: number; lifeMs: number; lifeRandMs: number; minCells: number; cooldownMs: number; layouts: MazeLayout[] };
  terrain: {
    periodMs: number; upMs: number; warnMs: number; startDelayMs: number; fadeOutMs: number; lifeMs: number;
    lifeRandMs: number; tries: number; minCells: number; waveChance: number; horizChance: number; waveLenMin: number;
    waveLenRand: number; waveWidth: number; waveDelayMs: number; checkerSize: number; maxActive: number;
    maxActiveLate: number; lateLevel: number;
  };
  director: {
    firstSpawnMs: number; intervalBaseMs: number; intervalPerLevelMs: number; intervalMinMs: number;
    capBase: number; capPerLevels: number; capMax: number; weights: { rock: number; fence: number; terrain: number; maze: number };
  };
  flow: { countdownMs: number; countdownDigits: number; maxFrameDeltaMs: number; deathCardDelayMs: number };
  ui: {
    bannerMs: number; swipeMinPx: number; swipeBoardFactor: number;
    haptics: { eatMs: number; level: number[]; deathMs: number }; terrainFadeInMs: number; hazardFlickerMs: number;
  };
}
```

- [ ] **Step 4: Write `src/core/rng.ts` and `src/core/types.ts` (full code)**

```ts
// src/core/rng.ts — seeded mulberry32 over a plain RngState stored in SimState (design §3, §4)
export interface RngState { s: number }
export interface Rng {
  next(): number;                       // [0, 1)
  int(n: number): number;               // floor(next() * n)
  pick<T>(arr: readonly T[]): T;        // arr[int(arr.length)]; throws on an empty array
  chance(p: number): boolean;           // next() < p
}

export function seedRng(seed: number): RngState { return { s: seed >>> 0 }; }

export function rngFrom(st: RngState): Rng {
  const next = (): number => {
    st.s = (st.s + 0x6d2b79f5) >>> 0;
    let t = st.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n: number): number => Math.floor(next() * n);
  return {
    next,
    int,
    pick<T>(arr: readonly T[]): T {
      if (arr.length === 0) throw new Error('rng.pick: empty array');
      return arr[int(arr.length)] as T;
    },
    chance: (p: number): boolean => next() < p,
  };
}
```

```ts
// src/core/types.ts — public API types of the core (design §4, §4.1)
import type { Balance, FenceKind } from './balance';
import type { Rng, RngState } from './rng';

export type Step = -1 | 0 | 1;
export interface Dir { x: Step; y: Step }
export interface Cell { x: number; y: number }

export type CauseKey = 'wall' | 'self' | 'rotten' | 'rock' | 'fence' | 'maze' | 'ground';   // prototype CAUSES L336
export type FamilyKey = 'rock' | 'fence' | 'maze' | 'terrain';
export type CapClass = 'small' | 'big' | 'modifier' | 'none';
export type TimedKey = Exclude<FamilyKey, 'terrain'>;
export type UnlockKey = 'fence' | 'terrain' | 'maze';

export type TimedPhase = 'warn' | 'solid' | 'crumble';
export interface TimedCell { x: number; y: number; on: boolean; ageMs: number }
export interface TimedHazard {
  family: TimedKey; state: TimedPhase; t: number; warnMs: number; lifeMs: number;
  landed: boolean; cells: TimedCell[]; kind?: FenceKind;               // kind only on fences
}
export type TerrainVis = 'down' | 'warn' | 'up';
export interface TerrainCell { x: number; y: number; delay: number; up: boolean; vis: TerrainVis }
export interface TerrainHazard { family: 'terrain'; t: number; lifeMs: number; cells: TerrainCell[] }
export type HazardInstance = TimedHazard | TerrainHazard;

export interface MangoState { x: number; y: number; golden: boolean; leftMs: number; totalMs: number }
export type SimStatus = 'playing' | 'over';
export interface Outcome { won: boolean; cause?: CauseKey }

export type SimEvent =
  | { type: 'ate'; x: number; y: number; golden: boolean; points: number }
  | { type: 'levelUp'; level: number; unlocked?: UnlockKey }
  | { type: 'landed'; hazardType: TimedKey }
  | { type: 'dust'; x: number; y: number }
  | { type: 'rotted'; x: number; y: number; leftRock: boolean }
  | { type: 'hazardIncoming'; family: UnlockKey }
  | { type: 'died'; cause: CauseKey; x: number; y: number }
  | { type: 'boardFull' };

/** All Sim state. Plain JSON data only: no closures, Map/Set or class instances. */
export interface SimState {
  snake: Cell[];               // head first
  dir: Dir;
  queue: Dir[];                // queued turns, max balance.snake.maxQueuedTurns
  headFrom: Cell;
  tailFrom: Cell;
  acc: number;                 // ms accumulated toward the next snake step
  tickMs: number;
  mango: MangoState | null;
  rottenRocks: Cell[];
  hazards: TimedHazard[];      // rock/fence/maze in spawn order (prototype `hazards`)
  terrains: TerrainHazard[];   // prototype `terrains`
  spawnInMs: number;
  mazeCooldownMs: number;
  score: number;
  eaten: number;
  level: number;               // 0-based
  progress: number;
  status: SimStatus;
  outcome: Outcome | null;
  events: SimEvent[];          // pending, emptied by drainEvents()
  rng: RngState;
}

export interface MangoView { x: number; y: number; golden: boolean; leftMs: number; totalMs: number; ageMs: number }
export interface HazardView {
  type: TimedKey; state: TimedPhase; t: number; warnMs: number; lifeMs: number; kind?: FenceKind;
  cells: readonly TimedCell[];
}
export interface TerrainView { t: number; lifeMs: number; cells: readonly { x: number; y: number; vis: TerrainVis; delay: number }[] }

export interface SimSnapshot {
  snake: readonly Cell[];
  dir: Dir;
  heading: Dir;                // last queued direction, else dir (D-pad)
  headFrom: Cell;
  tailFrom: Cell;
  tickAlpha: number;           // status === 'over' ? 1 : min(1, acc / tickMs)  (L1007)
  mango: MangoView | null;
  rottenRocks: readonly Cell[];
  hazards: readonly HazardView[];
  terrains: readonly TerrainView[];
  score: number;
  level: number;
  progress: number;
  need: number;
  tickMs: number;
  status: SimStatus;
  outcome: Outcome | null;
}

export interface Sim {
  turn(dx: -1 | 0 | 1, dy: -1 | 0 | 1): void;  // ignored after the run is over
  advance(ms: number): void;                     // ms must be a non-negative integer; no-op after `over`
  drainEvents(): SimEvent[];                     // events since the last call, in order
  snapshot(): Readonly<SimSnapshot>;             // read-only view for rendering
  clone(): Sim;                                  // independent copy: structuredClone of the state
}

/** Per-call view for spawning; never stored in SimState. */
export interface SpawnCtx {
  readonly balance: Balance;
  readonly level: number;
  /** In bounds, not reserved, not near the head (d defaults to balance.fairness.nearHeadDist). */
  cellFree(x: number, y: number, d?: number): boolean;
}
/** Per-call view for one 1 ms update; never stored in SimState. */
export interface StepCtx {
  readonly balance: Balance;
  snakeOn(x: number, y: number): boolean;
  emit(e: SimEvent): void;
}

export interface HazardFamily<S extends { family: FamilyKey }> {
  key: FamilyKey;
  cause: CauseKey;                                     // rock→'rock', fence→'fence', maze→'maze', terrain→'ground'
  capClass: CapClass;                                  // rock, fence: 'small' (director cap); maze, terrain: 'big'
  maxActiveKey: string | null;                         // balance key of a per-family max; terrain: 'terrain.maxActive'
  spawn(ctx: SpawnCtx, rng: Rng): S | null;            // placement rules of design §5, unchanged
  update(state: S, ctx: StepCtx): 'keep' | 'remove';   // one 1 ms step
  solidAt(state: S, x: number, y: number): boolean;    // collision
  bfsWallAt(state: S, x: number, y: number): boolean;  // reachability walls
  reservedAt(state: S, x: number, y: number): boolean; // placement reserved
  breakable: boolean;                                  // false for all in P0 (Shield is P1)
}
```

```ts
// src/core/index.ts — the only public entry of src/core
export { parseBalance } from './balance';
export type { Balance, Pair, RockShapeKey, FenceShapeKey, FenceKind, MazeLayout } from './balance';
export type * from './types';
```

```ts
// tests/support/balance.ts — shared by every core test (and by the P2a plan)
import json from '../../config/balance.json';
import { parseBalance, type Balance } from '../../src/core/balance';
export const loadBalance = (): Balance => parseBalance(structuredClone(json));
```

- [ ] **Step 5: Write the failing tests**

```ts
// tests/core/rng.test.ts
import { describe, expect, it } from 'vitest';
import { rngFrom, seedRng } from '../../src/core/rng';

describe('MEC-004 rng', () => {
  it('MEC-004 rng: mulberry32 is reproducible per seed', () => {
    const r = rngFrom(seedRng(42));
    expect([r.next(), r.next(), r.next()]).toEqual([0.6011037519201636, 0.44829055899754167, 0.8524657934904099]);
  });
  it('MEC-004 rng: int(n) = floor(next() * n)', () => {
    const r = rngFrom(seedRng(7));
    expect([0, 1, 2, 3, 4].map(() => r.int(10))).toEqual([0, 0, 9, 6, 5]);
  });
  it('MEC-004 rng: state is a plain 32-bit integer that resumes exactly', () => {
    const st = seedRng(1); const r = rngFrom(st); r.next();
    const copy = JSON.parse(JSON.stringify(st)) as typeof st;
    expect(Number.isInteger(st.s) && st.s >= 0 && st.s < 2 ** 32).toBe(true);
    expect(rngFrom(copy).next()).toBe(r.next());
  });
});
```

Remaining tests (write each; expected values exact):
- `rng.test.ts`: `MEC-004 rng: next() stays in [0, 1) over 10000 draws` (seed 3); `MEC-004 rng: pick uses int(length)` (seed 7, `pick(['a'…'j'])` → `'a'`, then `'a'`, `'j'`); `MEC-004 rng: pick throws on an empty array` (`/empty/`); `MEC-004 rng: chance(p) is next() < p` (seed 42: `chance(0.61)` → true, then `chance(0.44)` → false).
- `grid.test.ts`: `MEC-004 key is row-major` (`key(17, 3, 2)` → 37); `MEC-004 inBounds rejects off-board cells` ((−1,0) false, (16,16) true, (17,0) false, (0,17) false); `MEC-004 nearHead uses Manhattan distance < d` (head (8,8), dir (1,0), d 4: (8,11) true, (8,12) false); `MEC-004 nearHead covers 4 lane cells ahead for any d` (d 1: (12,8) true, (13,8) false, (4,8) false — behind); `MEC-004 nearHead lane follows dir` (dir (0,−1): (8,4) true); `MEC-004 reachable stops at walls and finds pockets` (5×5, head (0,0), wall = x === 2 → (4,4) not in set, set size 10; wall = x === 2 && y !== 4 → (4,4) in set, size 21); `MEC-004 reachable never leaves the board` (5×5, no walls → size 25, all keys in [0, 25)).
- `balance.test.ts` (Step 6).

- [ ] **Step 6: Write the balance tests**

```ts
// tests/core/balance.test.ts
import { describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { parseBalance } from '../../src/core/balance';
import { loadBalance } from '../support/balance';

const mutate = (fn: (j: any) => void): unknown => { const j = structuredClone(json) as any; fn(j); return j; };

describe('GDD-7 balance', () => {
  it('GDD-7 balance.json passes parseBalance', () => { expect(() => loadBalance()).not.toThrow(); });

  it('GDD-7 parity table: every value equals the prototype constant', () => {
    const b = loadBalance();
    const table: [unknown, unknown, string][] = [
      [b.board, { cols: 17, rows: 17 }, 'L166'], [b.snake.start, [[8, 8], [7, 8], [6, 8]], 'L627'],
      [b.snake.startDir, [1, 0], 'L628'], [b.snake.maxQueuedTurns, 3, 'L704'],
      [b.speed, { startMs: 140, minMs: 95, msPerLevel: 4 }, 'L167'],
      [b.level, { maxLevel: 10, needBase: 4, needPerLevel: 1, unlock: { fence: 2, terrain: 4, maze: 6 } }, 'L168–173'],
      [b.mango, { rotBaseMs: 8000, rotPerEatenMs: 150, rotMinMs: 4000, goldenRotFactor: 0.5, goldenChance: 0.15,
        goldenMinEaten: 3, points: { normal: 1, golden: 3 }, progress: { normal: 1, golden: 2 }, nearHeadDist: 3 }, 'L388–394, L782, L792'],
      [b.fairness, { nearHeadDist: 4, frontLaneCells: 4, terrainNearHeadDist: 3 }, 'L356, L359, L521'],
      [b.hazard.crumbleMs, 450, 'L170'],
      [[b.rock.warnMs, b.rock.lifeMs, b.rock.lifeRandMs, b.rock.tries], [1500, 6000, 4000, 40], 'L430–434'],
      [b.rock.shapePoolByLevel, [{ minLevel: 0, add: ['single'] }, { minLevel: 2, add: ['lineH', 'lineV'] },
        { minLevel: 4, add: ['corner', 'block'] }], 'L428'],
      [b.rock.shapes, { single: [[0, 0]], lineH: [[0, 0], [1, 0], [2, 0]], lineV: [[0, 0], [0, 1], [0, 2]],
        corner: [[0, 0], [1, 0], [0, 1]], block: [[0, 0], [1, 0], [0, 1], [1, 1]] }, 'L423–426'],
      [[b.fence.warnMs, b.fence.lifeMs, b.fence.lifeRandMs, b.fence.tries, b.fence.lineBase, b.fence.lineExtraMax,
        b.fence.gapMinLen, b.fence.mirrorChance], [2000, 9000, 4000, 60, 5, 4, 7, 0.5], 'L451–476'],
      [b.fence.poolAfterUnlock, [{ offset: 0, add: ['line', 'L'] }, { offset: 1, add: ['T', 'Z'] },
        { offset: 2, add: ['F', 'U', 'plus'] }], 'L466–468'],
      [b.fence.shapes.L, [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]], 'L442'],
      [b.fence.shapes.T, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [2, 1], [2, 2], [2, 3]], 'L443'],
      [b.fence.shapes.Z, [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [3, 2], [4, 2]], 'L444'],
      [b.fence.shapes.F, [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [1, 2], [0, 3], [0, 4]], 'L445'],
      [b.fence.shapes.U, [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 1], [3, 0]], 'L446'],
      [b.fence.shapes.plus, [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [2, 3], [2, 4]], 'L447'],
      [[b.maze.warnMs, b.maze.lifeMs, b.maze.lifeRandMs, b.maze.minCells, b.maze.cooldownMs], [2600, 14000, 4000, 6, 26000], 'L501–503'],
      [b.terrain, { periodMs: 3400, upMs: 1400, warnMs: 900, startDelayMs: 600, fadeOutMs: 500, lifeMs: 18000,
        lifeRandMs: 6000, tries: 40, minCells: 6, waveChance: 0.5, horizChance: 0.5, waveLenMin: 6, waveLenRand: 3,
        waveWidth: 2, waveDelayMs: 260, checkerSize: 4, maxActive: 1, maxActiveLate: 2, lateLevel: 8 }, 'L171, L509–546, L584, L595'],
      [b.director, { firstSpawnMs: 2500, intervalBaseMs: 5000, intervalPerLevelMs: 300, intervalMinMs: 2000, capBase: 2,
        capPerLevels: 2, capMax: 8, weights: { rock: 3, fence: 2, terrain: 2, maze: 2 } }, 'L309, L537–547'],
      [b.flow, { countdownMs: 1500, countdownDigits: 3, maxFrameDeltaMs: 100, deathCardDelayMs: 550 }, 'L174, L989, L694'],
      [b.ui, { bannerMs: 1800, swipeMinPx: 18, swipeBoardFactor: 0.05, haptics: { eatMs: 12, level: [15, 40, 15], deathMs: 90 },
        terrainFadeInMs: 600, hazardFlickerMs: 1500 }, 'L414, L753, L790, L608, L683, L856, L879'],
    ];
    for (const [actual, expected, where] of table) expect(actual, where).toEqual(expected);
  });

  it('GDD-7 parseBalance rejects minMs > startMs', () => {
    expect(() => parseBalance(mutate(j => { j.speed.minMs = 141; }))).toThrow(/Invalid balance: speed\.minMs/);
  });
});
```

Remaining balance tests (each uses `mutate` and expects the regex): `GDD-7 parseBalance rejects a missing value` (delete `board.cols` → `/board\.cols must be a positive integer/`); `GDD-7 parseBalance rejects a negative duration` (`rock.warnMs = -1` → `/rock\.warnMs/`); `GDD-7 parseBalance rejects a probability above 1` (`mango.goldenChance = 1.5` → `/mango\.goldenChance must be a number in \[0, 1\]/`); `GDD-7 parseBalance rejects an unknown shape name` (`rock.shapePoolByLevel[1].add = ['hex']` → `/rock\.shapePoolByLevel\[1\]\.add/`); `GDD-7 parseBalance rejects a terrain cycle without a down phase` (`terrain.upMs = 2500` → `/terrain\.periodMs/`); `GDD-7 parseBalance rejects a non-object` (`parseBalance(null)` → `/Invalid balance: balance must be an object/`). Maze layout cells are pinned in Task 5 (`mazeCells`).

- [ ] **Step 7: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `parseBalance`, `seedRng`, `key` not exported yet.

- [ ] **Step 8: Implement `parseBalance` (append to `src/core/balance.ts`)**

```ts
const ROCK_KEYS: readonly RockShapeKey[] = ['single', 'lineH', 'lineV', 'corner', 'block'];
const FENCE_SHAPE_KEYS: readonly FenceShapeKey[] = ['L', 'T', 'Z', 'F', 'U', 'plus'];
const FENCE_KINDS: readonly FenceKind[] = ['line', ...FENCE_SHAPE_KEYS];

type Rule = 'int+' | 'int0' | 'num+' | 'prob' | 'pair' | 'pairs' | 'pairs0' | 'ints' | 'quad';
type Check = Rule | Spec | ((v: unknown, path: string) => void);
interface Spec { [key: string]: Check }

function fail(path: string, msg: string): never { throw new Error(`Invalid balance: ${path} ${msg}`); }
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);
const isPair = (v: unknown): boolean => Array.isArray(v) && v.length === 2 && v.every(isInt);

const RULES: Record<Rule, [(v: unknown) => boolean, string]> = {
  'int+': [v => isInt(v) && v > 0, 'must be a positive integer'],
  'int0': [v => isInt(v) && v >= 0, 'must be a non-negative integer'],
  'num+': [v => typeof v === 'number' && v > 0, 'must be a positive number'],
  prob: [v => typeof v === 'number' && v >= 0 && v <= 1, 'must be a number in [0, 1]'],
  pair: [isPair, 'must be an [x, y] integer pair'],
  pairs: [v => Array.isArray(v) && v.length > 0 && v.every(isPair), 'must be a non-empty list of [x, y] integer pairs'],
  pairs0: [v => Array.isArray(v) && v.every(isPair), 'must be a list of [x, y] integer pairs'],
  ints: [v => Array.isArray(v) && v.length > 0 && v.every(n => isInt(n) && n > 0), 'must be a non-empty list of positive integers'],
  quad: [v => Array.isArray(v) && v.length === 4 && v.every(n => isInt(n) && n >= 0), 'must be [x1, y1, x2, y2] with non-negative integers'],
};

const listOf = (item: Check) => (v: unknown, path: string): void => {
  if (!Array.isArray(v) || v.length === 0) fail(path, 'must be a non-empty list');
  v.forEach((x, i) => check(x, item, `${path}[${i}]`));
};
const namesOf = (allowed: readonly string[]) => (v: unknown, path: string): void => {
  if (!Array.isArray(v) || v.length === 0 || !v.every(n => typeof n === 'string' && allowed.includes(n)))
    fail(path, `must be a non-empty list of ${allowed.join(' | ')}`);
};
const recordOf = (keys: readonly string[], item: Check): Spec => Object.fromEntries(keys.map(k => [k, item]));
const timed: Spec = { warnMs: 'int+', lifeMs: 'int+', lifeRandMs: 'int0' };

const SPEC: Spec = {
  board: { cols: 'int+', rows: 'int+' },
  snake: { start: 'pairs', startDir: 'pair', maxQueuedTurns: 'int+' },
  speed: { startMs: 'int+', minMs: 'int+', msPerLevel: 'int0' },
  level: { maxLevel: 'int+', needBase: 'int+', needPerLevel: 'int0', unlock: { fence: 'int0', terrain: 'int0', maze: 'int0' } },
  mango: {
    rotBaseMs: 'int+', rotPerEatenMs: 'int0', rotMinMs: 'int+', goldenRotFactor: 'prob', goldenChance: 'prob',
    goldenMinEaten: 'int0', points: { normal: 'int+', golden: 'int+' }, progress: { normal: 'int+', golden: 'int+' },
    nearHeadDist: 'int+',
  },
  fairness: { nearHeadDist: 'int+', frontLaneCells: 'int+', terrainNearHeadDist: 'int+' },
  hazard: { crumbleMs: 'int+' },
  rock: { ...timed, tries: 'int+', shapePoolByLevel: listOf({ minLevel: 'int0', add: namesOf(ROCK_KEYS) }),
    shapes: recordOf(ROCK_KEYS, 'pairs') },
  fence: { ...timed, tries: 'int+', lineBase: 'int+', lineExtraMax: 'int0', gapMinLen: 'int+', mirrorChance: 'prob',
    poolAfterUnlock: listOf({ offset: 'int0', add: namesOf(FENCE_KINDS) }), shapes: recordOf(FENCE_SHAPE_KEYS, 'pairs') },
  maze: { ...timed, minCells: 'int+', cooldownMs: 'int+', layouts: listOf({ segments: listOf('quad'), exclude: 'pairs0' }) },
  terrain: {
    periodMs: 'int+', upMs: 'int+', warnMs: 'int+', startDelayMs: 'int0', fadeOutMs: 'int0', lifeMs: 'int+',
    lifeRandMs: 'int0', tries: 'int+', minCells: 'int+', waveChance: 'prob', horizChance: 'prob', waveLenMin: 'int+',
    waveLenRand: 'int+', waveWidth: 'int+', waveDelayMs: 'int0', checkerSize: 'int+', maxActive: 'int+',
    maxActiveLate: 'int+', lateLevel: 'int0',
  },
  director: {
    firstSpawnMs: 'int+', intervalBaseMs: 'int+', intervalPerLevelMs: 'int0', intervalMinMs: 'int+', capBase: 'int0',
    capPerLevels: 'int+', capMax: 'int+', weights: { rock: 'num+', fence: 'num+', terrain: 'num+', maze: 'num+' },
  },
  flow: { countdownMs: 'int+', countdownDigits: 'int+', maxFrameDeltaMs: 'int+', deathCardDelayMs: 'int0' },
  ui: {
    bannerMs: 'int+', swipeMinPx: 'num+', swipeBoardFactor: 'prob',
    haptics: { eatMs: 'int+', level: 'ints', deathMs: 'int+' }, terrainFadeInMs: 'int+', hazardFlickerMs: 'int+',
  },
};

function check(v: unknown, c: Check, path: string): void {
  if (typeof c === 'function') { c(v, path); return; }
  if (typeof c === 'object') {
    if (!isObj(v)) fail(path || 'balance', 'must be an object');
    for (const k of Object.keys(c)) check(v[k], c[k] as Check, path ? `${path}.${k}` : k);
    return;
  }
  const [ok, msg] = RULES[c];
  if (!ok(v)) fail(path, msg);
}

/** Validates the balance JSON and returns it typed; throws `Invalid balance: <path> <reason>`. GDD-7 */
export function parseBalance(json: unknown): Balance {
  check(json, SPEC, '');
  const b = json as Balance;
  if (b.speed.minMs > b.speed.startMs) fail('speed.minMs', 'must be ≤ speed.startMs');
  if (b.mango.rotMinMs > b.mango.rotBaseMs) fail('mango.rotMinMs', 'must be ≤ mango.rotBaseMs');
  if (b.terrain.upMs + b.terrain.warnMs >= b.terrain.periodMs) fail('terrain.periodMs', 'must be > upMs + warnMs');
  if (b.snake.start.length < 2) fail('snake.start', 'must have at least 2 cells');
  if (Math.abs(b.snake.startDir[0]) + Math.abs(b.snake.startDir[1]) !== 1) fail('snake.startDir', 'must be one unit step');
  return b;
}
```

- [ ] **Step 9: Implement `src/core/grid.ts`**

```ts
// src/core/grid.ts — grid helpers (prototype L314–378). MEC-004
import type { Cell, Dir } from './types';

const NEIGHBORS: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const key = (cols: number, x: number, y: number): number => y * cols + x;
export const inBounds = (cols: number, rows: number, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < cols && y < rows;

// MEC-004 fairness: Manhattan distance < d, or one of `lane` cells straight ahead along the current dir (L353–358)
export function nearHead(head: Cell, dir: Dir, x: number, y: number, d: number, lane: number): boolean {
  if (Math.abs(head.x - x) + Math.abs(head.y - y) < d) return true;
  for (let i = 1; i <= lane; i++) if (head.x + dir.x * i === x && head.y + dir.y * i === y) return true;
  return false;
}

// MEC-004 BFS from the head over in-bounds cells that are not walls (L363–378). Result is transient, never stored.
export function reachable(cols: number, rows: number, head: Cell, isWall: (x: number, y: number) => boolean): Set<number> {
  const seen = new Set<number>([key(cols, head.x, head.y)]);
  const q: Cell[] = [head];
  for (let qi = 0; qi < q.length; qi++) {
    const p = q[qi] as Cell;
    for (const [dx, dy] of NEIGHBORS) {
      const nx = p.x + dx, ny = p.y + dy, k = key(cols, nx, ny);
      if (!inBounds(cols, rows, nx, ny) || seen.has(k) || isWall(nx, ny)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return seen;
}
```

- [ ] **Step 10: Run tests and typecheck**

Run: `npm test` then `npm run typecheck`
Expected: all PASS (boundary test now scans `src/core/*.ts` and stays green).

- [ ] **Step 11: Docs**

- `docs/CODEMAP.md`: Entry points: Balance config → `config/balance.json` (read via `parseBalance` in `src/core/balance.ts`); Modules: add `| src/core/ | Pure rules: balance, RNG, grid/BFS (grows per task) | index.ts, types.ts, balance.ts | — | MEC-001…004, GDD-7 | tests/core/ |`.
- `CHANGELOG.md`: `- feat: balance config with parseBalance, seeded RNG, core API types and grid/BFS helpers (P0 PR 2).`
- `docs/STATUS.md`: Now/Next updated.

- [ ] **Step 12: Commit**

```bash
git add config/ src/core/ tests/ docs/CODEMAP.md docs/STATUS.md CHANGELOG.md
git commit -m "feat(core): balance config, parseBalance, seeded RNG, core types and grid BFS"
```

### Task 3: Snake, levels and the Sim shell

**Branch:** `feat/p0-snake-level` · **Spec:** design §4 (API, snapshot rules), §5 MEC-001, MEC-003.

**Files:**
- Create: `src/core/level.ts`, `src/core/cells.ts`, `src/core/snake.ts`, `src/core/sim.ts`, `tests/support/state.ts`
- Test: `tests/core/snake.test.ts`, `tests/core/level.test.ts`, `tests/core/sim.test.ts`
- Modify: `src/core/index.ts`, `docs/CODEMAP.md`, `CHANGELOG.md`, `docs/STATUS.md`

**Interfaces:**
- Consumes: `Balance`, `Rng`, `rngFrom`, `seedRng`, all `types.ts` types, `inBounds` (Task 2).
- Produces:
  - `level.ts`: `needFor(b: Balance, level: number): number`; `tickMsFor(b: Balance, level: number): number`; `unlockedAt(b: Balance, level: number): UnlockKey | undefined`; `isUnlocked(b: Balance, level: number, k: UnlockKey): boolean`; `addProgress(s: SimState, b: Balance, n: number): void`.
  - `cells.ts`: `snakeOn(s, x, y): boolean`; `rottenAt(s, x, y): boolean`; `cellSolidCause(s, x, y): CauseKey | null`; `cellReserved(s, x, y): boolean`; `cellBfsWall(s, x, y): boolean` (all take `s: SimState, x: number, y: number`).
  - `snake.ts`: `queueTurn(s: SimState, b: Balance, dx: Step, dy: Step): void`; `stepSnake(s: SimState, b: Balance, rng: Rng): void`.
  - `sim.ts`: `initialState(b: Balance, seed: number): SimState`; `createSim(b: Balance, seed: number): Sim`; `restoreSim(b: Balance, state: SimState): Sim` (deep-copies `state`); `stateOf(sim: Sim): SimState` (live reference, tests/tools only).
  - `tests/support/state.ts`: `buildState(b: Balance, o?: StateOpts): SimState`; `QUIET` (a `spawnInMs` that keeps the director silent).
  - `index.ts` adds: `createSim`, `restoreSim`, `needFor`, `tickMsFor`.

- [ ] **Step 1: Branch** — `git switch master; git switch -c feat/p0-snake-level`

- [ ] **Step 2: Write the test helper `tests/support/state.ts`**

```ts
import type { Balance } from '../../src/core/balance';
import { tickMsFor } from '../../src/core/level';
import { initialState } from '../../src/core/sim';
import type { Dir, SimState, Step } from '../../src/core/types';

export const QUIET = Number.MAX_SAFE_INTEGER;   // spawnInMs that keeps the director silent
type P = [number, number];
export interface StateOpts {
  seed?: number; snake?: P[]; dir?: P; mango?: P | null; golden?: boolean; mangoLeftMs?: number;
  rottenRocks?: P[]; level?: number; progress?: number; eaten?: number; score?: number; spawnInMs?: number;
}
const toDir = ([x, y]: P): Dir => ({ x: x as Step, y: y as Step });

export function buildState(b: Balance, o: StateOpts = {}): SimState {
  const s = initialState(b, o.seed ?? 1);
  if (o.snake) {
    s.snake = o.snake.map(([x, y]) => ({ x, y }));
    s.headFrom = { ...s.snake[0]! }; s.tailFrom = { ...s.snake[s.snake.length - 1]! };
  }
  if (o.dir) s.dir = toDir(o.dir);
  if (o.mango) {
    const left = o.mangoLeftMs ?? b.mango.rotBaseMs;
    s.mango = { x: o.mango[0], y: o.mango[1], golden: o.golden ?? false, leftMs: left, totalMs: left };
  }
  if (o.rottenRocks) s.rottenRocks = o.rottenRocks.map(([x, y]) => ({ x, y }));
  if (o.level !== undefined) { s.level = o.level; s.tickMs = tickMsFor(b, o.level); }
  s.progress = o.progress ?? s.progress; s.eaten = o.eaten ?? s.eaten; s.score = o.score ?? s.score;
  s.spawnInMs = o.spawnInMs ?? s.spawnInMs;
  return s;
}
```

- [ ] **Step 3: Write the failing tests (key behaviors in full)**

```ts
// tests/core/snake.test.ts
import { describe, expect, it } from 'vitest';
import { restoreSim, stateOf } from '../../src/core/sim';
import { loadBalance } from '../support/balance';
import { buildState, QUIET } from '../support/state';

const b = loadBalance();
const simOf = (o: Parameters<typeof buildState>[1] = {}) => restoreSim(b, buildState(b, { spawnInMs: QUIET, ...o }));

describe('MEC-001 snake', () => {
  it('MEC-001 turn ignores reverse and same direction and queues at most 3 turns', () => {
    const sim = simOf();
    sim.turn(-1, 0); sim.turn(1, 0);
    expect(stateOf(sim).queue).toEqual([]);
    sim.turn(0, 1); sim.turn(0, -1); sim.turn(-1, 0); sim.turn(0, -1); sim.turn(1, 0);
    expect(stateOf(sim).queue).toEqual([{ x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }]);
  });

  it('MEC-001 the snake steps once per tickMs and dies at the wall without moving', () => {
    const sim = simOf();
    sim.advance(139); expect(sim.snapshot().snake[0]).toEqual({ x: 8, y: 8 });
    sim.advance(1); expect(sim.snapshot().snake[0]).toEqual({ x: 9, y: 8 });
    sim.advance(140 * 7); expect(sim.snapshot().snake[0]).toEqual({ x: 16, y: 8 });
    sim.drainEvents();
    sim.advance(140);
    const snap = sim.snapshot();
    expect(snap.status).toBe('over');
    expect(snap.outcome).toEqual({ won: false, cause: 'wall' });
    expect(snap.snake[0]).toEqual({ x: 16, y: 8 });
    expect(sim.drainEvents()).toEqual([{ type: 'died', cause: 'wall', x: 16, y: 8 }]);
  });

  it('MEC-001 eating grows the snake and scores', () => {
    const sim = simOf({ mango: [9, 8] });
    sim.advance(140);
    const s = stateOf(sim);
    expect(s.snake.map(c => [c.x, c.y])).toEqual([[9, 8], [8, 8], [7, 8], [6, 8]]);
    expect([s.score, s.eaten, s.progress]).toEqual([1, 1, 1]);
    expect(sim.drainEvents()).toEqual([{ type: 'ate', x: 9, y: 8, golden: false, points: 1 }]);
    expect(s.tailFrom).toEqual({ x: 6, y: 8 });
  });
});
```

Remaining tests (names and exact expectations):
- `snake.test.ts`:
  - `MEC-001 start state` — `createSim(b, 1)` snapshot: snake `(8,8),(7,8),(6,8)`, dir `{x:1,y:0}`, heading = dir, `tickMs` 140, `status` 'playing', `outcome` null, `headFrom` (8,8), `tailFrom` (6,8).
  - `MEC-001 a queued turn is applied at the next step` — `turn(0,1)` then `advance(140)` → head (8,9), `dir` `{0,1}`, queue empty; heading before the step = `{0,1}`.
  - `MEC-001 self collision` — snake `[[5,5],[6,5],[6,6],[5,6],[4,6]]`, dir `[0,1]`, `advance(140)` → cause `'self'`, snake unchanged.
  - `MEC-001 moving into the cell the tail just left is allowed` — snake `[[5,5],[6,5],[6,6],[5,6]]`, dir `[0,1]`, `advance(140)` → status 'playing', head (5,6).
  - `MEC-001 eating next to the tail grows the snake and keeps the tail` — snake `[[5,5],[5,4],[6,4],[7,4],[7,5],[7,6],[6,6]]`, dir `[0,1]`, mango `[5,6]` → `advance(140)`: playing, length 8, tail still (6,6), `tailFrom` (6,6).
  - `MEC-001 a rotten rock kills with cause rotten` — rottenRocks `[[9,8]]` → `advance(140)` → `{won:false, cause:'rotten'}`.
  - `MEC-001 death keeps headFrom and tailFrom` — after the wall death above, `headFrom` (15,8), `tailFrom` (13,8) (values from the last move).
  - `MEC-001 headFrom/tailFrom follow the last move` — after `advance(140)` from start: `headFrom` (8,8), `tailFrom` (6,8).
  - `MEC-001 tickAlpha is acc / tickMs and 1 when over` — `advance(70)` → 0.5; after a wall death → 1.
  - `MEC-001 advance after over is a no-op` — snapshot JSON before/after `advance(5000)` identical; `drainEvents()` empty.
  - `MEC-001 turn is ignored after over` — queue stays `[]`.
  - `MEC-001 advance rejects a negative or fractional ms` — `advance(-1)` and `advance(1.5)` throw `RangeError`.
- `level.test.ts`:
  - `MEC-003 needFor is 4 + level` — `needFor(b,0)` 4, `needFor(b,9)` 13.
  - `MEC-003 tickMs is max(95, 140 - 4 * level)` — levels 0, 5, 10, 12 → 140, 120, 100, 95.
  - `MEC-003 progress overflow carries into the next levels` — state level 0 progress 0, `addProgress(s,b,9)` → level 2, progress 0, events `[{type:'levelUp',level:1},{type:'levelUp',level:2,unlocked:'fence'}]`.
  - `MEC-003 unlock levels` — `unlockedAt(b,2)` 'fence', `(b,4)` 'terrain', `(b,6)` 'maze', `(b,3)` undefined.
  - `MEC-003 max level pins progress to 0` — level 9 progress 12, `addProgress(s,b,1)` → level 10, progress 0; `addProgress(s,b,2)` → level 10, progress 0, no new event.
  - `MEC-003 eating applies the new speed at once` — level 0 progress 3, mango `[9,8]`, `advance(140)` → level 1, `tickMs` 136, events `ate` then `levelUp {level:1}`.
- `sim.test.ts`:
  - `MEC-001 snapshot is a copy` — mutating `snapshot().snake[0].x` does not change `stateOf(sim)`.
  - `MEC-001 drainEvents empties the queue` — second call returns `[]`.

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test` — Expected: FAIL (modules missing).

- [ ] **Step 5: Implement `src/core/level.ts`**

```ts
// src/core/level.ts — MEC-003 levels, 10-level prototype version (needFor L169, addProgress L601–612, updateSpeed L620–623)
import type { Balance } from './balance';
import type { SimState, UnlockKey } from './types';

const UNLOCK_ORDER: readonly UnlockKey[] = ['fence', 'terrain', 'maze'];

export const needFor = (b: Balance, level: number): number => b.level.needBase + b.level.needPerLevel * level;
export const tickMsFor = (b: Balance, level: number): number =>
  Math.max(b.speed.minMs, b.speed.startMs - b.speed.msPerLevel * level);
export const unlockedAt = (b: Balance, level: number): UnlockKey | undefined =>
  UNLOCK_ORDER.find(k => b.level.unlock[k] === level);
export const isUnlocked = (b: Balance, level: number, k: UnlockKey): boolean => level >= b.level.unlock[k];

// MEC-003 add progress; overflow carries; one levelUp per level gained; progress stays 0 at max level
export function addProgress(s: SimState, b: Balance, n: number): void {
  const max = b.level.maxLevel;
  if (s.level < max) s.progress += n;
  while (s.level < max && s.progress >= needFor(b, s.level)) {
    s.progress -= needFor(b, s.level);
    s.level += 1;
    const unlocked = unlockedAt(b, s.level);
    s.events.push(unlocked ? { type: 'levelUp', level: s.level, unlocked } : { type: 'levelUp', level: s.level });
  }
  if (s.level >= max) s.progress = 0;
}
```

- [ ] **Step 6: Implement `src/core/cells.ts` (snake, rotten rocks, mango; Task 5 adds the registry loop)**

```ts
// src/core/cells.ts — cell queries for collision, placement and BFS (L318–351, L365–373). MEC-004
import type { CauseKey, Cell, SimState } from './types';

const at = (c: Cell, x: number, y: number): boolean => c.x === x && c.y === y;
export const snakeOn = (s: SimState, x: number, y: number): boolean => s.snake.some(c => at(c, x, y));
export const rottenAt = (s: SimState, x: number, y: number): boolean => s.rottenRocks.some(c => at(c, x, y));

// MEC-004 solid right now: rotten rock, then hazard families (L341–346)
export function cellSolidCause(s: SimState, x: number, y: number): CauseKey | null {
  if (rottenAt(s, x, y)) return 'rotten';
  return null;
}
// MEC-002 reserved for placement: snake, rotten rock, any hazard cell, mango (L348–351)
export function cellReserved(s: SimState, x: number, y: number): boolean {
  return snakeOn(s, x, y) || rottenAt(s, x, y) || (s.mango !== null && at(s.mango, x, y));
}
// MEC-004 BFS wall: snake body without the last cell, rotten rocks, hazard cells in any state (L365, L372–373)
export function cellBfsWall(s: SimState, x: number, y: number): boolean {
  for (let i = 0; i < s.snake.length - 1; i++) if (at(s.snake[i]!, x, y)) return true;
  return rottenAt(s, x, y);
}
```

- [ ] **Step 7: Implement `src/core/snake.ts`**

```ts
// src/core/snake.ts — MEC-001 (prototype turn L698–706, step L769–799)
import type { Balance } from './balance';
import { cellSolidCause } from './cells';
import { inBounds } from './grid';
import { addProgress, tickMsFor } from './level';
import type { Rng } from './rng';
import type { CauseKey, Cell, MangoState, SimState, Step } from './types';

// MEC-001 queue a turn: compare with the last queued (else current) dir; no reverse, no repeat, max maxQueuedTurns
export function queueTurn(s: SimState, b: Balance, dx: Step, dy: Step): void {
  if (s.status !== 'playing') return;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return;               // not a unit step; no prototype input produces one
  const last = s.queue.length ? s.queue[s.queue.length - 1]! : s.dir;
  if (dx === -last.x && dy === -last.y) return;
  if (dx === last.x && dy === last.y) return;
  if (s.queue.length < b.snake.maxQueuedTurns) s.queue.push({ x: dx, y: dy });
}

// MEC-001 one step: take a queued turn; cause order wall → self → solid cell; move; eat
export function stepSnake(s: SimState, b: Balance, rng: Rng): void {
  const turn = s.queue.shift();
  if (turn) s.dir = turn;
  const head = s.snake[0]!;
  const nx = head.x + s.dir.x, ny = head.y + s.dir.y;
  const eating = s.mango !== null && s.mango.x === nx && s.mango.y === ny;
  const body = eating ? s.snake : s.snake.slice(0, -1);
  const cause: CauseKey | null = !inBounds(b.board.cols, b.board.rows, nx, ny) ? 'wall'
    : body.some(c => c.x === nx && c.y === ny) ? 'self'
    : cellSolidCause(s, nx, ny);
  if (cause) {
    s.status = 'over';
    s.outcome = { won: false, cause };
    s.events.push({ type: 'died', cause, x: head.x, y: head.y });
    return;
  }
  s.headFrom = { ...head };
  s.tailFrom = { ...s.snake[s.snake.length - 1]! };
  s.snake.unshift({ x: nx, y: ny });
  if (eating) eat(s, b, rng); else s.snake.pop();
}

function eat(s: SimState, b: Balance, rng: Rng): void {          // L781–795
  const m = s.mango as MangoState;
  const points = m.golden ? b.mango.points.golden : b.mango.points.normal;
  s.score += points;
  s.eaten += 1;
  s.events.push({ type: 'ate', x: m.x, y: m.y, golden: m.golden, points });
  addProgress(s, b, m.golden ? b.mango.progress.golden : b.mango.progress.normal);
  s.tickMs = tickMsFor(b, s.level);
  s.tailFrom = { ...(s.snake[s.snake.length - 1] as Cell) };
  void rng;          // used by mango placement from Task 4
  s.mango = null;    // Task 4 replaces this line with: if (!placeMango(s, b, rng)) endBoardFull(s);
}
```

- [ ] **Step 8: Implement `src/core/sim.ts`**

```ts
// src/core/sim.ts — Sim factory, 1 ms step and snapshot (design §4; prototype frame L996–1007, reset L626–644)
import type { Balance, Pair } from './balance';
import { needFor, tickMsFor } from './level';
import { rngFrom, seedRng, type Rng } from './rng';
import { queueTurn, stepSnake } from './snake';
import type { Dir, Sim, SimSnapshot, SimState, Step } from './types';

const toDir = ([x, y]: Pair): Dir => ({ x: x as Step, y: y as Step });
const states = new WeakMap<Sim, SimState>();

export function initialState(b: Balance, seed: number): SimState {
  const snake = b.snake.start.map(([x, y]) => ({ x, y }));
  return {
    snake, dir: toDir(b.snake.startDir), queue: [],
    headFrom: { ...snake[0]! }, tailFrom: { ...snake[snake.length - 1]! },
    acc: 0, tickMs: tickMsFor(b, 0), mango: null, rottenRocks: [], hazards: [], terrains: [],
    spawnInMs: b.director.firstSpawnMs, mazeCooldownMs: 0, score: 0, eaten: 0, level: 0, progress: 0,
    status: 'playing', outcome: null, events: [], rng: seedRng(seed),
  };
}

// One 1 ms step in prototype frame() order (L997–1004). Director/hazards are added in Task 5, rot in Task 4.
function stepMs(s: SimState, b: Balance, rng: Rng): void {
  s.acc += 1;
  s.tickMs = tickMsFor(b, s.level);
  if (s.status === 'playing' && s.acc >= s.tickMs) { s.acc -= s.tickMs; stepSnake(s, b, rng); }
}

function snapshotOf(s: SimState, b: Balance): SimSnapshot {
  const c = structuredClone(s);
  return {
    snake: c.snake, dir: c.dir, heading: c.queue.length ? c.queue[c.queue.length - 1]! : { ...c.dir },
    headFrom: c.headFrom, tailFrom: c.tailFrom,
    tickAlpha: s.status === 'over' ? 1 : Math.min(1, s.acc / s.tickMs),
    mango: c.mango && { ...c.mango, ageMs: c.mango.totalMs - c.mango.leftMs },
    rottenRocks: c.rottenRocks,
    hazards: c.hazards.map(h => ({
      type: h.family, state: h.state, t: h.t, warnMs: h.warnMs, lifeMs: h.lifeMs, cells: h.cells,
      ...(h.kind ? { kind: h.kind } : {}),
    })),
    terrains: c.terrains.map(t => ({ t: t.t, lifeMs: t.lifeMs, cells: t.cells.map(({ x, y, vis, delay }) => ({ x, y, vis, delay })) })),
    score: s.score, level: s.level, progress: s.progress, need: needFor(b, s.level), tickMs: s.tickMs,
    status: s.status, outcome: c.outcome,
  };
}

function wrap(b: Balance, s: SimState): Sim {
  const rng = rngFrom(s.rng);
  const sim: Sim = {
    turn: (dx, dy) => queueTurn(s, b, dx, dy),
    advance: ms => {
      if (!Number.isInteger(ms) || ms < 0) throw new RangeError(`advance(ms): non-negative integer expected, got ${ms}`);
      for (let i = 0; i < ms && s.status === 'playing'; i++) stepMs(s, b, rng);
    },
    drainEvents: () => s.events.splice(0),
    snapshot: () => snapshotOf(s, b),
    clone: () => restoreSim(b, s),
  };
  states.set(sim, s);
  return sim;
}

export function createSim(b: Balance, seed: number): Sim { return wrap(b, initialState(b, seed)); }
/** Independent Sim from a state (deep copy). Used by clone(), tests and tools. */
export function restoreSim(b: Balance, state: SimState): Sim { return wrap(b, structuredClone(state)); }
/** Live state of a Sim. Tests and tools only; never mutate from the game layer. */
export function stateOf(sim: Sim): SimState {
  const s = states.get(sim);
  if (!s) throw new Error('stateOf: not a core Sim');
  return s;
}
```

Append to `src/core/index.ts`:

```ts
export { createSim, restoreSim } from './sim';
export { needFor, tickMsFor } from './level';
```

- [ ] **Step 9: Run tests and typecheck** — `npm test`; `npm run typecheck` — Expected: PASS.

- [ ] **Step 10: Docs** — CODEMAP `src/core/` row: key files `sim.ts, snake.ts, level.ts`; Entry points: "Main game loop (core)" → `src/core/sim.ts` `stepMs`. CHANGELOG: `- feat: core snake (turn queue, collisions), 10-level progression and Sim shell with snapshot (P0 PR 3).` STATUS updated.

- [ ] **Step 11: Commit**

```bash
git add src/core/ tests/ docs/CODEMAP.md docs/STATUS.md CHANGELOG.md
git commit -m "feat(core): snake turn queue and step, level progression, Sim shell"
```

---

### Task 4: Mangoes (placement, golden, rot, rotten rocks)

**Branch:** `feat/p0-mango` · **Spec:** design §5 MEC-002, §4 step order (rot before snake step).

**Files:**
- Create: `src/core/mango.ts`; Test: `tests/core/mango.test.ts`
- Modify: `src/core/snake.ts` (`eat` tail), `src/core/sim.ts` (`createSim`, `stepMs`), `docs/CODEMAP.md`, `CHANGELOG.md`, `docs/STATUS.md`

**Interfaces:**
- Consumes: `cellReserved`, `cellBfsWall` (Task 3), `reachable`, `nearHead`, `key` (Task 2).
- Produces: `rotMsFor(b: Balance, eaten: number, golden: boolean): number`; `placeMango(s: SimState, b: Balance, rng: Rng): boolean`; `rotMango(s: SimState, b: Balance, rng: Rng): void`; `endBoardFull(s: SimState): void`.

- [ ] **Step 1: Branch** — `git switch master; git switch -c feat/p0-mango`

- [ ] **Step 2: Write the failing tests (key behaviors in full)**

```ts
// tests/core/mango.test.ts
import { describe, expect, it } from 'vitest';
import { nearHead } from '../../src/core/grid';
import { placeMango, rotMango, rotMsFor } from '../../src/core/mango';
import { rngFrom, seedRng, type Rng } from '../../src/core/rng';
import { restoreSim, stateOf } from '../../src/core/sim';
import type { Cell } from '../../src/core/types';
import { loadBalance } from '../support/balance';
import { buildState, QUIET } from '../support/state';

const b = loadBalance();
function scripted(choose: (pool: readonly Cell[]) => Cell, chanceResult = true) {
  const calls: string[] = [];
  const rng: Rng = {
    next: () => { calls.push('next'); return 0; }, int: () => { calls.push('int'); return 0; },
    pick<T>(arr: readonly T[]): T { calls.push('pick'); return choose(arr as readonly Cell[]) as T; },
    chance: () => { calls.push('chance'); return chanceResult; },
  };
  return { rng, calls };
}

describe('MEC-002 mango', () => {
  it('MEC-002 golden is rolled after the cell pick and only from 3 eaten', () => {
    const s2 = buildState(b, { eaten: 2 }); const a = scripted(p => p[0]!);
    placeMango(s2, b, a.rng);
    expect(a.calls).toEqual(['pick']); expect(s2.mango!.golden).toBe(false);
    const s3 = buildState(b, { eaten: 3 }); const c = scripted(p => p[0]!, true);
    placeMango(s3, b, c.rng);
    expect(c.calls).toEqual(['pick', 'chance']); expect(s3.mango!.golden).toBe(true);
    expect(s3.mango!.totalMs).toBe(3775);           // max(4000, 8000 - 450) * 0.5
  });

  it('MEC-002 a fair rot leaves a rotten rock; an unfair rot does not and may re-pick the same cell', () => {
    const fair = buildState(b, { mango: [2, 2] });
    rotMango(fair, b, rngFrom(seedRng(5)));
    expect(fair.rottenRocks).toEqual([{ x: 2, y: 2 }]);
    expect(fair.events).toEqual([{ type: 'rotted', x: 2, y: 2, leftRock: true }]);
    expect(fair.mango).not.toMatchObject({ x: 2, y: 2 });

    // Unfair: mango in the lane ahead; every cell away from the head is a rotten rock, so "good" is empty.
    const s = buildState(b, { mango: [10, 8] });
    const head = s.snake[0]!;
    for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) {
      const taken = s.snake.some(c => c.x === x && c.y === y) || (x === 10 && y === 8);
      if (!taken && !nearHead(head, s.dir, x, y, 3, 4)) s.rottenRocks.push({ x, y });
    }
    const rocks = s.rottenRocks.length;
    const pick = scripted(p => p.find(c => c.x === 10 && c.y === 8) ?? p[0]!);
    rotMango(s, b, pick.rng);
    expect(s.rottenRocks.length).toBe(rocks);
    expect(s.events).toEqual([{ type: 'rotted', x: 10, y: 8, leftRock: false }]);
    expect(s.mango).toMatchObject({ x: 10, y: 8 });
  });

  it('MEC-002 the rot timer runs in sim time', () => {
    const sim = restoreSim(b, buildState(b, { mango: [2, 2], mangoLeftMs: 5, spawnInMs: QUIET }));
    sim.advance(4); expect(sim.drainEvents()).toEqual([]);
    sim.advance(1); expect(sim.drainEvents()[0]).toEqual({ type: 'rotted', x: 2, y: 2, leftRock: true });
  });
});
```

Remaining tests (names and exact expectations):
- `MEC-002 rot time formula` — `rotMsFor(b,0,false)` 8000; `(b,10,false)` 6500; `(b,30,false)` 4000; `(b,4,true)` 3700; `(b,40,true)` 2000.
- `MEC-002 createSim places a non-golden mango on a good cell` — for seeds 1…20: mango not reserved, not near head (d 3, lane 4), reachable, `golden` false, `totalMs` 8000.
- `MEC-002 placement offers only good cells when any exist` — `buildState(b)` (start snake, no mango), `scripted` records the pool: 274 cells (286 free − 12 free near-head cells), none reserved, none near the head (d 3, lane 4).
- `MEC-002 placement falls back to any free cell` — the unfair-rot board above with `placeMango` and the recorded pool: pool = exactly the free near-head cells (all cells for which `nearHead(head, dir, x, y, 3, 4)` is true minus the 3 snake cells, i.e. 12 cells incl. (10,8)).
- `MEC-002 the old mango cell is not reserved for its own replacement` — record the pool passed to `pick` in the unfair board: it contains (10,8).
- `MEC-002 eating the last free cell fills the board` — snake `[[8,8],[7,8],[6,8]]`, mango `[9,8]`, rotten rocks on every other cell, `advance(140)` → status 'over', outcome `{won:true}`, events `ate` then `boardFull`.
- `MEC-002 an unfair rot on a full board re-places the mango on the same cell` — same board but mango `leftMs` 1 (and `spawnInMs: QUIET`): `advance(1)` → events `[{type:'rotted',x:9,y:8,leftRock:false}]`, mango back at (9,8), status 'playing' (a board-full win only comes from a failed placement).
- `MEC-002 eating a golden mango scores 3 and adds 2 progress` (MEC-003) — mango `[9,8]` golden → score 3, progress 2, `ate.points` 3.
- `MEC-002 snapshot mango ageMs = totalMs - leftMs` — `mangoLeftMs` 8000, `advance(100)` → `ageMs` 100, `leftMs` 7900.

- [ ] **Step 3: Run tests to verify they fail** — `npm test` → FAIL (`mango.ts` missing).

- [ ] **Step 4: Implement `src/core/mango.ts`**

```ts
// src/core/mango.ts — MEC-002 (prototype placeFood L381–398, rot L399–406)
import type { Balance } from './balance';
import { cellBfsWall, cellReserved } from './cells';
import { key, nearHead, reachable } from './grid';
import type { Rng } from './rng';
import type { Cell, MangoState, SimState } from './types';

export const rotMsFor = (b: Balance, eaten: number, golden: boolean): number =>
  Math.max(b.mango.rotMinMs, b.mango.rotBaseMs - b.mango.rotPerEatenMs * eaten) * (golden ? b.mango.goldenRotFactor : 1);

const reachSet = (s: SimState, b: Balance): Set<number> =>
  reachable(b.board.cols, b.board.rows, s.snake[0]!, (x, y) => cellBfsWall(s, x, y));
const nearForMango = (s: SimState, b: Balance, x: number, y: number): boolean =>
  nearHead(s.snake[0]!, s.dir, x, y, b.mango.nearHeadDist, b.fairness.frontLaneCells);

// MEC-002 place a mango: clear the old one, prefer reachable cells away from the head; golden rolled after the pick
export function placeMango(s: SimState, b: Balance, rng: Rng): boolean {
  s.mango = null;
  const reach = reachSet(s, b);
  const good: Cell[] = [], any: Cell[] = [];
  for (let y = 0; y < b.board.rows; y++) for (let x = 0; x < b.board.cols; x++) {
    if (cellReserved(s, x, y)) continue;
    any.push({ x, y });
    if (reach.has(key(b.board.cols, x, y)) && !nearForMango(s, b, x, y)) good.push({ x, y });
  }
  const pool = good.length ? good : any;
  if (!pool.length) return false;
  const c = rng.pick(pool);
  const golden = s.eaten >= b.mango.goldenMinEaten && rng.chance(b.mango.goldenChance);
  const total = rotMsFor(b, s.eaten, golden);
  s.mango = { x: c.x, y: c.y, golden, leftMs: total, totalMs: total };
  return true;
}

export function endBoardFull(s: SimState): void {
  s.status = 'over';
  s.outcome = { won: true };
  s.events.push({ type: 'boardFull' });
}

// MEC-002 rot: a fair mango (reachable, not near the head) leaves a permanent rotten rock; always re-place
export function rotMango(s: SimState, b: Balance, rng: Rng): void {
  const m = s.mango as MangoState;
  const fair = reachSet(s, b).has(key(b.board.cols, m.x, m.y)) && !nearForMango(s, b, m.x, m.y);
  if (fair) s.rottenRocks.push({ x: m.x, y: m.y });
  s.events.push({ type: 'rotted', x: m.x, y: m.y, leftRock: fair });
  if (!placeMango(s, b, rng)) endBoardFull(s);
}
```

- [ ] **Step 5: Wire it in**

In `src/core/snake.ts` `eat`: replace the two lines `void rng;` and `s.mango = null; …` with `if (!placeMango(s, b, rng)) endBoardFull(s);` and add `import { endBoardFull, placeMango } from './mango';`.
In `src/core/sim.ts`: add `import { placeMango, rotMango } from './mango';`; `createSim` becomes:

```ts
export function createSim(b: Balance, seed: number): Sim {
  const s = initialState(b, seed);
  placeMango(s, b, rngFrom(s.rng));            // reset() places the first mango (L637)
  return wrap(b, s);
}
```

and `stepMs` gets the rot check between the speed update and the snake step (L1003):

```ts
  if (s.mango) { s.mango.leftMs -= 1; if (s.mango.leftMs <= 0) rotMango(s, b, rng); }
```

- [ ] **Step 6: Run tests and typecheck** — `npm test`; `npm run typecheck` → PASS (Task 3 tests still green: they use `restoreSim(buildState(...))`).

- [ ] **Step 7: Docs** — CODEMAP `src/core/` row adds `mango.ts` under MEC-002. CHANGELOG: `- feat: mango placement with fairness BFS, golden mangoes, rot timer and rotten rocks (P0 PR 4).` STATUS updated.

- [ ] **Step 8: Commit**

```bash
git add src/core/ tests/ docs/CODEMAP.md docs/STATUS.md CHANGELOG.md
git commit -m "feat(core): mango placement, golden roll, rot timer and rotten rocks"
```

---

### Task 5: Hazards, director and fuzz tests

**Branch:** `feat/p0-hazards` · **Spec:** design §4 (step order, determinism), §4.1 (registry), §5 MEC-004, §9 items 1–2.

**Files:**
- Create: `src/core/hazards/shapes.ts`, `timed.ts`, `rock.ts`, `fence.ts`, `maze.ts`, `terrain.ts`, `registry.ts`, `director.ts`; `tests/support/fuzz.ts`
- Test: `tests/core/shapes.test.ts`, `tests/core/hazards.test.ts`, `tests/core/terrain.test.ts`, `tests/core/director.test.ts`, `tests/core/registry.test.ts`, `tests/core/fuzz.test.ts`, `tests/core/determinism.test.ts`
- Modify: `src/core/cells.ts` (registry loop), `src/core/sim.ts` (`stepMs`), `src/core/index.ts`, `docs/CODEMAP.md`, `CHANGELOG.md`, `docs/STATUS.md`

**Interfaces:**
- Consumes: `SpawnCtx`, `StepCtx`, `HazardFamily`, `TimedHazard`, `TerrainHazard`, `HazardInstance` (Task 2 `types.ts`); `nearHead`, `inBounds` (Task 2); `snakeOn`, `cellReserved` (Task 3); `placeMango` (Task 4, fuzz only).
- Produces:
  - `shapes.ts`: `rockPool(b: Balance, level: number): RockShapeKey[]`; `fencePool(b: Balance, level: number): FenceKind[]`; `lineFence(b: Balance, level: number, rng: Rng): Pair[]`; `transform(shape: readonly Pair[], rng: Rng, mirrorChance: number): Pair[]`; `mazeCells(layout: MazeLayout): Cell[]`.
  - `timed.ts`: `makeTimed(family: TimedKey, cells: readonly Cell[], warnMs: number, lifeMs: number, kind?: FenceKind): TimedHazard`; `updateTimed(h: TimedHazard, ctx: StepCtx): 'keep' | 'remove'`; `timedSolidAt`, `timedHasCell` (`(h: TimedHazard, x: number, y: number) => boolean`).
  - `rock.ts` `ROCK`, `fence.ts` `FENCE`, `maze.ts` `MAZE` (`HazardFamily<TimedHazard>`); `terrain.ts` `TERRAIN` (`HazardFamily<TerrainHazard>`), `terrainWant(T: TerrainHazard, c: TerrainCell, b: Balance): TerrainVis`.
  - `registry.ts`: `FAMILIES: readonly HazardFamily<HazardInstance>[]` (ordered); `FAMILY` (keyed by `FamilyKey`); `instancesOf(s: SimState, k: FamilyKey): HazardInstance[]`; `familyAt(s: SimState, x: number, y: number, q: 'solidAt' | 'bfsWallAt' | 'reservedAt'): FamilyKey | null`; `stepHazards(s: SimState, ctx: StepCtx): void`.
  - `director.ts`: `pickWeighted(weights: readonly number[], rng: Rng): number`; `spawnCtx(s: SimState, b: Balance): SpawnCtx`; `updateDirector(s: SimState, b: Balance, rng: Rng): void`.
  - `tests/support/fuzz.ts`: `fuzzSeed(b: Balance, seed: number, simMs: number): FuzzReport` (`{ violations: string[]; steps: number; maxLevel: number; spawned: Record<FamilyKey, number> }`); `snapHash(sim: Sim): string`.
  - `index.ts` adds: `FAMILIES`.

- [ ] **Step 1: Branch** — `git switch master; git pull; git switch -c feat/p0-hazards`

- [ ] **Step 2: Write the failing shape tests**

```ts
// tests/core/shapes.test.ts
import { describe, expect, it } from 'vitest';
import { fencePool, lineFence, mazeCells, rockPool, transform } from '../../src/core/hazards/shapes';
import type { Rng } from '../../src/core/rng';
import { loadBalance } from '../support/balance';

const b = loadBalance();
/** Rng returning fixed int/chance answers in order; records calls. Move to tests/support/rngStub.ts; hazards/terrain tests reuse it. */
function fixed(ints: number[], chances: boolean[] = [], nexts: number[] = []) {
  const calls: string[] = [];
  const rng: Rng = {
    next: () => { calls.push('next'); return nexts.shift() ?? 0; },
    int: n => { calls.push(`int(${n})`); return ints.shift() ?? 0; },
    pick<T>(a: readonly T[]): T { calls.push(`pick(${a.length})`); return a[ints.shift() ?? 0] as T; },
    chance: p => { calls.push(`chance(${p})`); return chances.shift() ?? false; },
  };
  return { rng, calls };
}

describe('MEC-004 shapes', () => {
  it('MEC-004 maze layouts have 20, 30, 20 and 28 cells; layout 4 drops (12,5) and (4,11)', () => {
    const cells = b.maze.layouts.map(mazeCells);
    expect(cells.map(c => c.length)).toEqual([20, 30, 20, 28]);
    expect(cells[3]).not.toContainEqual({ x: 12, y: 5 });
    expect(cells[3]).not.toContainEqual({ x: 4, y: 11 });
    expect(cells[0]!.slice(0, 3)).toEqual([{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }]);   // L486 seg order
  });

  it('MEC-004 lineFence: length 5 + int(1 + min(4, level - 2)), one gap from length 7 (L449–455)', () => {
    const a = fixed([0]);
    expect(lineFence(b, 2, a.rng)).toEqual([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
    expect(a.calls).toEqual(['int(1)']);
    const c = fixed([3, 2]);                              // len 8, gapAt 1 + 2 = 3
    expect(lineFence(b, 6, c.rng)).toEqual([[0, 0], [1, 0], [2, 0], [4, 0], [5, 0], [6, 0], [7, 0]]);
    expect(c.calls).toEqual(['int(5)', 'int(6)']);
  });

  it('MEC-004 transform: int(4) quarter turns [x,y]→[-y,x], then chance mirror [x,y]→[-x,y], then shift to 0 (L457–463)', () => {
    const a = fixed([1], [false]);
    expect(transform([[0, 0], [1, 0], [2, 0]], a.rng, 0.5)).toEqual([[0, 0], [0, 1], [0, 2]]);
    expect(a.calls).toEqual(['int(4)', 'chance(0.5)']);
    const m = fixed([0], [true]);
    expect(transform([[0, 0], [1, 0], [1, 1]], m.rng, 0.5)).toEqual([[1, 0], [0, 0], [0, 1]]);
  });
});
```

Remaining shape tests: `MEC-004 rockPool by level` — level 0/1 `['single']`; 2/3 `['single','lineH','lineV']`; 4+ all five in that order (L428). `MEC-004 fencePool by level` — level 2 `['line','L']`; 3 + `'T','Z'`; 4 + `'F','U','plus'` (L466–468).

- [ ] **Step 3: Write the failing lifecycle, terrain, director and registry tests (key behaviors in full)**

```ts
// tests/core/hazards.test.ts
import { describe, expect, it } from 'vitest';
import { makeTimed, updateTimed } from '../../src/core/hazards/timed';
import type { SimEvent, StepCtx } from '../../src/core/types';
import { loadBalance } from '../support/balance';

const b = loadBalance();
function ctxWithSnake(cells: [number, number][]) {
  const events: SimEvent[] = [];
  const ctx: StepCtx = {
    balance: b, emit: e => events.push(e),
    snakeOn: (x, y) => cells.some(([cx, cy]) => cx === x && cy === y),
  };
  return { ctx, events, cells };
}
const run = (n: number, f: () => unknown) => { for (let i = 0; i < n; i++) f(); };

describe('MEC-004 timed hazards', () => {
  it('MEC-004 warn → solid → crumble → removed with exact durations', () => {
    const h = makeTimed('rock', [{ x: 1, y: 1 }], 1500, 6000);
    const { ctx, events } = ctxWithSnake([]);
    run(1499, () => updateTimed(h, ctx)); expect(h.state).toBe('warn');
    updateTimed(h, ctx); expect(h.state).toBe('solid'); expect(h.cells[0]!.on).toBe(true);
    expect(events).toEqual([{ type: 'dust', x: 1, y: 1 }, { type: 'landed', hazardType: 'rock' }]);
    run(5999, () => updateTimed(h, ctx)); expect(h.state).toBe('solid'); expect(h.cells[0]!.ageMs).toBe(6000);
    updateTimed(h, ctx); expect(h.state).toBe('crumble'); expect(h.cells[0]!.on).toBe(false);
    let r: string = 'keep'; run(449, () => { r = updateTimed(h, ctx); }); expect(r).toBe('keep');
    expect(updateTimed(h, ctx)).toBe('remove');
  });

  it('MEC-004 a solid cell never turns on under the snake and lands once the body has passed', () => {
    const h = makeTimed('fence', [{ x: 1, y: 1 }, { x: 2, y: 1 }], 10, 1000, 'line');
    const s = ctxWithSnake([[2, 1]]);
    run(10, () => updateTimed(h, s.ctx));
    expect(h.cells.map(c => c.on)).toEqual([true, false]);
    s.cells.length = 0;
    updateTimed(h, s.ctx);
    expect(h.cells.map(c => c.on)).toEqual([true, true]);
    expect(s.events.filter(e => e.type === 'landed')).toHaveLength(1);
    expect(s.events.filter(e => e.type === 'dust')).toHaveLength(2);
  });
});
```

Remaining tests (names and exact expectations):
- `hazards.test.ts`:
  - `MEC-004 warning and crumbling hazard cells are passable` — `buildState` with a rock hazard at (9,8) in `warn` (`makeTimed`, pushed to `s.hazards`), `restoreSim`, `advance(140)` → playing, head (9,8). Same with `state: 'crumble'`, cells `on: false`.
  - `MEC-004 a solid hazard cell kills with its family cause` — hazard `fence` at (9,8), `state 'solid'`, cell `on: true` → `{won:false, cause:'fence'}`; `maze` → `'maze'`; `rock` → `'rock'`.
  - `MEC-004 cause order: rotten before hazard` — rotten rock and a solid rock on (9,8) → `'rotten'`.
  - `MEC-004 hazard cells in any state are reserved and BFS walls` — warn rock at (2,2): `cellReserved(s,2,2)` and `cellBfsWall(s,2,2)` true.
  - `MEC-004 hazard life is drawn after a successful placement` — `ROCK.spawn` with `fixed`: calls end with `'next'` exactly once and `lifeMs` = 6000 + next × 4000 (next 0.5 → 8000); a spawn that fails all 40 tries makes no `next` call.
  - `MEC-004 rock picks the shape once, then 40 tries with origin int(17), int(17)` — with a ctx whose `cellFree` is always false: calls = `['pick(1)', 'int(17)', 'int(17)', …]` (1 + 80 calls), result null.
  - `MEC-004 fence RNG order` — level 6, always-free ctx: calls start `pick(7)`, then (line) `int(5)`, `int(len-2)` if len ≥ 7, then `int(4)`, `chance(0.5)`, then `int(17 - w + 1)`, `int(17 - h + 1)`, then `next`; result `kind` set, `warnMs` 2000.
  - `MEC-004 maze drops non-free cells and needs 6` — ctx free only for 5 cells → null; for all → 20/30/20/28 cells, `warnMs` 2600.
- `terrain.test.ts` (use `TERRAIN.update` with `ctxWithSnake`):
  - `MEC-004 terrain cycle: start delay 600, then down 1100 → warn 900 → up 1400` — one cell delay 0: after t = 600 + 1100 − 1 `down`, t = 1700 `warn`, t = 2600 `up`, t = 4000 `down` (next period).
  - `MEC-004 terrain waits for the snake` — snake on the cell at t = 2600 → `vis 'warn'`, `up false`; snake leaves → next step `up`.
  - `MEC-004 terrain goes down after life and is removed 500 ms later` — `lifeMs` 3000: t ≥ 3000 all `down`; `update` returns `'remove'` when t reaches 3500.
  - `MEC-004 non-up terrain is passable and up terrain kills with cause ground` — via `restoreSim`.
  - `MEC-004 terrain is never a BFS wall` — `TERRAIN.bfsWallAt` false for its own cells; `reservedAt` true.
  - `MEC-004 terrain spawn RNG order (wave)` — scripted: `chance(0.5)`→true, `chance(0.5)`→true (horiz), `int(3)`→0 (len 6), `int(12)`, `int(16)`, then `next` (life); 12 cells with delays `i × 260`.
  - `MEC-004 terrain spawn (checker)` — `chance(0.5)`→false, `int(14)`, `int(14)`; 16 cells, delays alternate 0 / 1700; free-check uses d = 3.
- `director.test.ts`:
  - `MEC-004 pickWeighted follows the prototype loop (L550–551)` — weights `[3,2]`: next 0 → 0; next 0.6 (r = 3.0, not > 3) → 0; next 0.61 → 1.
  - `MEC-004 first spawn after 2500 ms, then max(2000, 5000 - 300 * level)` — `buildState` level 0, `spawnInMs` 2500: hazards empty after `advance(2499)`, one rock after `advance(1)`; next spawn exactly 5000 ms later; at level 10 the interval is 2000.
  - `MEC-004 cap counts non-maze hazards in any state` — level 0 (cap 2): two warn rocks present → no rock option; with only a maze present → rock option exists.
  - `MEC-004 unlocks: fence from 2, terrain from 4, maze from 6` — options list via a spy rng (`pickWeighted` input) for levels 1, 2, 4, 6.
  - `MEC-004 maze and terrain never overlap; maze cooldown 26000` — maze active → no terrain option; terrain active → no maze option; after a maze spawn, `mazeCooldownMs` 26000 and no maze option until it reaches ≤ 0.
  - `MEC-004 terrain max active is 1, 2 from level 8`.
  - `MEC-004 a failed option is removed and the pick is redone with a new next()` — always-full board for rocks (cellFree false for rock cells only via a stub family is not possible), so use a board whose free cells fit neither rock nor fence (all cells rotten except a 1-cell gap near the head): both fail → no hazard, two `next` calls.
  - `MEC-004 hazardIncoming is emitted for fence, maze and terrain, not rock`.
  - `MEC-004 new hazard cells are never near the head` — 200 director spawns at levels 0…10: every new timed cell has `!nearHead(head, dir, x, y, 4, 4)`, every terrain cell `!nearHead(…, 3, 4)`.
- `registry.test.ts`:
  - `MEC-004 FAMILIES order is rock, fence, maze, terrain`.
  - `MEC-004 capClass small: rock and fence only`; `MEC-004 causes: rock, fence, maze, ground`; `MEC-004 breakable is false for all families`.
  - `MEC-004 bfsWallAt: timed cells in any state true, terrain false`.

- [ ] **Step 4: Run tests to verify they fail** — `npm test` → FAIL (`src/core/hazards/*` missing).

- [ ] **Step 5: Implement `src/core/hazards/shapes.ts`**

```ts
// src/core/hazards/shapes.ts — rock/fence pools, line fence, transform, maze cells (L423–506). MEC-004
import type { Balance, FenceKind, MazeLayout, Pair, RockShapeKey } from '../balance';
import type { Rng } from '../rng';
import type { Cell } from '../types';

export const rockPool = (b: Balance, level: number): RockShapeKey[] =>
  b.rock.shapePoolByLevel.filter(p => level >= p.minLevel).flatMap(p => p.add);
export const fencePool = (b: Balance, level: number): FenceKind[] =>
  b.fence.poolAfterUnlock.filter(p => level >= b.level.unlock.fence + p.offset).flatMap(p => p.add);

// MEC-004 straight fence; length ≥ gapMinLen gets one gap (L449–455)
export function lineFence(b: Balance, level: number, rng: Rng): Pair[] {
  const f = b.fence;
  const len = f.lineBase + rng.int(1 + Math.min(f.lineExtraMax, level - b.level.unlock.fence));
  const gapAt = len >= f.gapMinLen ? 1 + rng.int(len - 2) : -1;
  const out: Pair[] = [];
  for (let i = 0; i < len; i++) if (i !== gapAt) out.push([i, 0]);
  return out;
}

// MEC-004 random quarter turns, optional mirror, shift to the origin (L457–463)
export function transform(shape: readonly Pair[], rng: Rng, mirrorChance: number): Pair[] {
  let pts: Pair[] = shape.map(([x, y]) => [x, y]);
  for (let r = rng.int(4); r > 0; r--) pts = pts.map(([x, y]) => [-y, x]);
  if (rng.chance(mirrorChance)) pts = pts.map(([x, y]) => [-x, y]);
  const mx = Math.min(...pts.map(p => p[0])), my = Math.min(...pts.map(p => p[1]));
  return pts.map(([x, y]) => [x - mx + 0, y - my + 0]);          // + 0 turns -0 into 0 for toEqual
}

// MEC-004 expand segments (x outer, y inner, as seg() L478–483) and drop excluded cells
export function mazeCells(layout: MazeLayout): Cell[] {
  const out: Cell[] = [];
  for (const [x1, y1, x2, y2] of layout.segments)
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
        if (!layout.exclude.some(([ex, ey]) => ex === x && ey === y)) out.push({ x, y });
  return out;
}
```

- [ ] **Step 6: Implement `src/core/hazards/timed.ts`**

```ts
// src/core/hazards/timed.ts — shared warn → solid → crumble lifecycle of rock/fence/maze (L416–422, L557–576). MEC-004
import type { FenceKind } from '../balance';
import type { Cell, StepCtx, TimedHazard, TimedKey } from '../types';

export function makeTimed(family: TimedKey, cells: readonly Cell[], warnMs: number, lifeMs: number, kind?: FenceKind): TimedHazard {
  const h: TimedHazard = {
    family, state: 'warn', t: 0, warnMs, lifeMs, landed: false,
    cells: cells.map(c => ({ x: c.x, y: c.y, on: false, ageMs: 0 })),
  };
  if (kind) h.kind = kind;
  return h;
}

// MEC-004 one 1 ms step; a cell lands only when the snake is not on it; dust per cell, landed once
export function updateTimed(h: TimedHazard, ctx: StepCtx): 'keep' | 'remove' {
  h.t += 1;
  if (h.state === 'warn' && h.t >= h.warnMs) { h.state = 'solid'; h.t = 0; }
  else if (h.state === 'solid' && h.t >= h.lifeMs) {
    h.state = 'crumble'; h.t = 0;
    for (const c of h.cells) c.on = false;
  }
  if (h.state === 'solid') for (const c of h.cells) {
    if (!c.on && !ctx.snakeOn(c.x, c.y)) {
      c.on = true;
      ctx.emit({ type: 'dust', x: c.x, y: c.y });
      if (!h.landed) { h.landed = true; ctx.emit({ type: 'landed', hazardType: h.family }); }
    }
    if (c.on) c.ageMs += 1;
  }
  return h.state === 'crumble' && h.t >= ctx.balance.hazard.crumbleMs ? 'remove' : 'keep';
}

export const timedSolidAt = (h: TimedHazard, x: number, y: number): boolean => h.cells.some(c => c.on && c.x === x && c.y === y);
export const timedHasCell = (h: TimedHazard, x: number, y: number): boolean => h.cells.some(c => c.x === x && c.y === y);
```

Note: the warn/solid durations in the test above assume `ageMs` counts the landing step (prototype `c.age += dt` in the same frame as `c.on = true`, L571).

- [ ] **Step 7: Implement the four families**

```ts
// src/core/hazards/rock.ts — MEC-004 falling rocks (spawnRock L427–439)
import type { HazardFamily, TimedHazard } from '../types';
import { rockPool } from './shapes';
import { makeTimed, timedHasCell, timedSolidAt, updateTimed } from './timed';

export const ROCK: HazardFamily<TimedHazard> = {
  key: 'rock', cause: 'rock', capClass: 'small', maxActiveKey: null, breakable: false,
  spawn(ctx, rng) {
    const b = ctx.balance, r = b.rock;
    const shape = r.shapes[rng.pick(rockPool(b, ctx.level))];       // picked once, before the tries (L429)
    for (let i = 0; i < r.tries; i++) {
      const ox = rng.int(b.board.cols), oy = rng.int(b.board.rows);  // not clamped: off-board cells fail cellFree
      const cells = shape.map(([dx, dy]) => ({ x: ox + dx, y: oy + dy }));
      if (cells.every(c => ctx.cellFree(c.x, c.y))) return makeTimed('rock', cells, r.warnMs, r.lifeMs + rng.next() * r.lifeRandMs);
    }
    return null;
  },
  update: updateTimed, solidAt: timedSolidAt, bfsWallAt: timedHasCell, reservedAt: timedHasCell,
};
```

```ts
// src/core/hazards/fence.ts — MEC-004 fences (spawnFence L464–477)
import type { HazardFamily, TimedHazard } from '../types';
import { fencePool, lineFence, transform } from './shapes';
import { makeTimed, timedHasCell, timedSolidAt, updateTimed } from './timed';

export const FENCE: HazardFamily<TimedHazard> = {
  key: 'fence', cause: 'fence', capClass: 'small', maxActiveKey: null, breakable: false,
  spawn(ctx, rng) {
    const b = ctx.balance, f = b.fence;
    const kind = rng.pick(fencePool(b, ctx.level));
    const shape = transform(kind === 'line' ? lineFence(b, ctx.level, rng) : f.shapes[kind], rng, f.mirrorChance);
    const w = Math.max(...shape.map(p => p[0])) + 1, h = Math.max(...shape.map(p => p[1])) + 1;
    for (let i = 0; i < f.tries; i++) {
      const ox = rng.int(b.board.cols - w + 1), oy = rng.int(b.board.rows - h + 1);
      const cells = shape.map(([x, y]) => ({ x: ox + x, y: oy + y }));
      if (cells.every(c => ctx.cellFree(c.x, c.y))) return makeTimed('fence', cells, f.warnMs, f.lifeMs + rng.next() * f.lifeRandMs, kind);
    }
    return null;
  },
  update: updateTimed, solidAt: timedSolidAt, bfsWallAt: timedHasCell, reservedAt: timedHasCell,
};
```

```ts
// src/core/hazards/maze.ts — MEC-004 hedge mazes (spawnMaze L498–506); the director sets the cooldown
import type { HazardFamily, TimedHazard } from '../types';
import { mazeCells } from './shapes';
import { makeTimed, timedHasCell, timedSolidAt, updateTimed } from './timed';

export const MAZE: HazardFamily<TimedHazard> = {
  key: 'maze', cause: 'maze', capClass: 'big', maxActiveKey: null, breakable: false,
  spawn(ctx, rng) {
    const m = ctx.balance.maze;
    const cells = mazeCells(rng.pick(m.layouts)).filter(c => ctx.cellFree(c.x, c.y));
    if (cells.length < m.minCells) return null;
    return makeTimed('maze', cells, m.warnMs, m.lifeMs + rng.next() * m.lifeRandMs);
  },
  update: updateTimed, solidAt: timedSolidAt, bfsWallAt: timedHasCell, reservedAt: timedHasCell,
};
```

```ts
// src/core/hazards/terrain.ts — MEC-004 rising ground (spawnTerrain L508–530, updateTerrains L578–597)
import type { Balance } from '../balance';
import type { HazardFamily, TerrainCell, TerrainHazard, TerrainVis } from '../types';

type Raw = { x: number; y: number; delay: number };

// MEC-004 wanted state of one cell at T.t, before the snake check
export function terrainWant(T: TerrainHazard, c: TerrainCell, b: Balance): TerrainVis {
  const tr = b.terrain;
  if (T.t >= T.lifeMs) return 'down';
  const ct = T.t - tr.startDelayMs - c.delay;
  if (ct < 0) return 'down';
  const l = ct % tr.periodMs, downMs = tr.periodMs - tr.upMs - tr.warnMs;
  return l < downMs ? 'down' : l < downMs + tr.warnMs ? 'warn' : 'up';
}

export const TERRAIN: HazardFamily<TerrainHazard> = {
  key: 'terrain', cause: 'ground', capClass: 'big', maxActiveKey: 'terrain.maxActive', breakable: false,
  spawn(ctx, rng) {
    const b = ctx.balance, tr = b.terrain, { cols, rows } = b.board;
    for (let i = 0; i < tr.tries; i++) {
      let cells: Raw[] = [];
      if (rng.chance(tr.waveChance)) {
        const horiz = rng.chance(tr.horizChance), len = tr.waveLenMin + rng.int(tr.waveLenRand);
        const ox = rng.int(horiz ? cols - len + 1 : cols - tr.waveWidth + 1);
        const oy = rng.int(horiz ? rows - tr.waveWidth + 1 : rows - len + 1);
        for (let a = 0; a < len; a++) for (let w = 0; w < tr.waveWidth; w++)
          cells.push({ x: horiz ? ox + a : ox + w, y: horiz ? oy + w : oy + a, delay: a * tr.waveDelayMs });
      } else {
        const n = tr.checkerSize, ox = rng.int(cols - n + 1), oy = rng.int(rows - n + 1);
        for (let a = 0; a < n; a++) for (let w = 0; w < n; w++)
          cells.push({ x: ox + a, y: oy + w, delay: ((a + w) % 2) * (tr.periodMs / 2) });
      }
      cells = cells.filter(c => ctx.cellFree(c.x, c.y, b.fairness.terrainNearHeadDist));
      if (cells.length >= tr.minCells)
        return { family: 'terrain', t: 0, lifeMs: tr.lifeMs + rng.next() * tr.lifeRandMs,
                 cells: cells.map(c => ({ ...c, up: false, vis: 'down' as const })) };
    }
    return null;
  },
  update(T, ctx) {
    T.t += 1;
    for (const c of T.cells) {
      let want = terrainWant(T, c, ctx.balance);
      if (want === 'up' && !c.up && ctx.snakeOn(c.x, c.y)) want = 'warn';   // wait for the snake to pass
      c.up = want === 'up';
      c.vis = want;
    }
    return T.t < T.lifeMs + ctx.balance.terrain.fadeOutMs ? 'keep' : 'remove';
  },
  solidAt: (T, x, y) => T.cells.some(c => c.up && c.x === x && c.y === y),
  bfsWallAt: () => false,                                             // L373: terrain is not a BFS wall
  reservedAt: (T, x, y) => T.cells.some(c => c.x === x && c.y === y),
};
```

- [ ] **Step 8: Implement `src/core/hazards/registry.ts`**

```ts
// src/core/hazards/registry.ts — hazard family registry (design §4.1). MEC-004
import type { HazardFamily, HazardInstance, FamilyKey, SimState, StepCtx, TerrainHazard, TimedHazard } from '../types';
import { FENCE } from './fence';
import { MAZE } from './maze';
import { ROCK } from './rock';
import { TERRAIN } from './terrain';

export const FAMILY: { rock: HazardFamily<TimedHazard>; fence: HazardFamily<TimedHazard>;
  maze: HazardFamily<TimedHazard>; terrain: HazardFamily<TerrainHazard> } = { rock: ROCK, fence: FENCE, maze: MAZE, terrain: TERRAIN };
// MEC-004 ordered registry: rock, fence, maze, terrain
export const FAMILIES = [ROCK, FENCE, MAZE, TERRAIN] as unknown as readonly HazardFamily<HazardInstance>[];

const fam = (k: FamilyKey) => FAMILY[k] as unknown as HazardFamily<HazardInstance>;
export const instancesOf = (s: SimState, k: FamilyKey): HazardInstance[] =>
  k === 'terrain' ? s.terrains : s.hazards.filter(h => h.family === k);

// MEC-004 first family (in FAMILIES order) with an instance answering the query at (x, y)
export function familyAt(s: SimState, x: number, y: number, q: 'solidAt' | 'bfsWallAt' | 'reservedAt'): FamilyKey | null {
  for (const f of FAMILIES) for (const h of instancesOf(s, f.key)) if (f[q](h, x, y)) return f.key;
  return null;
}

// MEC-004 update all hazards in spawn order, then all terrains; remove after each pass (L1000–1001, L575, L595)
export function stepHazards(s: SimState, ctx: StepCtx): void {
  const gone = new Set<HazardInstance>();   // transient, never stored
  for (const h of s.hazards) if (fam(h.family).update(h, ctx) === 'remove') gone.add(h);
  if (gone.size) s.hazards = s.hazards.filter(h => !gone.has(h));
  gone.clear();
  for (const T of s.terrains) if (FAMILY.terrain.update(T, ctx) === 'remove') gone.add(T);
  if (gone.size) s.terrains = s.terrains.filter(T => !gone.has(T));
}
```

Then replace the bodies in `src/core/cells.ts` (add `import { FAMILY, familyAt } from './hazards/registry';`):

```ts
export function cellSolidCause(s: SimState, x: number, y: number): CauseKey | null {
  if (rottenAt(s, x, y)) return 'rotten';
  const k = familyAt(s, x, y, 'solidAt');
  return k ? FAMILY[k].cause : null;
}
export function cellReserved(s: SimState, x: number, y: number): boolean {
  return snakeOn(s, x, y) || rottenAt(s, x, y) || familyAt(s, x, y, 'reservedAt') !== null
    || (s.mango !== null && at(s.mango, x, y));
}
export function cellBfsWall(s: SimState, x: number, y: number): boolean {
  for (let i = 0; i < s.snake.length - 1; i++) if (at(s.snake[i]!, x, y)) return true;
  return rottenAt(s, x, y) || familyAt(s, x, y, 'bfsWallAt') !== null;
}
```

(No import cycle: families import only `timed`/`shapes`/types; `cells.ts` → `registry.ts` → families.)

- [ ] **Step 9: Implement `src/core/hazards/director.ts`**

```ts
// src/core/hazards/director.ts — spawn timer, cap, weighted pick with retry (updateDirector L533–555). MEC-004
import type { Balance } from '../balance';
import { cellReserved } from '../cells';
import { inBounds, nearHead } from '../grid';
import { isUnlocked } from '../level';
import type { Rng } from '../rng';
import type { FamilyKey, SimState, SpawnCtx, TerrainHazard, TimedHazard } from '../types';
import { FAMILY } from './registry';

// MEC-004 prototype weighted pick: r = next() * total; walk while r > w[i]
export function pickWeighted(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((a, w) => a + w, 0);
  let r = rng.next() * total, i = 0;
  while (i < weights.length - 1 && r > weights[i]!) { r -= weights[i]!; i++; }
  return i;
}

export function spawnCtx(s: SimState, b: Balance): SpawnCtx {
  return {
    balance: b, level: s.level,
    cellFree: (x, y, d = b.fairness.nearHeadDist) =>
      inBounds(b.board.cols, b.board.rows, x, y) && !cellReserved(s, x, y)
      && !nearHead(s.snake[0]!, s.dir, x, y, d, b.fairness.frontLaneCells),
  };
}

// MEC-004 one 1 ms step of the director
export function updateDirector(s: SimState, b: Balance, rng: Rng): void {
  const d = b.director;
  s.mazeCooldownMs -= 1;
  s.spawnInMs -= 1;
  if (s.spawnInMs > 0) return;
  s.spawnInMs = Math.max(d.intervalMinMs, d.intervalBaseMs - s.level * d.intervalPerLevelMs);
  const cap = Math.min(d.capMax, d.capBase + Math.floor(s.level / d.capPerLevels));
  const options: FamilyKey[] = [];
  if (s.hazards.filter(h => FAMILY[h.family].capClass === 'small').length < cap) {
    options.push('rock');
    if (isUnlocked(b, s.level, 'fence')) options.push('fence');
  }
  const mazeActive = s.hazards.some(h => h.family === 'maze');
  const maxTerrains = s.level >= b.terrain.lateLevel ? b.terrain.maxActiveLate : b.terrain.maxActive;
  if (isUnlocked(b, s.level, 'terrain') && !mazeActive && s.terrains.length < maxTerrains) options.push('terrain');
  if (isUnlocked(b, s.level, 'maze') && s.mazeCooldownMs <= 0 && !mazeActive && !s.terrains.length) options.push('maze');
  const ctx = spawnCtx(s, b);
  while (options.length) {
    const i = pickWeighted(options.map(k => d.weights[k]), rng);
    const k = options[i]!;
    const inst = FAMILY[k].spawn(ctx, rng);
    if (inst) {
      if (k === 'terrain') s.terrains.push(inst as TerrainHazard); else s.hazards.push(inst as TimedHazard);
      if (k === 'maze') s.mazeCooldownMs = b.maze.cooldownMs;
      if (k !== 'rock') s.events.push({ type: 'hazardIncoming', family: k });
      return;
    }
    options.splice(i, 1);                      // didn't fit: try something else
  }
}
```

Note: the cap filter uses `capClass === 'small'` (rock, fence), which equals the prototype `type !== 'maze'` because `s.hazards` holds only rock/fence/maze.

- [ ] **Step 10: Wire the step order in `src/core/sim.ts`**

Add imports `import { updateDirector } from './hazards/director';`, `import { stepHazards } from './hazards/registry';`, `import { snakeOn } from './cells';`. `stepMs` becomes (prototype `frame()` L999–1004):

```ts
function stepMs(s: SimState, b: Balance, rng: Rng): void {
  s.acc += 1;
  updateDirector(s, b, rng);
  stepHazards(s, { balance: b, snakeOn: (x, y) => snakeOn(s, x, y), emit: e => { s.events.push(e); } });
  s.tickMs = tickMsFor(b, s.level);
  if (s.mango) { s.mango.leftMs -= 1; if (s.mango.leftMs <= 0) rotMango(s, b, rng); }
  if (s.status === 'playing' && s.acc >= s.tickMs) { s.acc -= s.tickMs; stepSnake(s, b, rng); }
}
```

`src/core/index.ts`: add `export { FAMILIES } from './hazards/registry';`.

- [ ] **Step 11: Run unit tests** — `npm test` → all PASS, including Tasks 2–4 (they use `spawnInMs: QUIET`). Confirm the boundary test now also scans `src/core/hazards/*.ts` (the `**` glob covers subfolders).

- [ ] **Step 12: Write the fuzz harness `tests/support/fuzz.ts`**

```ts
// tests/support/fuzz.ts — seeded invariant fuzz (design §9 item 2). No new dependency.
import type { Balance } from '../../src/core/balance';
import { cellReserved, snakeOn } from '../../src/core/cells';
import { nearHead } from '../../src/core/grid';
import { placeMango } from '../../src/core/mango';
import { rngFrom, seedRng } from '../../src/core/rng';
import { restoreSim, stateOf } from '../../src/core/sim';
import type { FamilyKey, Sim, SimState, Step } from '../../src/core/types';
import { buildState } from './state';

export interface FuzzReport { violations: string[]; steps: number; maxLevel: number; spawned: Record<FamilyKey, number> }
const DIRS: [Step, Step][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function snapHash(sim: Sim): string {          // FNV-1a over the snapshot JSON
  const str = JSON.stringify(sim.snapshot());
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}

/** Runs consecutive runs until simMs of sim time are played. Runs start at a seeded level 0…10 so late hazards are covered. */
export function fuzzSeed(b: Balance, seed: number, simMs: number): FuzzReport {
  const input = rngFrom(seedRng(seed ^ 0x9e3779b9));      // input RNG, separate from the Sim RNG
  const rep: FuzzReport = { violations: [], steps: 0, maxLevel: 0, spawned: { rock: 0, fence: 0, maze: 0, terrain: 0 } };
  const seen = new WeakSet<object>();
  let played = 0, run = 0;
  while (played < simMs) {
    const s0 = buildState(b, { seed: seed * 1000 + run, level: input.int(b.level.maxLevel + 1), spawnInMs: b.director.firstSpawnMs });
    placeMango(s0, b, rngFrom(s0.rng));
    const sim = restoreSim(b, s0), s = stateOf(sim);
    run++;
    while (s.status === 'playing' && played < simMs) {
      if (played % 16 === 0) steer(sim, s, b, input);
      const head = { ...s.snake[0]! }, dir = { ...s.dir };
      sim.advance(1); played++;
      checkSpawns(s, b, head, dir, seen, rep);
      const moved = s.snake[0]!.x !== head.x || s.snake[0]!.y !== head.y;
      if (moved) rep.steps++;
      if (moved || played % 16 === 0) checkState(s, rep, played);
      rep.maxLevel = Math.max(rep.maxLevel, s.level);
    }
    if (s.status === 'over') {                              // the snake never moves after over
      const before = JSON.stringify(sim.snapshot()); sim.advance(1000); sim.turn(0, 1);
      if (JSON.stringify(sim.snapshot()) !== before) rep.violations.push(`seed ${seed}: state changed after over`);
    }
  }
  return rep;
}

function steer(sim: Sim, s: SimState, b: Balance, input: ReturnType<typeof rngFrom>): void {
  // 70%: a safe direction toward the mango if any; else a random safe direction; else random
  const h = s.snake[0]!;
  const safe = DIRS.filter(([dx, dy]) => {
    const x = h.x + dx, y = h.y + dy;
    return x >= 0 && y >= 0 && x < b.board.cols && y < b.board.rows && !(dx === -s.dir.x && dy === -s.dir.y)
      && !snakeOn(s, x, y) && !cellReserved({ ...s, mango: null }, x, y);
  });
  const m = s.mango, toward = m ? safe.filter(([dx, dy]) => Math.abs(h.x + dx - m.x) + Math.abs(h.y + dy - m.y) < Math.abs(h.x - m.x) + Math.abs(h.y - m.y)) : [];
  const pool = toward.length && input.chance(0.7) ? toward : safe.length ? safe : DIRS;
  const [dx, dy] = input.pick(pool);
  sim.turn(dx, dy);
}

function checkSpawns(s: SimState, b: Balance, head: { x: number; y: number }, dir: SimState['dir'], seen: WeakSet<object>, rep: FuzzReport): void {
  for (const h of [...s.hazards, ...s.terrains]) {
    if (seen.has(h)) continue;
    seen.add(h); rep.spawned[h.family]++;
    const d = h.family === 'terrain' ? b.fairness.terrainNearHeadDist : b.fairness.nearHeadDist;
    for (const c of h.cells) if (nearHead(head, dir, c.x, c.y, d, b.fairness.frontLaneCells))
      rep.violations.push(`${h.family} spawned near the head at (${c.x},${c.y})`);
  }
}

function checkState(s: SimState, rep: FuzzReport, t: number): void {
  const m = s.mango;
  if (m && cellReserved({ ...s, mango: null }, m.x, m.y)) rep.violations.push(`t=${t}: mango on a reserved cell (${m.x},${m.y})`);
  for (const c of s.snake) {
    if (s.hazards.some(h => h.cells.some(k => k.on && k.x === c.x && k.y === c.y))
      || s.terrains.some(T => T.cells.some(k => k.up && k.x === c.x && k.y === c.y)))
      rep.violations.push(`t=${t}: solid cell under the snake at (${c.x},${c.y})`);
  }
}
```

Note: `seen` is a test-side `WeakSet` (allowed in tests); it relies on instance identity, which holds because the core mutates instances in place.

- [ ] **Step 13: Write the fuzz and determinism tests**

```ts
// tests/core/fuzz.test.ts
import { describe, expect, it } from 'vitest';
import { fuzzSeed } from '../support/fuzz';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const SEEDS = import.meta.env.MODE === 'fuzz' ? 200 : 50;

describe('MEC-004 fuzz invariants', () => {
  it(`MEC-004 fuzz: ${SEEDS} seeds × 120 s keep every invariant`, () => {
    const spawned = { rock: 0, fence: 0, maze: 0, terrain: 0 };
    let steps = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = fuzzSeed(b, seed, 120_000);
      expect(r.violations, `seed ${seed}`).toEqual([]);
      steps += r.steps;
      for (const k of Object.keys(spawned) as (keyof typeof spawned)[]) spawned[k] += r.spawned[k];
    }
    expect(steps).toBeGreaterThan(SEEDS * 500);                        // the harness really moved the snake
    expect(Object.values(spawned).every(n => n > 0)).toBe(true);       // every family was exercised
  }, 60_000);
});
```

```ts
// tests/core/determinism.test.ts
import { describe, expect, it } from 'vitest';
import { createSim, stateOf } from '../../src/core/sim';
import type { Sim } from '../../src/core/types';
import { loadBalance } from '../support/balance';
import { snapHash } from '../support/fuzz';

const b = loadBalance();
const TURNS: [number, -1 | 0 | 1, -1 | 0 | 1][] = [[300, 0, 1], [700, 1, 0], [1200, 0, -1], [1900, -1, 0], [2600, 0, 1], [4100, 1, 0]];
function play(sim: Sim, chunks: number[], until = 8000): void {
  let t = 0, i = 0, c = 0;
  while (t < until) {
    while (i < TURNS.length && TURNS[i]![0] === t) { sim.turn(TURNS[i]![1], TURNS[i]![2]); i++; }
    const next = Math.min(until, TURNS[i]?.[0] ?? until, t + chunks[c++ % chunks.length]!);
    sim.advance(next - t); t = next;
  }
}

describe('MEC-004 determinism', () => {
  it('MEC-004 same seed and inputs give the same snapshot hash for any advance split', () => {
    const a = createSim(b, 7), c = createSim(b, 7), d = createSim(b, 7);
    play(a, [1]); play(c, [16]); play(d, [7, 100, 33]);
    expect(snapHash(c)).toBe(snapHash(a)); expect(snapHash(d)).toBe(snapHash(a));
  });
  it('MEC-004 clone evolves identically and independently', () => {
    const a = createSim(b, 11); a.advance(3000);
    const before = snapHash(a), c = a.clone();
    c.turn(0, 1); c.advance(2000);
    expect(snapHash(a)).toBe(before);
    a.turn(0, 1); a.advance(2000);
    expect(snapHash(c)).toBe(snapHash(a));
  });
  it('MEC-004 SimState is plain data (JSON round trip is lossless)', () => {
    const a = createSim(b, 5); a.advance(9000);
    const s = stateOf(a);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
```

Remaining: `MEC-004 different seeds diverge` (seeds 1 and 2 after 6000 ms → different hashes).

- [ ] **Step 14: Run everything** — `npm test` (target: whole run < 10 s; if the fuzz takes longer, report the time before tuning anything); `npm run test:fuzz` (200 seeds, PASS); `npm run typecheck`.

- [ ] **Step 15: Docs** — CODEMAP `src/core/` row adds `hazards/` (registry, director, families) under MEC-004; Test setup row mentions `npm run test:fuzz`. CHANGELOG: `- feat: hazard registry with rocks, fences, mazes, rising ground and the director; invariant fuzz and determinism tests (P0 PR 5).` STATUS updated.

- [ ] **Step 16: Commit**

```bash
git add src/core/ tests/ docs/CODEMAP.md docs/STATUS.md CHANGELOG.md
git commit -m "feat(core): hazard families, registry and director with fuzz and determinism tests"
```

---

### Task 6: Save skeleton (`src/meta`)

**Branch:** `feat/p0-save` · **Spec:** design §8, §9 item 5. Requirement ID: `GDD-8.4`.

**Files:**
- Create: `src/meta/storage.ts`, `src/meta/save.ts`, `src/meta/index.ts`; Test: `tests/meta/save.test.ts`
- Modify: `docs/CODEMAP.md`, `CHANGELOG.md`, `docs/STATUS.md`

**Interfaces:**
- Produces: `interface KeyValueStore { get(k: string): string | null; set(k: string, v: string): void }`; `memoryStore(init?: Record<string, string>): KeyValueStore & { dump(): Record<string, string> }`; `SAVE_KEY = 'mango-snake.save'`; `SAVE_VERSION = 1`; `interface SaveData { bestScore: number; settings: { sound: boolean } }`; `defaultSave(): SaveData`; `type Migration = (data: unknown) => unknown`; `load(store: KeyValueStore, migrations?: Record<number, Migration>): SaveData`; `save(store: KeyValueStore, data: SaveData): boolean`.

- [ ] **Step 1: Branch** — `git switch master; git pull; git switch -c feat/p0-save`

- [ ] **Step 2: Write the failing tests**

```ts
// tests/meta/save.test.ts
import { describe, expect, it } from 'vitest';
import { defaultSave, load, memoryStore, save, SAVE_KEY } from '../../src/meta';
import type { KeyValueStore } from '../../src/meta';

describe('GDD-8.4 save', () => {
  it('GDD-8.4 round trip writes the versioned envelope', () => {
    const st = memoryStore();
    expect(save(st, { bestScore: 42, settings: { sound: false } })).toBe(true);
    expect(JSON.parse(st.dump()[SAVE_KEY]!)).toEqual({ version: 1, data: { bestScore: 42, settings: { sound: false } } });
    expect(load(st)).toEqual({ bestScore: 42, settings: { sound: false } });
  });
  it('GDD-8.4 missing, corrupt, wrong shape and future version give defaults', () => {
    expect(load(memoryStore())).toEqual(defaultSave());
    expect(load(memoryStore({ [SAVE_KEY]: '{not json' }))).toEqual(defaultSave());
    expect(load(memoryStore({ [SAVE_KEY]: '{"version":1,"data":{"bestScore":"9"}}' }))).toEqual(defaultSave());
    expect(load(memoryStore({ [SAVE_KEY]: '{"version":2,"data":{"bestScore":9,"settings":{"sound":true}}}' }))).toEqual(defaultSave());
  });
  it('GDD-8.4 older versions run migrations in order up to the current version', () => {
    const order: number[] = [];
    const st = memoryStore({ [SAVE_KEY]: '{"version":0,"data":{"best":7}}' });
    const out = load(st, { 0: d => { order.push(0); return { bestScore: (d as { best: number }).best, settings: { sound: true } }; } });
    expect(order).toEqual([0]);
    expect(out).toEqual({ bestScore: 7, settings: { sound: true } });
  });
  it('GDD-8.4 storage errors are swallowed', () => {
    const broken: KeyValueStore = { get: () => { throw new Error('denied'); }, set: () => { throw new Error('quota'); } };
    expect(load(broken)).toEqual(defaultSave());
    expect(save(broken, defaultSave())).toBe(false);
  });
});
```

Remaining: `GDD-8.4 a missing migration step gives defaults` (version 0, no migrations → defaults); `GDD-8.4 negative or fractional bestScore is wrong shape` (→ defaults); `GDD-8.4 prototype keys are ignored` (store with `mango-snake-hard2-best = '50'` and `mango-snake-sound = 'off'` → defaults).

- [ ] **Step 3: Run** — `npm test` → FAIL (`src/meta` missing).

- [ ] **Step 4: Implement**

```ts
// src/meta/storage.ts — key/value store port; the browser adapter lives in src/game/platform/localStore.ts. GDD-8.4
export interface KeyValueStore { get(k: string): string | null; set(k: string, v: string): void }

export function memoryStore(init: Record<string, string> = {}): KeyValueStore & { dump(): Record<string, string> } {
  const m: Record<string, string> = { ...init };
  return { get: k => (k in m ? m[k]! : null), set: (k, v) => { m[k] = v; }, dump: () => ({ ...m }) };
}
```

```ts
// src/meta/save.ts — versioned save envelope (design §8). GDD-8.4
import type { KeyValueStore } from './storage';

export const SAVE_KEY = 'mango-snake.save';
export const SAVE_VERSION = 1;
export interface SaveData { bestScore: number; settings: { sound: boolean } }
export type Migration = (data: unknown) => unknown;
/** migrations[n] turns version n data into version n + 1 data. Empty in P0. */
export const MIGRATIONS: Record<number, Migration> = {};

export const defaultSave = (): SaveData => ({ bestScore: 0, settings: { sound: true } });

function isSaveData(d: unknown): d is SaveData {
  if (typeof d !== 'object' || d === null) return false;
  const o = d as { bestScore?: unknown; settings?: { sound?: unknown } };
  return Number.isInteger(o.bestScore) && (o.bestScore as number) >= 0
    && typeof o.settings === 'object' && o.settings !== null && typeof o.settings.sound === 'boolean';
}

// GDD-8.4 load: never throws; unknown future versions and bad data give defaults
export function load(store: KeyValueStore, migrations: Record<number, Migration> = MIGRATIONS): SaveData {
  try {
    const raw = store.get(SAVE_KEY);
    if (raw === null) return defaultSave();
    const env = JSON.parse(raw) as { version?: unknown; data?: unknown };
    if (!Number.isInteger(env.version) || (env.version as number) > SAVE_VERSION) return defaultSave();
    let v = env.version as number, data = env.data;
    while (v < SAVE_VERSION) {
      const m = migrations[v];
      if (!m) return defaultSave();
      data = m(data); v++;
    }
    return isSaveData(data) ? { bestScore: data.bestScore, settings: { sound: data.settings.sound } } : defaultSave();
  } catch { return defaultSave(); }
}

// GDD-8.4 save: full envelope; storage errors are swallowed (prototype saveBest L232)
export function save(store: KeyValueStore, data: SaveData): boolean {
  try { store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, data })); return true; } catch { return false; }
}
```

```ts
// src/meta/index.ts — the only public entry of src/meta
export { memoryStore } from './storage';
export type { KeyValueStore } from './storage';
export { defaultSave, load, save, SAVE_KEY, SAVE_VERSION } from './save';
export type { Migration, SaveData } from './save';
```

- [ ] **Step 5: Run** — `npm test`, `npm run typecheck` → PASS (boundary test scans `src/meta/**`).

- [ ] **Step 6: Docs** — CODEMAP: add row `| src/meta/ | Versioned save envelope + KeyValueStore port | index.ts, save.ts | — | GDD-8.4 | tests/meta/ |`; Entry points: "Save / load" → `src/meta/save.ts`. CHANGELOG: `- feat: versioned save skeleton with migrations and in-memory store (P0 PR 6).` STATUS updated.

- [ ] **Step 7: Commit**

```bash
git add src/meta/ tests/meta/ docs/CODEMAP.md docs/STATUS.md CHANGELOG.md
git commit -m "feat(meta): versioned save envelope with migrations"
```

---

### Task 7: Phaser board rendering, frame clock, run flow and input

**Branch:** `feat/p0-board-input` · **Spec:** design §4 (game-layer clock, seed logging), §7.1 (flow rules), §7.2, §7.3 (keyboard, swipe), §9 items 6–7.

**Files:**
- Create: `src/game/layout.ts`, `src/game/flow/clock.ts`, `src/game/flow/runFlow.ts`, `src/game/input/swipeMath.ts`, `src/game/input/keyboard.ts`, `src/game/input/swipe.ts`, `src/game/scenes/BootScene.ts`, `src/game/scenes/GameScene.ts`, `src/game/render/palette.ts`, `board.ts`, `hazards.ts`, `mango.ts`, `snake.ts`, `effects.ts`
- Test: `tests/game/clock.test.ts`, `tests/game/runFlow.test.ts`, `tests/game/swipeMath.test.ts`
- Modify: `src/game/main.ts` (rewrite), `tests/boundary.test.ts` (scan pure game files), `docs/CODEMAP.md`, `CHANGELOG.md`, `docs/STATUS.md`

**Interfaces:**
- Consumes: `createSim`, `parseBalance`, `Balance`, `Sim`, `SimSnapshot`, `SimEvent` (from `src/core/index.ts` only).
- Produces:
  - `clock.ts`: `interface FrameClock { carry: number }`; `createClock(): FrameClock`; `clockStep(c: FrameClock, deltaMs: number, maxMs: number): number` (integer ms for `advance`).
  - `runFlow.ts`: `type FlowStatus = 'ready' | 'countdown' | 'playing' | 'paused' | 'over'`; `interface FlowState { status: FlowStatus; countLeftMs: number; lastCount: number }`; `type FlowEffect = { type: 'newRun' } | { type: 'tick'; n: number } | { type: 'go' } | { type: 'showPaused' } | { type: 'hideOverlay' }`; `createFlow(): FlowState`; `flowStart(f, b)`, `flowPause(f)`, `flowResume(f, b)`, `flowTogglePause(f, b)`, `flowKey(f, b, code: 'Space' | 'KeyP' | 'Escape')`, `flowTurn(f, b): { forward: boolean; effects: FlowEffect[] }`, `flowTick(f, b, dtMs)`, `flowOver(f)` — all return `FlowEffect[]` unless noted; `b` is `Balance`.
  - `swipeMath.ts`: `swipeThreshold(boardCssPx: number, minPx: number, factor: number): number`; `swipeDir(dx: number, dy: number, th: number): [Step, Step] | null`.
  - `layout.ts`: `WIDTH = 540`, `HEIGHT = 960`, `BOARD: { x: number; y: number; size: number }`, `HEADER`, `LEVEL_BAR`, `DPAD` rectangles.
  - `GameScene` public: `startRun(): void` (new seed, new Sim), `turn(dx, dy): void`, `flow: FlowState`, `snapshot(): SimSnapshot | null`, and Phaser event `'sim-events'` with `SimEvent[]` each frame (consumed by `HudScene` in Task 8).

- [ ] **Step 1: Branch** — `git switch master; git pull; git switch -c feat/p0-board-input`

- [ ] **Step 2: Write the failing pure tests**

```ts
// tests/game/clock.test.ts
import { describe, expect, it } from 'vitest';
import { clockStep, createClock } from '../../src/game/flow/clock';

describe('GDD-13 frame clock', () => {
  it('GDD-13 clock clamps the frame delta to 100 ms (L989)', () => {
    expect(clockStep(createClock(), 5000, 100)).toBe(100);
  });
  it('GDD-13 clock carries fractions so total ms are exact', () => {
    const c = createClock();
    const out = [16.7, 16.7, 16.6].map(d => clockStep(c, d, 100));
    expect(out).toEqual([16, 17, 17]);
    expect(c.carry).toBeCloseTo(0, 9);
  });
  it('GDD-13 clock ignores negative deltas', () => { expect(clockStep(createClock(), -5, 100)).toBe(0); });
});
```

```ts
// tests/game/runFlow.test.ts
import { describe, expect, it } from 'vitest';
import { createFlow, flowKey, flowPause, flowResume, flowStart, flowTick, flowTurn, flowOver } from '../../src/game/flow/runFlow';
import { loadBalance } from '../support/balance';

const b = loadBalance();
describe('GDD-13 run flow (L651–700, L721–729, L988–994)', () => {
  it('GDD-13 start from ready: new run, overlay hidden, countdown 1500', () => {
    const f = createFlow();
    expect(flowStart(f, b)).toEqual([{ type: 'newRun' }, { type: 'hideOverlay' }]);
    expect(f).toEqual({ status: 'countdown', countLeftMs: 1500, lastCount: 0 });
  });
  it('GDD-13 countdown ticks 3, 2, 1 then go', () => {
    const f = createFlow(); flowStart(f, b);
    expect(flowTick(f, b, 16)).toEqual([{ type: 'tick', n: 3 }]);
    expect(flowTick(f, b, 500)).toEqual([{ type: 'tick', n: 2 }]);
    expect(flowTick(f, b, 500)).toEqual([{ type: 'tick', n: 1 }]);
    expect(flowTick(f, b, 484)).toEqual([{ type: 'go' }]);
    expect(f.status).toBe('playing');
  });
  it('GDD-13 a turn in ready starts a run and is forwarded; in paused it is dropped', () => {
    const f = createFlow();
    expect(flowTurn(f, b)).toEqual({ forward: true, effects: [{ type: 'newRun' }, { type: 'hideOverlay' }] });
    flowPause(f);
    expect(flowTurn(f, b)).toEqual({ forward: false, effects: [] });
  });
  it('GDD-13 keys: P/Esc/Space pause and resume; only Space starts from ready/over', () => {
    const f = createFlow();
    expect(flowKey(f, b, 'KeyP')).toEqual([]); expect(f.status).toBe('ready');
    expect(flowKey(f, b, 'Space')[0]).toEqual({ type: 'newRun' });
    expect(flowKey(f, b, 'Escape')).toEqual([{ type: 'showPaused' }]); expect(f.status).toBe('paused');
    expect(flowKey(f, b, 'KeyP')).toEqual([{ type: 'hideOverlay' }]); expect(f.status).toBe('countdown');
    flowOver(f); expect(flowKey(f, b, 'Escape')).toEqual([]);
  });
});
```

Remaining: `GDD-13 resume runs a new countdown` (`countLeftMs` 1500, `lastCount` 0); `GDD-13 pause is ignored in ready and over`; `GDD-13 flowTick does nothing outside countdown`; `GDD-13 a turn in over starts a new run`.

```ts
// tests/game/swipeMath.test.ts
import { describe, expect, it } from 'vitest';
import { swipeDir, swipeThreshold } from '../../src/game/input/swipeMath';

describe('GDD-13 swipe math (L750–757)', () => {
  it('GDD-13 threshold is max(18, boardCssPx * 0.05)', () => {
    expect(swipeThreshold(300, 18, 0.05)).toBe(18);
    expect(swipeThreshold(500, 18, 0.05)).toBe(25);
  });
  it('GDD-13 below the threshold on both axes gives null', () => { expect(swipeDir(17, -17, 18)).toBeNull(); });
  it('GDD-13 larger axis wins; a tie goes vertical', () => {
    expect(swipeDir(30, 10, 18)).toEqual([1, 0]);
    expect(swipeDir(-5, -20, 18)).toEqual([0, -1]);
    expect(swipeDir(20, -20, 18)).toEqual([0, -1]);
  });
});
```

- [ ] **Step 3: Run** — `npm test` → FAIL (modules missing).

- [ ] **Step 4: Implement the pure helpers**

```ts
// src/game/flow/clock.ts — frame delta clamp + fractional carry → integer ms (design §4)
export interface FrameClock { carry: number }
export const createClock = (): FrameClock => ({ carry: 0 });
export function clockStep(c: FrameClock, deltaMs: number, maxMs: number): number {
  c.carry += Math.min(Math.max(0, deltaMs), maxMs);
  const ms = Math.floor(c.carry);
  c.carry -= ms;
  return ms;
}
```

```ts
// src/game/flow/runFlow.ts — pure run state machine (design §7.1; prototype start/pause/resume L651–675, keys L721–729)
import type { Balance } from '../../core';

export type FlowStatus = 'ready' | 'countdown' | 'playing' | 'paused' | 'over';
export interface FlowState { status: FlowStatus; countLeftMs: number; lastCount: number }
export type FlowEffect =
  | { type: 'newRun' } | { type: 'tick'; n: number } | { type: 'go' } | { type: 'showPaused' } | { type: 'hideOverlay' };

export const createFlow = (): FlowState => ({ status: 'ready', countLeftMs: 0, lastCount: 0 });
const countdown = (f: FlowState, b: Balance): void => { f.status = 'countdown'; f.countLeftMs = b.flow.countdownMs; f.lastCount = 0; };

export function flowStart(f: FlowState, b: Balance): FlowEffect[] {
  const fx: FlowEffect[] = f.status === 'ready' || f.status === 'over' ? [{ type: 'newRun' }] : [];
  countdown(f, b);
  fx.push({ type: 'hideOverlay' });
  return fx;
}
export function flowPause(f: FlowState): FlowEffect[] {
  if (f.status !== 'playing' && f.status !== 'countdown') return [];
  f.status = 'paused';
  return [{ type: 'showPaused' }];
}
export function flowResume(f: FlowState, b: Balance): FlowEffect[] {
  if (f.status !== 'paused') return [];
  countdown(f, b);
  return [{ type: 'hideOverlay' }];
}
export const flowTogglePause = (f: FlowState, b: Balance): FlowEffect[] => (f.status === 'paused' ? flowResume(f, b) : flowPause(f));
export function flowKey(f: FlowState, b: Balance, code: 'Space' | 'KeyP' | 'Escape'): FlowEffect[] {
  if (f.status === 'playing' || f.status === 'countdown') return flowPause(f);
  if (f.status === 'paused') return flowResume(f, b);
  return code === 'Space' ? flowStart(f, b) : [];
}
export function flowTurn(f: FlowState, b: Balance): { forward: boolean; effects: FlowEffect[] } {
  const effects = f.status === 'ready' || f.status === 'over' ? flowStart(f, b) : [];
  return { forward: f.status === 'playing' || f.status === 'countdown', effects };
}
export function flowTick(f: FlowState, b: Balance, dtMs: number): FlowEffect[] {
  if (f.status !== 'countdown') return [];
  f.countLeftMs -= dtMs;
  const fx: FlowEffect[] = [];
  const n = Math.ceil(f.countLeftMs / (b.flow.countdownMs / b.flow.countdownDigits));
  if (n !== f.lastCount && n > 0) { f.lastCount = n; fx.push({ type: 'tick', n }); }
  if (f.countLeftMs <= 0) { f.status = 'playing'; fx.push({ type: 'go' }); }
  return fx;
}
export const flowOver = (f: FlowState): void => { f.status = 'over'; };
```

```ts
// src/game/input/swipeMath.ts — CSS-pixel swipe rules (design §7.3, L750–757)
import type { Step } from '../../core';
export const swipeThreshold = (boardCssPx: number, minPx: number, factor: number): number => Math.max(minPx, boardCssPx * factor);
export function swipeDir(dx: number, dy: number, th: number): [Step, Step] | null {
  if (Math.abs(dx) < th && Math.abs(dy) < th) return null;
  return Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx) as Step, 0] : [0, Math.sign(dy) as Step];
}
```

Boundary: extend `pureSources` in `tests/boundary.test.ts` with `'../src/game/flow/**/*.ts'` and `'../src/game/input/swipeMath.ts'` (they must not import `phaser` or use browser APIs). Type-only imports from `../../core` are allowed (the index).

- [ ] **Step 5: Run** — `npm test` → PASS.

- [ ] **Step 6: Layout and palette**

`src/game/layout.ts`: `WIDTH = 540`, `HEIGHT = 960`; header band y 0–88 (title left, score/best center, sound/pause right); level bar y 96–140; `BOARD = { x: 18, y: 152, size: 504 }` (17 × 17 cells of 504/17 px); D-pad area y 680–940 centered. Export a `cellPx = BOARD.size / cols` helper taking `Balance`.
`src/game/render/palette.ts`: `type Palette = Record<'bg' | 'boardA' | 'boardB' | 'snake' | 'belly' | 'food' | 'leaf' | 'rock' | 'rockHi' | 'danger' | 'warn' | 'gold' | 'wood' | 'woodHi' | 'hedge' | 'hedgeHi' | 'earth' | 'earthSide' | 'ink' | 'panel', number>`; `LIGHT` and `DARK` copied value by value from the prototype CSS tokens (light L11–20, dark L22–34, keys `--board-a` … as listed in `COLOR_KEYS` L196); `currentPalette(): Palette` reads `window.matchMedia('(prefers-color-scheme: dark)')`; `reduceMotion(): boolean` reads `(prefers-reduced-motion: reduce)` once at boot (L176).

- [ ] **Step 7: Render helpers (one file per layer; each exports pure-ish draw functions taking a `Phaser.GameObjects.Graphics`, the snapshot part, `cellPx`, the palette and the time)**

Port the prototype `render()` (L850–985) and helpers (L804–849) draw call by draw call, using `Graphics` primitives (`fillRoundedRect`, `fillCircle`, `strokePoints`, `lineStyle`, `setAlpha`):
- `board.ts`: `buildBoardTexture(scene, b, palette): string` — checkerboard drawn once into a `RenderTexture` and saved with `saveTexture('board')` (L208–216); rebuilt when the color scheme changes (L202).
- `hazards.ts`: `drawTerrains` (fade in over `ui.terrainFadeInMs`, fade out over `terrain.fadeOutMs`, `warn` via `drawWarn` with orange, L854–870), `drawHazards` (warn blink speeding up with `t / warnMs`, red, L836–843, L878–890; solid flicker in the last `ui.hazardFlickerMs`, L879; crumble shrink over `hazard.crumbleMs`), `drawRock` (L808–814), `drawFence` (rails toward 4-neighbors of the same hazard, L815–826), `drawHedge` (L827–835). No blink, jitter or flicker when `reduceMotion`.
- `mango.ts`: mango body + leaf, golden color, rot ring = remaining `leftMs / totalMs` arc, throbbing below 30 % (skip throb with reduced motion); rotten rocks drawn as rocks.
- `snake.ts`: one thick rounded path from the interpolated head (`lerp(headFrom, snake[0], tickAlpha)`) through the body to the interpolated tail (`lerp(tailFrom, last, tickAlpha)`), belly stroke, head circle with gulp scale (L932), eyes looking along `dir`, closed when `status === 'over'` and `outcome.won === false`.
- `effects.ts`: `Effects` class holding particles (cap 500, L278–288; `Math.random` allowed here only), "+N" floats (750 ms, L289–291), `gulp` (decay /180), `deathFlash` (/600), `levelFlash` (/800) as in `updateEffects` L293–301; `burst(gx, gy, color, n, speed, life)` is a no-op with reduced motion; `reset()` clears all (L642).

Each draw helper stays under ~300 lines; split if needed. No gameplay decision is made in `render/`.

- [ ] **Step 8: `BootScene` and `GameScene`**

```ts
// src/game/scenes/BootScene.ts — parse balance, then start Game (and Hud from Task 8)
import Phaser from 'phaser';
import json from '../../../config/balance.json';
import { parseBalance } from '../../core';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create(): void {
    const balance = parseBalance(structuredClone(json));   // throws a readable error on a bad config
    this.registry.set('balance', balance);
    this.scene.start('Game');
  }
}
```

`GameScene` (`src/game/scenes/GameScene.ts`), outline:
- `create()`: read `balance`; build the board texture; create one `Graphics` per layer (terrain, hazards, mango, snake, effects) inside a `Container` at `BOARD.x, BOARD.y` (the container is what shakes); `this.flow = createFlow()`; `this.clock = createClock()`; create a first Sim for the ready screen (`createSim(b, seed)`) so the board shows the start snake and mango as in the prototype (L1016 `reset()` before the first frame); wire `keyboard.ts` and `swipe.ts`.
- `startRun()`: `seed = crypto.getRandomValues(new Uint32Array(1))[0]!`; `console.info('[mango-snake] run seed', seed)`; `this.sim = createSim(b, seed)`; `effects.reset()`; `this.clock = createClock()`.
- `turn(dx, dy)`: `const r = flowTurn(this.flow, b); this.apply(r.effects); if (r.forward) this.sim.turn(dx, dy);` (L698–700). `apply` runs `newRun` → `startRun()`; `tick`/`go`/`showPaused`/`hideOverlay` are re-emitted as scene events for the HUD (`this.events.emit('flow', effect)`).
- `update(_, deltaMs)`: if countdown → `apply(flowTick(flow, b, min(deltaMs, maxFrameDeltaMs)))`; else if playing → `ms = clockStep(clock, deltaMs, b.flow.maxFrameDeltaMs)`, `sim.advance(ms)`, `events = sim.drainEvents()`, handle board effects (`ate` → burst + float + gulp; `rotted` → rock burst; `dust` → small burst; `levelUp` → levelFlash; `died` → death flash, head burst, camera shake unless `reduceMotion`), then `this.events.emit('sim-events', events)`; if the snapshot status became `over` → `flowOver(flow)` and `this.events.emit('run-over', snapshot)`. Always: effects update with the clamped delta, then draw all layers from `sim.snapshot()`.
- Screen shake: tween the board container x/y with the offsets of the prototype `@keyframes shake` (L76) over 400 ms; skipped with reduced motion.

- [ ] **Step 9: Input**

- `keyboard.ts`: `bindKeyboard(scene: GameScene)`: on `keydown`, arrows/WASD → `scene.turn` (L716–720 `KEYS`), `preventDefault`; `Space`, `KeyP`, `Escape` → `scene.flowKey(code)` (Task 8 also routes `KeyM`). In Task 7 the Space-on-focused-button guard (L725) does not apply (Phaser buttons take no DOM focus).
- `swipe.ts`: `bindSwipe(scene, boardZone: Phaser.GameObjects.Zone)`: start on `pointerdown` over the board zone only (the zone excludes the overlay button in Task 8, L747), store `pointer.event.clientX/clientY`; on `pointermove` compute deltas in CSS px, `th = swipeThreshold(BOARD.size / scene.scale.displayScale.x, b.ui.swipeMinPx, b.ui.swipeBoardFactor)`, `swipeDir` → `scene.turn`, then re-anchor to the current pointer after each attempted turn; clear on `pointerup` / `pointerupoutside` / pointer cancel (`game.canvas` `pointercancel` listener).

- [ ] **Step 10: Rewrite `src/game/main.ts`**

Scale `FIT`, `CENTER_BOTH`, `parent: 'game'`, `WIDTH × HEIGHT` from `layout.ts`, `backgroundColor` from the palette `bg`, `scene: [BootScene, GameScene]` (Task 8 adds `HudScene`), `input: { activePointers: 2 }`, `render: { antialias: true }`. No physics config in P0.

- [ ] **Step 11: Verify** — `npm test`; `npm run typecheck`; `npm run build`; `npm run dev`: the board, snake, mango and hazards render; in this task a temporary key handler in `GameScene` starts the run on Space/arrow (it is the real `flowKey`/`flowTurn` path; the HUD comes in Task 8). Play to level 7 with the debug-free build: no console errors except the seed `console.info`. Check `prefers-reduced-motion` in DevTools rendering emulation (no shake, particles, blink).

- [ ] **Step 12: Docs** — CODEMAP `src/game/` row: key files `main.ts, scenes/GameScene.ts, flow/runFlow.ts`; Entry points: "Main game loop (game layer)" → `GameScene.update`; "Input" → `src/game/input/`. CHANGELOG: `- feat: Phaser greybox board rendering, frame clock, run flow state machine, keyboard and swipe input (P0 PR 7).` STATUS updated.

- [ ] **Step 13: Commit**

```bash
git add src/game/ tests/ docs/CODEMAP.md docs/STATUS.md CHANGELOG.md
git commit -m "feat(game): greybox board rendering, frame clock, run flow and keyboard/swipe input"
```

---

### Task 8: HUD, overlays, D-pad, audio, save wiring

**Branch:** `feat/p0-hud-flow` · **Spec:** design §7.1 (all screens and texts), §7.3 (D-pad, audio, haptics), §7.5 (strings), §8 (save use).

**Files:**
- Create: `src/game/scenes/HudScene.ts`, `src/game/input/dpad.ts`, `src/game/audio/synth.ts`, `src/game/platform/localStore.ts`, `src/game/text.ts`; Test: `tests/game/text.test.ts`
- Modify: `src/game/scenes/BootScene.ts` (load save, start Hud), `src/game/scenes/GameScene.ts` (forward events), `src/game/input/keyboard.ts` (`KeyM`), `src/game/main.ts` (scene list), `tests/boundary.test.ts` (add `text.ts`), `docs/CODEMAP.md`, `CHANGELOG.md`, `docs/STATUS.md`

**Interfaces:**
- Consumes: `FlowEffect`, `FlowState`, `flowTogglePause`, `flowStart`, `flowResume` (Task 7); `load`, `save`, `KeyValueStore`, `SaveData` (Task 6); `SimEvent`, `SimSnapshot`, `CauseKey`, `UnlockKey` (core index).
- Produces:
  - `text.ts`: `TEXT` (all fixed strings of design §7.5), `CAUSE_TEXT: Record<CauseKey, string>`, `levelLabel(level)`, `progressLabel(progress, need, level, maxLevel)`, `levelBanner(level, unlocked?)`, `incomingBanner(family: UnlockKey)`, `deathMessage(won, cause, score, level)`, `bestLine(kind: 'start' | 'over', best, newBest, score)`.
  - `synth.ts`: `createSynth(): Synth` with `unlock()`, `setOn(on)`, `play(name: SfxName)`, `buzz(pattern: number | number[])`; `SfxName = 'eat' | 'golden' | 'level' | 'land' | 'rot' | 'tick' | 'go' | 'die'`.
  - `localStore.ts`: `localStore(): KeyValueStore` (try/catch on every access).
  - `dpad.ts`: `createDpad(scene, rect, onTurn): { setHeading(d: Dir): void }`.

- [ ] **Step 1: Branch** — `git switch master; git pull; git switch -c feat/p0-hud-flow`

- [ ] **Step 2: Write the failing text tests**

```ts
// tests/game/text.test.ts
import { describe, expect, it } from 'vitest';
import { bestLine, CAUSE_TEXT, deathMessage, incomingBanner, levelBanner, progressLabel, TEXT } from '../../src/game/text';

describe('GDD-13 strings verbatim from the prototype (design §7.5)', () => {
  it('GDD-13 level banners (L605)', () => {
    expect(levelBanner(2, 'fence')).toBe('Level 3: fences unlocked');
    expect(levelBanner(4, 'terrain')).toBe('Level 5: rising ground unlocked');
    expect(levelBanner(6, 'maze')).toBe('Level 7: hedge mazes unlocked');
    expect(levelBanner(1)).toBe('Level 2: a bit faster');
  });
  it('GDD-13 hazard banners', () => {
    expect([incomingBanner('fence'), incomingBanner('maze'), incomingBanner('terrain')])
      .toEqual(['Fence incoming', 'Maze incoming', 'The ground is shaking']);
  });
  it('GDD-13 death message and best lines (L689–694, L1017)', () => {
    expect(deathMessage(false, 'fence', 12, 3)).toBe('You ran into a fence. Score 12, level 4.');
    expect(deathMessage(true, undefined, 280, 10)).toBe('No room left for mangoes. Score 280, level 11.');
    expect(bestLine('over', 12, true, 12)).toBe('New best score!');
    expect(bestLine('over', 0, true, 0)).toBe('');
    expect(bestLine('over', 30, false, 12)).toBe('Best score 30');
    expect(bestLine('start', 0, false, 0)).toBe('');
  });
  it('GDD-13 every cause has its text', () => {
    expect(CAUSE_TEXT).toEqual({
      wall: 'You hit the edge of the board.', self: 'You bit your own tail.',
      rotten: 'You hit a rock left by a rotten mango.', rock: 'A falling rock got you.',
      fence: 'You ran into a fence.', maze: 'You ran into a hedge.', ground: 'The ground rose in front of you.',
    });
  });
});
```

Remaining: `GDD-13 level bar labels` (`progressLabel(3, 6, 2, 10)` → `'3/6 mangoes'`, at level 10 → `'Max level'`; `levelLabel(0)` → `'Level 1'`); `GDD-13 fixed texts` (pin `TEXT.title` `'Mango Snake: Hard'`, `TEXT.start`, `TEXT.paused`, `TEXT.pausedText`, buttons, legend, `TEXT.over`, `TEXT.won` exactly as design §7.5).

- [ ] **Step 3: Run** — `npm test` → FAIL.

- [ ] **Step 4: Implement `src/game/text.ts`** (strings copied verbatim from design §7.5; pure, no Phaser import, added to the boundary scan). `bestLine('over', best, newBest, score)` = `newBest && score > 0 ? 'New best score!' : best > 0 ? 'Best score ' + best : ''` (L693); `bestLine('start', best)` = `best > 0 ? 'Best score ' + best : ''` (L1017). `deathMessage` = `` `${won ? TEXT.wonWhy : CAUSE_TEXT[cause!] ?? ''} Score ${score}, level ${level + 1}.` `` (L689–690).

- [ ] **Step 5: Implement `localStore.ts`, `synth.ts`, `dpad.ts`**

```ts
// src/game/platform/localStore.ts — KeyValueStore over localStorage, errors swallowed like the prototype (L231–234)
import type { KeyValueStore } from '../../meta';
export const localStore = (): KeyValueStore => ({
  get: k => { try { return window.localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { window.localStorage.setItem(k, v); } catch { /* storage full or blocked */ } },
});
```

`synth.ts`: port `ac()`, `tone()` and the `sfx` table (L238–263) unchanged (frequencies, durations, wave types, volumes, slides, delays); `unlock()` creates/resumes the `AudioContext` (called on the first user gesture: start of a run, L658); `play` is a no-op when sound is off or audio is unavailable; `buzz(p)` = `navigator.vibrate?.(p)` in try/catch (L264), always on (as in the prototype, haptics do not follow the sound toggle).
`dpad.ts`: four rounded buttons in `DPAD` (up, left, right, down), react on `pointerdown` (L735), pressed state until `pointerup`/`pointerout`; `setHeading(d)` highlights the button equal to `d` and dims the reverse one (L708–715). The D-pad is always shown.

- [ ] **Step 6: `HudScene`** (runs in parallel above `GameScene`, `this.scene.launch('Hud')` from Boot)

- Header: title `Mango Snake` + small `hard`; `score` / `best` stats (bump tween on score change unless reduced motion, L292); sound button (icon on/off drawn with Graphics, L189–190); pause button (play/pause icon, disabled in `ready` and `over`, L652–655).
- Level bar: `levelLabel`, fill = `progress / need` (full at max level), `progressLabel`; flash tween on `levelUp` (L607).
- Banner over the board: `bannerMs` (1800) timer; a new banner replaces the old; hidden at run start and at game over (L410–415, L643, L679).
- Overlay card over the board: title, text, legend (always shown: `Lands soon` red, `Ground rising` orange, `Mango rotting` ring, L144–148), best line, one button (`Play` / `Resume` / `Play again`). Button: `paused` → `flowResume`, else `flowStart` (L762). Card pointer events must not start a swipe on the button (Task 7 board zone excludes it).
- Countdown digits over the board from `flow` `tick` effects (n = 3, 2, 1); `tick` sound per digit, `go` sound at 0 (L991–993).
- Event handling (from `GameScene` `'sim-events'`): `ate` → score text, `eat`/`golden` sound, `buzz(ui.haptics.eatMs)`; `levelUp` → banner `levelBanner`, `level` sound, `buzz(ui.haptics.level)`; `landed` → `land` sound; `rotted` → `rot` sound; `hazardIncoming` → `incomingBanner`; `died`/`boardFull` handled via `'run-over'`.
- `'run-over'` (L676–697): disable pause; hide banner; `newBest = score > best` → update best text and `save(store, { bestScore, settings })`; if not won: `die` sound, `buzz(ui.haptics.deathMs)` (death flash, burst and shake are done by `GameScene`, Task 7); after `reduceMotion ? 0 : flow.deathCardDelayMs` ms, if flow is still `over`, show the card: `won ? TEXT.won : TEXT.over`, `deathMessage(...)`, `Play again`, `bestLine('over', ...)`.
- `ready` card at boot: `TEXT.title`, `TEXT.start`, `Play`, `bestLine('start', best)`.
- Pause: pause button and `P`/`Esc`/`Space` → `flowTogglePause` / `flowKey`; `showPaused` → card `Paused` / `You get a short countdown when you resume.` / `Resume`. `document.visibilitychange` (hidden) and `window` `blur` → `flowPause` (L765–766); register in `create`, remove on scene shutdown.
- Sound: button and `KeyM` toggle; save `settings.sound`; when turned on play `eat` (L270–273).

- [ ] **Step 7: Wire Boot and Game** — `BootScene`: `const store = localStore(); this.registry.set('store', store); this.registry.set('save', load(store));` then `scene.start('Game')` and `scene.launch('Hud')`. `GameScene.startRun` also calls `synth.unlock()` via the `'flow'` `newRun` event in the HUD. `main.ts` scene list: `[BootScene, GameScene, HudScene]`.

- [ ] **Step 8: Verify** — `npm test`; `npm run typecheck`; `npm run build`; `npm run dev`: full flow ready → countdown → playing ⇄ paused → over → play again with no console errors; best score and sound setting kept after reload (localStorage key `mango-snake.save` only).

- [ ] **Step 9: Docs** — CODEMAP: `src/game/` key files add `scenes/HudScene.ts, text.ts`; Entry points: "Save / load (browser)" → `src/game/platform/localStore.ts`; "Player-facing strings" → `src/game/text.ts`. CHANGELOG: `- feat: HUD, overlay cards, banners, D-pad, synth audio + haptics and save wiring (P0 PR 8).` STATUS updated.

- [ ] **Step 10: Commit**

```bash
git add src/game/ tests/ docs/CODEMAP.md docs/STATUS.md CHANGELOG.md
git commit -m "feat(game): HUD, overlays, D-pad, synth audio and save wiring"
```

---

### Task 9: Parity check, PLAYTEST entry, prototype frozen

**Branch:** `docs/p0-parity` · **Spec:** design §1 (exit criteria), §7.4, §8 (old saves not carried over).

**Files:**
- Create: `docs/PLAYTEST.md`
- Modify: `prototype/mango-snake-hard.html` (one comment line only), `docs/README.md` (PLAYTEST row exists; set its "Created" state), `docs/CODEMAP.md` (prototype marked frozen), `docs/DECISIONS.md` (prototype frozen), `CHANGELOG.md`, `docs/STATUS.md`
- Code fixes only through separate `fix/…` branches with a failing test first (`systematic-debugging`); this branch holds docs only.

- [ ] **Step 1: Branch** — `git switch master; git pull; git switch -c docs/p0-parity`

- [ ] **Step 2: Automated gate** — `npm test` (< 10 s), `npm run test:fuzz`, `npm run typecheck`, `npm run build`: all PASS; record the numbers (tests, durations) for the entry.

- [ ] **Step 3: Desktop run** — `npm run dev` next to `python3 -m http.server 8000` → `http://localhost:8000/prototype/mango-snake-hard.html`. Walk the design §7.4 checklist side by side, light and dark scheme, and with reduced motion emulated. Console: no errors (seed `console.info` only).

- [ ] **Step 4: Phone run** — `npm run dev -- --host` (Vite), open the LAN URL on a phone (and the prototype the same way). Same checklist, plus: swipe threshold feel, D-pad on pointer down, haptics, audio unlock on the first tap, tab switch pauses.

- [ ] **Step 5: Write `docs/PLAYTEST.md`** (first entry; newest entries go on top)

```markdown
# PLAYTEST — evidence log

> Newest entry first. AI: read the latest entry only (AGENTS §2b).

## 2026-11-xx — P0 parity: Phaser build vs prototype
- Build: commit `<sha>`, Phaser 3.90.0, TypeScript <7.0.2 | 6.0.3>. Automated: `npm test` <n> tests in <s> s; `npm run test:fuzz` 200 seeds PASS.
- Devices: desktop <browser/OS>; phone <model/browser> via `vite --host`.
- Saves: old prototype saves (best score `mango-snake-hard2-best`, sound `mango-snake-sound`) are **not** carried over (design §8). New key `mango-snake.save`.

| Check (design §7.4) | Desktop | Phone | Notes |
|---|---|---|---|
| Start / pause / resume / countdown flow | | | |
| Turning feel, buffered double turns, no reverse | | | |
| Eating, growth, golden mango | | | |
| Rot ring and rotten rock | | | |
| Level bar and banners at levels 3, 5, 7 | | | |
| Rocks: appear, warn, land, avoid snake, crumble | | | |
| Fences: same | | | |
| Hedge mazes: same | | | |
| Rising ground: same, waits for the snake | | | |
| Death causes and texts (all 7 + board full if reached) | | | |
| Best score kept after reload | | | |
| Sound toggle kept after reload | | | |
| Reduced motion; dark scheme | | | |
| No console errors | | | |

- Differences found: <list, each with "accepted (design §4 frame timing)" or a `fix/` branch link>.
- Verdict: P0 exit criteria (design §1) <met | not met: …>.
```

Mark each cell `pass` / `fail` with a short note. Any `fail` that is not covered by the accepted per-frame timing difference (design §4) gets a `fix/…` branch with a failing test, merged before this PR.

- [ ] **Step 6: Freeze the prototype** — add one HTML comment as line 2 of `prototype/mango-snake-hard.html`: `<!-- FROZEN 2026-11-xx: behavior reference for P0 parity only. Do not change; production code is in src/. -->`. Append to `docs/DECISIONS.md`: `## 2026-11-xx — Prototype frozen after P0 parity` (reason: P1 changes rules in `src/`; the prototype stays as the parity reference of PLAYTEST 2026-11-xx). CODEMAP: prototype row marked "frozen (reference only)"; keep `python3 -m http.server` as the way to run it.

- [ ] **Step 7: Docs** — `docs/README.md`: PLAYTEST row points to the file (now created). STATUS: P0 done (or the blocking fails), Next = P1 planning. CHANGELOG: `- docs: P0 parity check on desktop and phone recorded in PLAYTEST; prototype frozen (P0 PR 9).`

- [ ] **Step 8: Commit**

```bash
git add docs/PLAYTEST.md docs/README.md docs/CODEMAP.md docs/DECISIONS.md docs/STATUS.md CHANGELOG.md prototype/mango-snake-hard.html
git commit -m "docs: P0 parity check in PLAYTEST and freeze the prototype"
```

- [ ] **Step 9: Finish** — `requesting-code-review`, then `finishing-a-development-branch`. Push and PR only with the owner's approval (AGENTS §8).

---

## Self-review notes (writing-plans)

**Spec coverage (design section → task):**
- §1 exit criteria → Task 9 (gate + PLAYTEST verdict).
- §2 owner decisions → Global Constraints (prototype values D2, registry D8).
- §3 architecture, boundaries → Task 1 (scaffold, boundary test), extended in Tasks 2, 5, 6 (`src/core/hazards/**`, `src/meta/**`), 7 (`src/game/flow`, `swipeMath`), 8 (`text.ts`).
- §4 time model, API, snapshot, events → Tasks 3 (Sim shell, snapshot rules), 4 (rot in step order), 5 (full step order, determinism, clone, plain data); game-layer clock and seed logging → Task 7.
- §4.1 registry → Task 5 (`registry.ts`, `cells.ts` loop, registry tests).
- §5 MEC-001 → Task 3; MEC-002 → Task 4; MEC-003 → Task 3; MEC-004 → Tasks 2 (grid/BFS) and 5 (families, director, fairness).
- §6 balance.json → Task 2; maze layout cells pinned in Task 5 (`mazeCells`).
- §7.1 flow → Task 7 (`runFlow.ts`, tested) + Task 8 (cards, banners, pause sources, sound toggle, death sequence); §7.2 rendering → Task 7; §7.3 keyboard/swipe → Task 7, D-pad/audio/haptics → Task 8; §7.4 → Task 9; §7.5 strings → Task 8 (`text.ts`, tested).
- §8 save → Task 6 (pure), Task 8 (wiring, `localStore`), Task 9 (old saves not carried over, stated in PLAYTEST).
- §9 tests 1–7 → Tasks 2–8 as listed in each task; fuzz 50/200 seeds and < 10 s target → Task 5 Step 13–14.
- §10 tooling → Task 1. §11 delivery → Tasks 1–9 map 1:1 to PRs (1)–(9). §12 out of scope → nothing planned from it.

**Type and name consistency:** Tasks 5–9 use only names defined in Tasks 1–4 or declared in their own Interfaces block: `SimState.hazards`/`terrains`, `TimedHazard` (`family`, `state`, `t`, `warnMs`, `lifeMs`, `landed`, `cells[].on/ageMs`, `kind`), `TerrainHazard` (`cells[].delay/up/vis`), `SpawnCtx.cellFree(x, y, d?)`, `StepCtx.{balance, snakeOn, emit}`, `HazardFamily`, `spawnInMs`, `mazeCooldownMs`, `buildState`/`QUIET`, `restoreSim`/`stateOf`, `placeMango`, `isUnlocked`, `nearHead(head, dir, x, y, d, lane)`, `rngFrom`/`seedRng`, `loadBalance`, `findViolations`. Event shapes match `SimEvent` (`landed.hazardType`, `hazardIncoming.family`). `FlowEffect`/`FlowState` are new in Task 7 and consumed in Task 8.

**Choices made while writing (no spec change):**
- `stepHazards` lives in `registry.ts` and receives a `StepCtx` built by `sim.ts`, so `registry.ts` does not import `cells.ts` (avoids a `cells` ↔ `registry` import cycle).
- Event order on a landing cell is `dust` then `landed`, matching the prototype call order (burst before `sfx.land`, L569–570).
- Fuzz runs start at a seeded level 0…10 and chain runs until 120 s of sim time per seed, so terrain and mazes are exercised; the input RNG is separate from the Sim RNG.
- Haptics are not tied to the sound toggle (prototype `buzz` ignores `soundOn`, L264).

**Lead decision needed:**
- All tasks branch from `master` (the local branch `main` holds the old Ant Trail project and is never a base).
- Design §9 asks for a fuzz invariant "the mango is never on a reserved cell". `cellReserved` itself includes the mango cell, so the harness checks the mango against `cellReserved` with `mango: null` (snake, rotten rocks, hazard and terrain cells). This is the faithful reading of the prototype `reserved()` (L348–351); confirm.
