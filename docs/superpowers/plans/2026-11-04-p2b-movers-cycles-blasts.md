# P2b Biomes 4–5 Families (Movers, Cycles, Blasts, Bird) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the six P2b obstacle families of GDD §5.4 (rolling coconut L16, gate L17, spike L18, patrolling cat/chicken L21, mango-thief bird L22, timed bomb L23) on the P2a family framework, each with its fairness tests (MEC-004-R17 layer 1, R18 layer 2) and a bot report for L16–25.

**Architecture:** Every family is a stateless module on the registry (`src/core/hazards/registry.ts`), state in `SimState.families[key]` (JSON data). Two new building blocks: `blocks/mover.ts` (telegraphed path, 1 cell per `cellMs`, waits for body/solid, head-only hit through `ctx.hitHead`) and `blocks/areaBlast.ts` (countdown with telegraphed area, active for one base tick, head-only). Gates and spikes reuse the P0 terrain cycle as a parameterized `blocks/cycleCells.ts`. The bird is a `modifier` family outside the cap that never kills. Collision, BFS, placement and Shield only use the P2a composite queries.

**Tech Stack:** TypeScript strict, Vitest, Phaser 3.90.0 (greybox only), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-03-p2-content-design.md` (P2b rows: §3, §5 Mover/AreaBlast, §6, §8, §9, §10 MEC-013…017, §11, §14, §18, §20 items 2, 6, 10, 11), `docs/specs/mechanics/MEC-004-obstacles-director-fairness.md` (R1–R19; R16 as rewritten by level-up flow B), `docs/superpowers/specs/2026-11-04-levelup-flow-b-design.md` (no `onLevelEnd`, no freeze, no level-up crumble). MEC-013…017 are written in Task 1 of this plan (P2-D1).

**Precondition:** P2a exit passed (P2 design §3 P2a row: layers 1–2 green for rock, fence, maze, terrain, mud, ice; bot report L1–15). If not, stop and tell the lead.

## Open questions (owner)
Gameplay gaps the P2 design does not fix. Each has a provisional default used in this plan; the owner may change the number in `config/balance.json` or the rule in the MEC spec before Task 1 merges.

| # | Question | Provisional default |
|---|---|---|
| OQ-B1 | Gate rhythm (open / warn / closed durations). Design only says "closed shorter than open", warn 900. | open 2400 ms, warn 900 ms, closed 1500 ms; gate family life 14000 + rand 4000 ms |
| OQ-B2 | Spike beat (down / warn / up). | down 1800 ms, warn 900 ms, up 900 ms (beat 3600 ms) from `levelTimeMs`; spike group life 12000 + rand 4000 ms |
| OQ-B3 | NPC speeds. Design fixes "cat slow, chicken fast" only. | cat `cellMs` 400, chicken `cellMs` 220; weights cat 1, chicken 1 |
| OQ-B4 | Does a stolen mango cost the player anything besides the lost time? | No: counters, score and energy unchanged; only the rot timer resets with the new mango (P2 design §10 MEC-016) |
| OQ-B5 | Is the bird's shadow visible when the player cannot make it (bird only targets when reachable in time)? | The bird only spawns when the mango is reachable in time; no "impossible" shadow is ever shown |
| OQ-B6 | Player-facing strings (`banner.new.*`, `death.*`) for the six families. | English strings listed in Task 9; owner reviews before P2b merge to dev |

## Technical rulings (lead-level, decided in this plan)
- **TR-B1 No level-end hook.** Level-up flow B removed `HazardFamily.onLevelEnd` (MEC-004-R16). Coconuts, NPCs, bombs, gates, spikes and the bird keep their own lifecycle across a level up and can still hit (MEC-004 EC8). No P2b family defines a level-end member.
- **TR-B2 P2a surface.** This plan uses the interfaces P2a produces (P2a plan Tasks 1–5): `HazardFamily` with `spawn(s, ctx): Cell[] | null`, `update(s, ctx: StepCtx & HitCtx)`, `count`, `tileAt`, `headHit`, `onBreak`; `solidCauseAt`, `bfsWall`, `reservedByFamilies`, `headHitAt`; `candidateValid`, `keepsMangoReachable`, `SpawnObserver`; `createSimInternal`, `stateOf`, `escapeExists`, `buildTimeline`; `runFamilyFuzz`, `soloTable`, `buildState`, `testCtx`; `applyHeadHit`, `resolveHeadCell`. The P2a plan lists `onLevelEnd` in its interface; the P2a revision removes it (TR-B1). If a landed name differs, Task 2 records the mapping in `docs/DECISIONS.md` and later tasks use the real name.
- **TR-B3 Mover cells and fairness rule 2.** A mover's *path* must satisfy rule 2 (R11) at spawn, except the coconut lane, which only has to avoid the head's row/column and the front lane (P2 design §10). The mover body itself is not "solid" (`solidAt` false); it reports `headHit = 'mover'` on its current cell.
- **TR-B4 Mover lethality in the fuzz harness.** I1 for movers = "a mover never enters a snake cell" (it waits); I3 for movers = "the whole path was in the snapshot for ≥ `warnMs` before the first move".
- **TR-B5 Gate structure.** A gate instance owns two cell sets: fence cells (plain `TimedCells`, cause `fence`, BFS wall) and gate cells (`CycleCells`, cause `gate`, not a BFS wall). One family `gate` owns both, so registry order and `count` stay simple; `solidCauseAt` returns `fence` for its fence cells by reporting the cause per cell through the instance (`solidCauseAt` uses `family.cause` = `gate`; therefore the gate module exposes a per-cell cause through a new optional member `causeAt?(s, x, y): CauseKey | null`, which `solidCauseAt` prefers over `cause` when present).
- **TR-B6 Bird is not a director option when no regular mango qualifies.** `spawn` returns `null`; the director then tries other options (P0 retry) and the bird does not count toward the small cap (`capClass: 'modifier'`).
- **TR-B7 Blast tick.** "Active for one base tick" = `baseTickMs(s, b)` at activation (no Slow-mo or level-up factor), so Slow-mo cannot stretch danger (P2 design §9: timers real time).
- **TR-B8 New events** carry only plain data: `moverHit {family, x, y}`, `bombBlast {x, y, cells}`, `mangoStolen {x, y}`.

## Global Constraints
- English only in files (AGENTS §0). Conventional Commits. One task = one branch from `version/v0.x` (current version branch in STATUS), merged back with `--no-ff` after `npm test` + `npm run typecheck` (AGENTS §6).
- `src/core` stays pure: no Phaser, DOM, `Math.random`, `Date`, `performance`.
- No new npm dependency.
- No magic numbers: every value below lives in `config/balance.json` and is validated by `parseBalance` (warns ≥ `max(fairness.minWarnMs, fairness.minWarnTicks × speed.startMs)` = 900 ms, MEC-004-R13).
- Registry order after P2b: `rock, fence, maze, terrain, rottenRock, snipWall, rubble, mud, ice, coconut, gate, spike, npc, bird, bomb`.
- Head-only lethality for movers and blasts (P2-D4).
- Test names start with the requirement ID; main functions carry `// MEC-0xx-Rn`.
- While working: minimal tests (`npx vitest run <path>`); before commit/merge: `npm test` then `npm run typecheck` (AGENTS §6b). Windows: Vitest flags `--configLoader native --pool threads --maxWorkers 2` if the default pool fails.
- Each task: CHANGELOG `[Unreleased]` line; CODEMAP row when a module is added; STATUS at session end.
- Design §20 changes to P1 specs are applied to the P1 MEC files in the task that implements them, lead approval noted in the commit body.

## File Structure
| File | Responsibility | Task |
|---|---|---|
| `docs/specs/mechanics/MEC-013-rolling-coconuts.md` … `MEC-017-timed-bombs.md` | family rules (P2-D7) | 1 |
| `src/core/types.ts` | `FamilyKey`, `CauseKey`, new events | 2 |
| `src/core/hazards/family.ts` · `queries.ts` | optional `causeAt` (TR-B5) | 2 |
| `src/core/hazards/blocks/mover.ts` | Mover block | 3 |
| `src/core/hazards/coconut.ts` | coconut family (L16) | 4 |
| `src/core/hazards/blocks/cycleCells.ts` | CycleCells block (terrain cycle, parameterized) | 5 |
| `src/core/hazards/gate.ts` · `spike.ts` | gate (L17), spike (L18) | 5, 6 |
| `src/core/hazards/npc.ts` | cat / chicken (L21) | 7 |
| `src/core/hazards/bird.ts` | mango-thief bird (L22) | 8 |
| `src/core/hazards/blocks/areaBlast.ts` · `bomb.ts` | AreaBlast block, bomb (L23) | 9 |
| `src/core/balance.ts`, `config/balance.json` | groups `coconut`, `gate`, `spike`, `npc`, `bird`, `bomb`; table rows | 4–9 |
| `src/game/render/movers.ts` · `cycles.ts` · `blasts.ts` | greybox drawing | 10 |
| `src/game/text.ts` | banners, death texts | 10 |
| `tests/core/hazards/*.test.ts`, `tests/core/fairness/familyFuzz.test.ts`, `tests/support/fuzz.ts` | unit + fuzz | 3–11 |
| `tools/bot/botConfig.ts` | levels 16–25 | 11 |

---

### Task 1: Family specs MEC-013…MEC-017

**Files:**
- Create: `docs/specs/mechanics/MEC-013-rolling-coconuts.md`, `MEC-014-gates-spikes.md`, `MEC-015-patrol-npcs.md`, `MEC-016-mango-thief-bird.md`, `MEC-017-timed-bombs.md`
- Modify: `docs/README.md` (5 rows, status Draft → Approved by lead), `docs/GDD.md` §2b rows only with lead approval (link the specs), `docs/specs/mechanics/MEC-004-obstacles-director-fairness.md` §6 links

**Interfaces:**
- Consumes: P2 design §5, §8, §9, §10, §18; MEC-004 template sections (1 Purpose … 11 Lead decisions).
- Produces: requirement IDs used by every later task:
  - MEC-013-R1 lane choice, R2 telegraph, R3 roll, R4 shatter, R5 head hit / Shield, R6 cap, R7 not affecting mangoes/orbs, R8 introduction L16.
  - MEC-014-R1 gate shape, R2 gate cycle, R3 gate waits for snake, R4 gate BFS/reserved, R5 spikes shape, R6 global beat, R7 spike waits, R8 Shield, R9 introductions L17/L18, R10 U-trap escape.
  - MEC-015-R1 variant pick, R2 route, R3 telegraph, R4 ping-pong, R5 wait rule, R6 leave, R7 head hit / Shield, R8 introduction L21.
  - MEC-016-R1 target condition, R2 shadow, R3 steal, R4 leave on eat, R5 never lethal, R6 modifier cap, R7 introduction L22.
  - MEC-017-R1 landing, R2 countdown + area, R3 blast, R4 Shield (defuse / absorb), R5 no chains, R6 introduction L23.

- [ ] **Step 1: Write each spec** from the template of MEC-012 (sections 1–11). Rules copy the fixed decisions of P2 design §10 and the defaults of the "Open questions (owner)" table above; tuning tables list every balance key of Tasks 4–9 with the values given there. Each spec's §10 lists the exact acceptance test names used in Tasks 3–9.
- [ ] **Step 2: Check links** — `grep -n "MEC-01[3-7]" docs/README.md docs/GDD.md docs/specs/mechanics/MEC-004-obstacles-director-fairness.md` shows every new file linked once from the README and from MEC-004 §6.
- [ ] **Step 3: Commit** `docs: MEC-013..017 family specs for P2b`

---

### Task 2: Types, events and per-cell cause

**Files:**
- Modify: `src/core/types.ts`, `src/core/hazards/family.ts`, `src/core/hazards/queries.ts`, `tests/core/hazards/queries.test.ts`

**Interfaces:**
- Consumes: P2a Task 1 `HazardFamily`, `solidCauseAt`, `fakeFamily`.
- Produces:
```ts
export type FamilyKey = /* P2a keys */ | 'coconut' | 'gate' | 'spike' | 'npc' | 'bird' | 'bomb';
export type CauseKey  = /* P2a keys */ | 'coconut' | 'gate' | 'spike' | 'cat' | 'chicken' | 'bomb';
// SimEvent additions (TR-B8)
| { type: 'moverHit'; family: 'coconut' | 'npc'; x: number; y: number }
| { type: 'bombBlast'; x: number; y: number; cells: Cell[] }
| { type: 'mangoStolen'; x: number; y: number }
// HazardFamily optional member (TR-B5)
causeAt?(s: SimState, x: number, y: number): CauseKey | null;
// SimState.families gains: coconut, gate, spike, npc, bird, bomb (typed in each family task; initialised empty in createSim)
```

- [ ] **Step 1: Write the failing test**
```ts
// tests/core/hazards/queries.test.ts (add)
it('MEC-004-R3 solidCauseAt prefers a family causeAt over its cause', () => {
  const f = { ...fakeFamily({ key: 'gate', cause: 'gate', solid: [[3, 3], [4, 3]] }),
    causeAt: (_s: unknown, x: number) => (x === 3 ? 'fence' : 'gate') as const };
  const s = buildState({});
  expect(solidCauseAt(s, 3, 3, [f])).toBe('fence');
  expect(solidCauseAt(s, 4, 3, [f])).toBe('gate');
});
```
- [ ] **Step 2: Run** `npx vitest run tests/core/hazards/queries.test.ts` → FAIL (`causeAt` ignored → `'gate'` for (3,3)).
- [ ] **Step 3: Implement**
```ts
// src/core/hazards/queries.ts
export const solidCauseAt = (s: SimState, x: number, y: number, fams: readonly HazardFamily[] = FAMILIES): CauseKey | null => {
  const f = solidFamilyAt(s, x, y, fams);            // MEC-004-R3
  if (!f) return null;
  return f.causeAt ? f.causeAt(s, x, y) ?? f.cause : f.cause;
};
```
Widen the unions and add the three events; `createSim` initialises the six new `families` entries in later tasks (each task adds its own entry so typecheck passes per task).
- [ ] **Step 4: Run** `npx vitest run tests/core/hazards` and `npm run typecheck` → PASS. Before commit: `npm test` → PASS (golden values unchanged: no family uses `causeAt` yet).
- [ ] **Step 5: Commit** `feat(core): P2b family and cause keys, mover/blast/steal events, per-cell cause (MEC-004-R3)`

---

### Task 3: Mover building block

**Files:**
- Create: `src/core/hazards/blocks/mover.ts`, `tests/core/hazards/mover.test.ts`

**Interfaces:**
- Consumes: P2a `HitCtx`, `StepCtx`.
- Produces:
```ts
export interface MoverState {
  path: Cell[];            // telegraphed cells in travel order (ping-pong routes store one leg)
  pos: number;             // index in path; -1 while warning
  dirSign: 1 | -1;         // ping-pong direction
  t: number;               // ms in the current phase
  warnMs: number; cellMs: number;
  pingPong: boolean;
  lifeMs: number;          // ping-pong only; 0 = until path end
  state: 'warn' | 'move' | 'done';
}
export type MoverStep = 'keep' | 'done';
export interface MoverEnv {
  blocked(x: number, y: number): boolean;      // solid cell (not the mover itself)
  bodyOn(x: number, y: number): boolean;       // snake cell except the head
  headAt(x: number, y: number): boolean;
}
export function newMover(path: readonly Cell[], warnMs: number, cellMs: number, pingPong: boolean, lifeMs: number): MoverState;
export function moverCell(m: MoverState): Cell | null;            // current cell while moving
export function moverDir(m: MoverState): Dir;                     // direction of the next/last move
/** One 1 ms step. Returns 'enter-head' when the mover moved onto the head this ms (caller calls ctx.hitHead). */
export function stepMover(m: MoverState, env: MoverEnv, onBlocked: 'wait' | 'stop'): MoverStep | 'enter-head';
```
Rules: warn for `warnMs` (pos = -1), then `pos = 0` (first cell) — entering cell 0 obeys the same checks as any move; every `cellMs` try to advance to the next cell `c`: if `env.blocked(c)` → `stop` mode returns `'done'`, `wait` mode keeps `t` at `cellMs` and retries next ms; if `env.bodyOn(c)` → same as blocked; if `env.headAt(c)` → move in, return `'enter-head'`. End of path: one-way → `'done'`; ping-pong → reverse `dirSign`. Ping-pong ends (`'done'`) when `lifeMs` has elapsed since the first move and the mover sits on path end 0 or the last cell (it "leaves" at an end, MEC-015-R6).

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/mover.test.ts
import { it, expect } from 'vitest';
import { newMover, stepMover, moverCell } from '../../../src/core/hazards/blocks/mover';
const path = [0, 1, 2, 3].map(x => ({ x, y: 5 }));
const free = { blocked: () => false, bodyOn: () => false, headAt: () => false };
const run = (m: ReturnType<typeof newMover>, ms: number, env = free, mode: 'wait' | 'stop' = 'stop') => {
  let r: string = 'keep'; for (let i = 0; i < ms && r === 'keep'; i++) r = stepMover(m, env, mode); return r;
};

it('MEC-004-R5 mover warns for warnMs before the first cell', () => {
  const m = newMover(path, 1500, 90, false, 0);
  run(m, 1499); expect(moverCell(m)).toBeNull();
  run(m, 1);    expect(moverCell(m)).toEqual({ x: 0, y: 5 });
});
it('MEC-004-R5 mover advances one cell per cellMs and ends after the last cell', () => {
  const m = newMover(path, 1500, 90, false, 0);
  run(m, 1500 + 90 * 3); expect(moverCell(m)).toEqual({ x: 3, y: 5 });
  expect(run(m, 90)).toBe('done');
});
it('MEC-004-R5 stop mode ends on a body cell, wait mode waits for it', () => {
  const body = { ...free, bodyOn: (x: number) => x === 2 };
  const a = newMover(path, 1500, 90, false, 0);
  expect(run(a, 5000, body, 'stop')).toBe('done');
  const b = newMover(path, 1500, 90, false, 0);
  expect(run(b, 5000, body, 'wait')).toBe('keep');
  expect(moverCell(b)).toEqual({ x: 1, y: 5 });
});
it('MEC-004-R8 entering the head cell reports enter-head', () => {
  const head = { ...free, headAt: (x: number) => x === 1 };
  const m = newMover(path, 1500, 90, false, 0);
  expect(run(m, 5000, head)).toBe('enter-head');
  expect(moverCell(m)).toEqual({ x: 1, y: 5 });
});
it('MEC-015-R4 ping-pong reverses at the ends and leaves at an end after lifeMs', () => {
  const m = newMover(path, 1500, 100, true, 1000);
  run(m, 1500 + 300 + 100); expect(moverCell(m)).toEqual({ x: 2, y: 5 });
  expect(run(m, 5000)).toBe('done');
  const c = moverCell(m)!; expect(c.x === 0 || c.x === 3).toBe(true);
});
```
- [ ] **Step 2: Run** `npx vitest run tests/core/hazards/mover.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement**
```ts
// src/core/hazards/blocks/mover.ts — MEC-004-R5 Mover block
export function newMover(path: readonly Cell[], warnMs: number, cellMs: number, pingPong: boolean, lifeMs: number): MoverState {
  return { path: path.map(c => ({ ...c })), pos: -1, dirSign: 1, t: 0, warnMs, cellMs, pingPong, lifeMs, state: 'warn' };
}
export const moverCell = (m: MoverState): Cell | null => (m.pos < 0 || m.state === 'done' ? null : m.path[m.pos]!);
export function moverDir(m: MoverState): Dir {               // direction of travel along dirSign
  const i = Math.max(0, m.pos);
  const j = i + m.dirSign >= 0 && i + m.dirSign < m.path.length ? i + m.dirSign : i - m.dirSign;
  const sign = j === i + m.dirSign ? 1 : -1;                  // at an end: keep the last travel direction
  const a = m.path[i]!, b = m.path[j]!;
  return { x: (Math.sign(b.x - a.x) * sign) as Step, y: (Math.sign(b.y - a.y) * sign) as Step };
}
export function stepMover(m: MoverState, env: MoverEnv, onBlocked: 'wait' | 'stop'): MoverStep | 'enter-head' {
  m.t++;
  if (m.state === 'warn') { if (m.t < m.warnMs) return 'keep'; m.state = 'move'; m.t = m.cellMs; }   // first cell is entered at warnMs
  if (m.t < m.cellMs) return 'keep';
  if (m.pingPong && m.lifeMs > 0) m.lifeMs = Math.max(0, m.lifeMs - m.cellMs);
  let next = m.pos + m.dirSign;
  if (next < 0 || next >= m.path.length) {
    if (!m.pingPong) { m.state = 'done'; return 'done'; }
    m.dirSign = m.dirSign === 1 ? -1 : 1; next = m.pos + m.dirSign;
  }
  if (m.pingPong && m.lifeMs === 0 && m.pos >= 0 && (m.pos === 0 || m.pos === m.path.length - 1)) { m.state = 'done'; return 'done'; }
  const c = m.path[next]!;
  if (env.blocked(c.x, c.y) || env.bodyOn(c.x, c.y)) {
    if (onBlocked === 'stop') { m.state = 'done'; return 'done'; }
    m.t = m.cellMs; return 'keep';                               // MEC-004-R5 waits, retries next ms
  }
  m.pos = next; m.t = 0;
  return env.headAt(c.x, c.y) ? 'enter-head' : 'keep';
}
```
Note: the ping-pong `lifeMs` counts down per move attempt interval (`cellMs`), so waiting also consumes life; the test above fixes this behavior. Write `moverDir` tests in Step 1 as well: `MEC-004-R5 moverDir points along the path` → path x 0..3, after first move `{x: 1, y: 0}`; ping-pong after reversal `{x: -1, y: 0}`.
- [ ] **Step 4: Run** `npx vitest run tests/core/hazards/mover.test.ts` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(core): mover building block (MEC-004-R5)`

---

### Task 4: Rolling coconut family (L16)

**Files:**
- Create: `src/core/hazards/coconut.ts`, `tests/core/hazards/coconut.test.ts`
- Modify: `src/core/hazards/registry.ts` (append `coconut`), `src/core/sim.ts` (init `families.coconut`), `src/core/balance.ts` (group + table weight key), `config/balance.json`, `tests/core/fairness/familyFuzz.test.ts` (`coconut: 16`), `tests/support/fuzz.ts` (mover extraction, TR-B4), `tests/core/hazards/queries.test.ts` (R1 order), `docs/specs/mechanics/MEC-003-levels-biomes.md` R15 note (design §20 item 4)

**Interfaces:**
- Consumes: Task 3 mover block, P2a `candidateValid`, `HitCtx.hitHead`, `solidCauseAt`.
- Produces: `export const coconut: HazardFamily` `{key: 'coconut', cause: 'coconut', capClass: 'small', maxActiveKey: 'coconut.maxActive', breakable: true}`; state `s.families.coconut = { rolls: { id: number; lane: 'row' | 'col'; index: number; mover: MoverState }[]; nextId: number }`; `headHit` → `'mover'` on a rolling coconut's cell; `reservedAt` → every lane cell while warning/rolling; `solidAt`/`bfsWallAt` → false; `onBreak` removes the roll at (x, y); `export function laneCandidates(s: SimState, b: Balance): { lane: 'row' | 'col'; index: number; from: 'start' | 'end' }[]` (MEC-013-R1, deterministic order rows 0…16 then cols 0…16, start then end).
- Config:
```json
"coconut": { "warnMs": 1500, "cellMs": 90, "maxActive": 2, "tries": 20 }
```
Table rows: split `16–25` into `16–20` and `21–25`; L16–30 weights add `coconut: 2` (P2 design §11).

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/coconut.test.ts
import { it, expect } from 'vitest';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { coconut, laneCandidates } from '../../../src/core/hazards/coconut';
import { newMover } from '../../../src/core/hazards/blocks/mover';
import { loadBalance, soloTable } from '../../support/balance';
import { buildState, } from '../../support/buildState';
import { testCtx } from '../../support/fakeFamily';

const row = (y: number) => Array.from({ length: 17 }, (_, x) => ({ x, y }));

it('MEC-013-R1 lanes exclude the head row/column and any lane with a front-lane cell', () => {
  const b = loadBalance();
  const s = buildState({ head: [8, 8], dir: [1, 0] });
  const lanes = laneCandidates(s, b);
  expect(lanes.some(l => l.lane === 'row' && l.index === 8)).toBe(false);
  expect(lanes.some(l => l.lane === 'col' && l.index === 8)).toBe(false);
  for (const x of [9, 10, 11, 12]) expect(lanes.some(l => l.lane === 'col' && l.index === x)).toBe(false);
  expect(lanes.some(l => l.lane === 'row' && l.index === 3)).toBe(true);
});
it('MEC-013-R3 coconut rolls one cell per 90 ms after a 1500 ms warning and kills the head', () => {
  const b = soloTable(loadBalance(), 'coconut');
  const sim = createSimInternal(b, 16, { startLevel: 16 }, { directorEnabled: false, freezeSnake: true });
  const s = stateOf(sim);
  s.snake = [{ x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 }];
  s.families.coconut.rolls.push({ id: 1, lane: 'row', index: 3, mover: newMover(row(3), 1500, 90, false, 0) });
  sim.advance(1500 + 90 * 5 - 1);
  expect(s.status).toBe('playing');
  sim.advance(1);
  expect(s.status).toBe('over');
  expect(sim.drainEvents().find(e => e.type === 'died')).toMatchObject({ cause: 'coconut', x: 5, y: 3 });
});
it('MEC-013-R4 coconut shatters on a body cell and on a solid cell', () => {
  const b = soloTable(loadBalance(), 'coconut');
  const sim = createSimInternal(b, 16, { startLevel: 16 }, { directorEnabled: false, freezeSnake: true });
  const s = stateOf(sim);
  s.snake = [{ x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 }];   // body crosses row 3
  s.families.coconut.rolls.push({ id: 1, lane: 'row', index: 3, mover: newMover(row(3), 1500, 90, false, 0) });
  sim.advance(1500 + 90 * 10);
  expect(s.status).toBe('playing');
  expect(s.families.coconut.rolls).toEqual([]);
});
it('MEC-013-R5 shield breaks a coconut that rolls into the head', () => {
  const b = soloTable(loadBalance(), 'coconut');
  const sim = createSimInternal(b, 16, { startLevel: 16 }, { directorEnabled: false, freezeSnake: true });
  const s = stateOf(sim);
  s.snake = [{ x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 }];
  s.shield = { leftMs: 5000 };
  s.families.coconut.rolls.push({ id: 1, lane: 'row', index: 3, mover: newMover(row(3), 1500, 90, false, 0) });
  sim.advance(1500 + 90 * 5);
  expect(s.status).toBe('playing');
  expect(s.shield).toBeNull();
  expect(s.families.coconut.rolls).toEqual([]);
  expect(sim.drainEvents().map(e => e.type)).toContain('shieldBroke');
});
```
Also write (same file):
- `MEC-013-R2 lane cells are reserved while warning and rolling` → after `coconut.spawn` on `buildState({head: [8, 8], dir: [1, 0]})` with `testCtx`, every returned cell has `reservedByFamilies` true.
- `MEC-013-R6 one coconut per lane and at most coconut.maxActive` → two rolls alive: `coconut.spawn` returns `null`; a lane already rolling is not in `laneCandidates`.
- `MEC-013-R7 a coconut passes over the mango and orbs without changing them` → mango at (9,3): after the roll, `s.mango` deep-equals the value before.
- `MEC-013-R8 coconut is introduced at L16 only` → `introducedAt(b, 16) === 'coconut'`, no other level returns `'coconut'`.
- [ ] **Step 2: Run** `npx vitest run tests/core/hazards/coconut.test.ts` → FAIL.
- [ ] **Step 3: Implement** `coconut.ts`:
```ts
export const coconut: HazardFamily = {                       // MEC-013
  key: 'coconut', cause: 'coconut', capClass: 'small', maxActiveKey: 'coconut.maxActive', breakable: true,
  spawn(s, ctx) {                                            // MEC-013-R1/R2
    const c = ctx.balance.coconut, st = s.families.coconut;
    const lanes = laneCandidates(s, ctx.balance);
    for (let i = 0; i < c.tries && lanes.length; i++) {
      const l = lanes.splice(ctx.rng.int(lanes.length), 1)[0]!;
      const cells = laneCells(ctx.balance, l);              // ordered from l.from
      if (!candidateValid(s, ctx.balance, cells, { nearDist: 0, exemptNearHead: true, wallCells: [] })) continue;
      st.rolls.push({ id: st.nextId++, lane: l.lane, index: l.index, mover: newMover(cells, c.warnMs, c.cellMs, false, 0) });
      ctx.emit({ type: 'hazardIncoming', family: 'coconut' });
      return cells;
    }
    return null;
  },
  update(s, ctx) {                                           // MEC-013-R3/R4/R5
    const st = s.families.coconut;
    st.rolls = st.rolls.filter(r => {
      const env = { blocked: (x: number, y: number) => solidCauseAt(s, x, y) !== null,
        bodyOn: (x: number, y: number) => s.snake.some((p, i) => i > 0 && p.x === x && p.y === y),
        headAt: (x: number, y: number) => s.snake[0]!.x === x && s.snake[0]!.y === y };
      const r2 = stepMover(r.mover, env, 'stop');
      if (r2 === 'enter-head') { const c = moverCell(r.mover)!; ctx.hitHead('coconut', c.x, c.y, 'mover', moverDir(r.mover)); }
      return r2 !== 'done' && st.rolls.includes(r);          // onBreak during hitHead removes r
    });
  },
  count: s => s.families.coconut.rolls.length,
  headHit: (s, x, y) => s.families.coconut.rolls.some(r => { const c = moverCell(r.mover); return c?.x === x && c.y === y; }) ? 'mover' : null,
  reservedAt: (s, x, y) => s.families.coconut.rolls.some(r => r.mover.state !== 'done' && r.mover.path.some(c => c.x === x && c.y === y)),
  solidAt: () => false, bfsWallAt: () => false,
  onBreak: (s, x, y) => { const st = s.families.coconut; st.rolls = st.rolls.filter(r => { const c = moverCell(r.mover); return !(c?.x === x && c.y === y); }); },
  snapshot: s => s.families.coconut.rolls.map(r => ({ path: r.mover.path, cell: moverCell(r.mover), state: r.mover.state, t: r.mover.t, warnMs: r.mover.warnMs })),
};
```
`laneCandidates`: rows `y ≠ head.y` and cols `x ≠ head.x`, excluding a lane containing any front-lane cell (`frontLane(head, dir, fairness.frontLaneCells)` from P0 `grid.ts`) and lanes already rolling; each lane twice (`from: 'start' | 'end'`). Rule 2 note: the lane avoids the head row/column and front lane by construction (`exemptNearHead`, TR-B3); rule 3 is trivially kept (`wallCells: []`, coconuts are not BFS walls). Fuzz: in `tests/support/fuzz.ts` extract coconut cells as `warn` while `state === 'warn'` (whole path) and as `mover` cells while moving; I1 for movers = moved-into cell is never a body cell; I3 = path present ≥ `warnMs` before first move (TR-B4).
- [ ] **Step 4: Run** `npx vitest run tests/core/hazards/coconut.test.ts tests/core/fairness` → PASS; `npm run typecheck` → PASS. Before commit `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(core): rolling coconuts from level 16 (MEC-013)`

---

### Task 5: CycleCells block and gate family (L17)

**Files:**
- Create: `src/core/hazards/blocks/cycleCells.ts`, `src/core/hazards/gate.ts`, `tests/core/hazards/cycleCells.test.ts`, `tests/core/hazards/gate.test.ts`
- Modify: `src/core/hazards/terrain.ts` (use the block, no behavior change), `registry.ts` (append `gate`), `sim.ts` (init), `balance.ts`, `config/balance.json`, `familyFuzz.test.ts` (`gate: 17`), `queries.test.ts` (R1 order), `docs/specs/mechanics/MEC-006-energy-skills.md` R24 note (design §20 item 10)

**Interfaces:**
- Consumes: P0 terrain cycle (`terrain.ts`: `TerrainCell {x, y, delay, up, vis}`), P0 fence shapes (`fence.ts` shape pool `line`, `U`), Task 2 `causeAt`, P2a `candidateValid`.
- Produces:
```ts
// blocks/cycleCells.ts — MEC-004-R5 CycleCells
export interface CyclePhases { downMs: number; warnMs: number; upMs: number }
export interface CycleCell { x: number; y: number; delay: number; up: boolean; vis: 'down' | 'warn' | 'up' }
/** Phase of a cell at cycle time t (ms since the cycle origin, minus its delay). Pure. */
export function cyclePhase(p: CyclePhases, t: number): 'down' | 'warn' | 'up';
/** Applies the phase; a cell turns up only when no snake cell is on it (it stays 'warn' until then). MEC-004-R5 */
export function stepCycleCell(c: CycleCell, p: CyclePhases, t: number, snakeOn: (x: number, y: number) => boolean): void;
// gate.ts — MEC-014-R1..R4
export interface GateInstance { id: number; t: number; lifeMs: number; fence: TimedCell[]; gate: CycleCell[]; state: 'warn' | 'live' | 'crumble' }
export const gate: HazardFamily;   // {key:'gate', cause:'gate', capClass:'small', maxActiveKey:'gate.maxActive', breakable:true}
```
Gate cycle: `CyclePhases` = `{ downMs: gate.openMs, warnMs: gate.warnMs, upMs: gate.closedMs }` ("down" = open). Shapes: `line` length 5–7 with 1–2 middle cells as gate cells, or `U` (3 × 3 opening) with the 1–2 mouth cells as gate cells. Instance lifecycle: `warn` (`gate.landWarnMs` 1500; fence cells warn, gate cells shown open) → `live` (`lifeMs`) → `crumble` (`hazard.crumbleMs`) → removed. Fence cells turn solid only when no snake cell is on them (TimedCells rule). `causeAt` → `'fence'` on solid fence cells, `'gate'` on up gate cells. `bfsWallAt` → fence cells (any state), gate cells never. `reservedAt` → all cells. `onBreak` removes that one cell for the rest of the instance's life.
- Config (OQ-B1 defaults):
```json
"gate": { "landWarnMs": 1500, "openMs": 2400, "warnMs": 900, "closedMs": 1500, "lifeMs": 14000, "lifeRandMs": 4000,
  "maxActive": 1, "tries": 40, "lineLen": [5, 7], "shapePool": ["line", "U"] }
```
`parseBalance`: `gate.warnMs ≥ 900`, `gate.landWarnMs ≥ 900`, `closedMs < openMs` (MEC-014-R2). Table: L17–30 add `gate: 2`.

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/cycleCells.test.ts
import { it, expect } from 'vitest';
import { cyclePhase, stepCycleCell } from '../../../src/core/hazards/blocks/cycleCells';
const P = { downMs: 2400, warnMs: 900, upMs: 1500 };
it('MEC-004-R5 cyclePhase walks down warn up and repeats', () => {
  expect(cyclePhase(P, 0)).toBe('down');
  expect(cyclePhase(P, 2399)).toBe('down');
  expect(cyclePhase(P, 2400)).toBe('warn');
  expect(cyclePhase(P, 3300)).toBe('up');
  expect(cyclePhase(P, 4800)).toBe('down');
});
it('MEC-004-R5 a cycle cell under the snake stays warn until the snake leaves', () => {
  const c = { x: 1, y: 1, delay: 0, up: false, vis: 'down' as const };
  stepCycleCell(c, P, 3300, () => true);
  expect(c).toMatchObject({ up: false, vis: 'warn' });
  stepCycleCell(c, P, 3301, () => false);
  expect(c).toMatchObject({ up: true, vis: 'up' });
});
```
```ts
// tests/core/hazards/gate.test.ts
import { it, expect } from 'vitest';
import { gate } from '../../../src/core/hazards/gate';
import { solidCauseAt, bfsWall, reservedByFamilies } from '../../../src/core/hazards/queries';
import { buildState } from '../../support/buildState';
import { testCtx } from '../../support/fakeFamily';
import { loadBalance } from '../../support/balance';

const liveGate = () => ({ id: 1, t: 0, lifeMs: 14000, state: 'live' as const,
  fence: [{ x: 4, y: 10, on: true, ageMs: 0 }, { x: 5, y: 10, on: true, ageMs: 0 }, { x: 7, y: 10, on: true, ageMs: 0 }, { x: 8, y: 10, on: true, ageMs: 0 }],
  gate: [{ x: 6, y: 10, delay: 0, up: true, vis: 'up' as const }] });

it('MEC-014-R4 fence cells are BFS walls with cause fence; a closed gate cell has cause gate and is no BFS wall', () => {
  const s = buildState({ head: [8, 3] });
  s.families.gate.gates.push(liveGate());
  expect(solidCauseAt(s, 4, 10)).toBe('fence');
  expect(solidCauseAt(s, 6, 10)).toBe('gate');
  expect(bfsWall(s, 4, 10)).toBe(true);
  expect(bfsWall(s, 6, 10)).toBe(false);
  expect(reservedByFamilies(s, 6, 10)).toBe(true);
});
it('MEC-014-R2 gate cells close for closedMs and open for openMs with a 900 ms warning', () => {
  const b = loadBalance();
  const s = buildState({ head: [8, 3] });
  const g = liveGate(); g.gate[0] = { x: 6, y: 10, delay: 0, up: false, vis: 'down' }; s.families.gate.gates.push(g);
  const ctx = testCtx(s);
  for (let i = 0; i < b.gate.openMs; i++) gate.update(s, ctx);
  expect(g.gate[0]!.vis).toBe('warn');
  for (let i = 0; i < b.gate.warnMs; i++) gate.update(s, ctx);
  expect(g.gate[0]!.vis).toBe('up');
});
```
Also write:
- `MEC-014-R1 gate spawn makes a line of 5-7 or a U with 1-2 gate cells` → 200 seeded spawns from `buildState({head: [8, 8], dir: [1, 0]})`: every instance has `fence.length + gate.length` in 5…7 (line) or equals the P0 `U` size, and `gate.length` in 1…2.
- `MEC-014-R3 a gate cell under the snake keeps warning and closes after the snake leaves` (state-level version of the block test).
- `MEC-014-R8 shield breaks one closed gate cell for the rest of the gate's life` → `gate.onBreak(s, 6, 10)`: `solidCauseAt(s, 6, 10)` null for every later ms.
- `MEC-014-R10 a gate spawn never removes the last escape (U trap)` → 100 seeded spawns from random fuzz states at L17: `escapeExists(before) ⇒ escapeExists(after)`.
- `MEC-014-R9 gate is introduced at L17 only`.
- `MEC-004-R5 terrain keeps its P0 sequence after moving to CycleCells` → existing terrain golden test unchanged (no new code, run it).
- [ ] **Step 2: Run** `npx vitest run tests/core/hazards/cycleCells.test.ts tests/core/hazards/gate.test.ts` → FAIL.
- [ ] **Step 3: Implement** `cyclePhase` (`m = t mod (down + warn + up)`; `< down` → down, `< down + warn` → warn, else up), `stepCycleCell` (target phase `up` ⇒ set `up = true, vis = 'up'` only when `!snakeOn(x, y)`, else `vis = 'warn'`; `down` / `warn` set `up = false`); refactor `terrain.ts` to call them with its P0 phases (terrain golden test must stay green, else stop: the refactor is wrong). Gate spawn: pick shape from `shapePool` (RNG `pick`), transform with P0 `transform`, origin tries like fence, `candidateValid(s, b, cells, { nearDist: b.fairness.nearHeadDist, wallCells: fenceCells })` (gate cells are not walls, MEC-014-R4), push instance, emit `hazardIncoming {family: 'gate'}`. Update: `t++`; `warn` → fence cells turn on when free (TimedCells rule) at `landWarnMs`; `live` → gate cells `stepCycleCell(c, phases, t - landWarnMs - c.delay, ctx.snakeOn)`; at `landWarnMs + lifeMs` → `crumble` (all cells off) → removed after `crumbleMs`.
- [ ] **Step 4: Run** `npx vitest run tests/core/hazards tests/core/fairness` → PASS; `npm run typecheck`; before commit `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(core): cycle-cell block and gates from level 17 (MEC-014)`

---

### Task 6: Spike family (L18)

**Files:**
- Create: `src/core/hazards/spike.ts`, `tests/core/hazards/spike.test.ts`
- Modify: `registry.ts`, `sim.ts`, `balance.ts`, `config/balance.json`, `familyFuzz.test.ts` (`spike: 18`), `queries.test.ts`

**Interfaces:**
- Consumes: Task 5 `cyclePhase`, `stepCycleCell`; `s.levelTimeMs`.
- Produces: `export const spike: HazardFamily` `{key: 'spike', cause: 'spike', capClass: 'small', maxActiveKey: 'spike.maxActive', breakable: true}`; state `s.families.spike = { groups: { id: number; t: number; lifeMs: number; cells: CycleCell[]; ending: boolean }[]; nextId: number }`; `solidAt` → cell `up`; `bfsWallAt` → false; `reservedAt` → all group cells; `onBreak` removes the cell.
- Beat rule (MEC-014-R6): every spike uses `cyclePhase(phases, s.levelTimeMs)` (global beat, delay 0). A new group's cells start `down`, and are not allowed to go `up` before they were shown for `spike.showMs` (1500) ≥ rule 1 — they stay `down` until then even if the beat says `up`. A group ends at the first beat `down` after `lifeMs` (no mid-`up` removal).
- Config (OQ-B2 defaults):
```json
"spike": { "downMs": 1800, "warnMs": 900, "upMs": 900, "showMs": 1500, "lifeMs": 12000, "lifeRandMs": 4000,
  "maxActive": 2, "tries": 40, "shapePool": ["single", "pairH", "pairV"],
  "shapes": { "single": [[0,0]], "pairH": [[0,0],[1,0]], "pairV": [[0,0],[0,1]] } }
```
Table: L18–30 add `spike: 2`. Note: `levelTimeMs` restarts at a level up; a group alive across a level up follows the new beat from 0 (it is in `down` at t = 0, so no cell pops without warning).

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/spike.test.ts
import { it, expect } from 'vitest';
import { spike } from '../../../src/core/hazards/spike';
import { solidCauseAt } from '../../../src/core/hazards/queries';
import { buildState } from '../../support/buildState';
import { testCtx } from '../../support/fakeFamily';
import { loadBalance } from '../../support/balance';

const group = (cells: [number, number][], t = 2000) =>
  ({ id: 1, t, lifeMs: 12000, ending: false, cells: cells.map(([x, y]) => ({ x, y, delay: 0, up: false, vis: 'down' as const })) });

it('MEC-014-R6 all spike groups pop up on the same global beat', () => {
  const b = loadBalance();
  const s = buildState({ head: [8, 3] });
  s.families.spike.groups.push(group([[2, 12]]), { ...group([[12, 12]]), id: 2 });
  const ctx = testCtx(s);
  s.levelTimeMs = b.spike.downMs + b.spike.warnMs;
  spike.update(s, ctx);
  expect(solidCauseAt(s, 2, 12)).toBe('spike');
  expect(solidCauseAt(s, 12, 12)).toBe('spike');
});
it('MEC-014-R6 a new group stays down until it was shown for showMs', () => {
  const b = loadBalance();
  const s = buildState({ head: [8, 3] });
  s.families.spike.groups.push(group([[2, 12]], 0));
  s.levelTimeMs = b.spike.downMs + b.spike.warnMs;     // beat says up
  spike.update(s, testCtx(s));
  expect(solidCauseAt(s, 2, 12)).toBeNull();
});
```
Also write:
- `MEC-014-R7 a spike under the snake keeps warning until the snake leaves`.
- `MEC-014-R8 shield breaks one up spike for the rest of the group's life`.
- `MEC-014-R6 a group ends on a down phase after its life` → advance past `lifeMs`: removed only when the beat is `down`.
- `MEC-014-R9 spike is introduced at L18 only`.
- [ ] **Step 2: Run** `npx vitest run tests/core/hazards/spike.test.ts` → FAIL.
- [ ] **Step 3: Implement** (spawn like mud with `candidateValid(..., { nearDist: b.fairness.nearHeadDist, wallCells: [] })` because spikes are not BFS walls; emit `hazardIncoming {family: 'spike'}`; update: `g.t++`, beat phase from `levelTimeMs`, `g.t < showMs` ⇒ treat as `down`, `stepCycleCell` per cell; `g.t ≥ lifeMs` ⇒ `ending = true`; ending and phase `down` ⇒ remove).
- [ ] **Step 4: Run** `npx vitest run tests/core/hazards/spike.test.ts tests/core/fairness`; `npm run typecheck`; before commit `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(core): spike traps on a global beat from level 18 (MEC-014)`

---

### Task 7: Patrol NPC family, cat and chicken (L21)

**Files:**
- Create: `src/core/hazards/npc.ts`, `tests/core/hazards/npc.test.ts`
- Modify: `registry.ts`, `sim.ts`, `balance.ts`, `config/balance.json`, `familyFuzz.test.ts` (`npc: 21`), `queries.test.ts`, `tests/support/fuzz.ts` (npc extraction, TR-B4)

**Interfaces:**
- Consumes: Task 3 mover (`'wait'` mode, ping-pong), P2a `candidateValid`, `HitCtx`.
- Produces: `export const npc: HazardFamily` `{key: 'npc', cause: 'cat', capClass: 'small', maxActiveKey: 'npc.maxActive', breakable: true}` with `causeAt` → the instance variant (`'cat' | 'chicken'`); state `s.families.npc = { npcs: { id: number; variant: 'cat' | 'chicken'; mover: MoverState }[]; nextId: number }`; `headHit` → `'mover'` on an NPC cell (head moving into the NPC); `bfsWallAt` → NPC current cell; `reservedAt` → whole route; `solidAt` → false (head entering is a `headHit`, P2 design §8); `onBreak` removes the NPC; `export function routeCells(start: Cell, len: number, bend: number | null, dir: Dir, turn: Dir): Cell[]` (straight when `bend` null, else L with the bend after `bend` cells).
- Config (OQ-B3 defaults):
```json
"npc": { "warnMs": 1500, "lifeMs": 15000, "lifeRandMs": 5000, "maxActive": 1, "tries": 40,
  "variants": { "cat": { "weight": 1, "cellMs": 400, "routeLen": [5, 8] }, "chicken": { "weight": 1, "cellMs": 220, "routeLen": [3, 5] } } }
```
Table: L21–30 add `npc: 2`.

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/npc.test.ts
import { it, expect } from 'vitest';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { newMover } from '../../../src/core/hazards/blocks/mover';
import { routeCells } from '../../../src/core/hazards/npc';
import { loadBalance, soloTable } from '../../support/balance';

const mk = (cells: { x: number; y: number }[], cellMs: number) => newMover(cells, 1500, cellMs, true, 15000);

it('MEC-015-R2 routeCells builds straight and L routes', () => {
  expect(routeCells({ x: 2, y: 2 }, 3, null, { x: 1, y: 0 }, { x: 0, y: 1 })).toEqual([{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }]);
  expect(routeCells({ x: 2, y: 2 }, 4, 2, { x: 1, y: 0 }, { x: 0, y: 1 })).toEqual([{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }]);
});
it('MEC-015-R5 an NPC waits for a body cell and the body is never hit', () => {
  const b = soloTable(loadBalance(), 'npc');
  const sim = createSimInternal(b, 21, { startLevel: 21 }, { directorEnabled: false, freezeSnake: true });
  const s = stateOf(sim);
  s.snake = [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }];  // body on (4,3)
  s.families.npc.npcs.push({ id: 1, variant: 'cat', mover: mk([2, 3, 4, 5, 6].map(x => ({ x, y: 3 })), 400) });
  sim.advance(1500 + 400 * 6);
  expect(s.status).toBe('playing');
  expect(s.families.npc.npcs[0]!.mover.path[s.families.npc.npcs[0]!.mover.pos]).toEqual({ x: 3, y: 3 });
});
it('MEC-015-R7 head moving into the NPC dies with the variant cause', () => {
  const b = soloTable(loadBalance(), 'npc');
  const sim = createSimInternal(b, 21, { startLevel: 21 }, { directorEnabled: false });
  const s = stateOf(sim);
  s.rampActive = false;
  const head = s.snake[0]!;
  const c = { x: head.x + 1, y: head.y };
  s.families.npc.npcs.push({ id: 1, variant: 'chicken', mover: { ...mk([c, { x: c.x, y: c.y + 1 }], 220), pos: 0, state: 'move', t: 0 } });
  sim.advance(sim.snapshot().tickMs);
  expect(sim.drainEvents().find(e => e.type === 'died')).toMatchObject({ cause: 'chicken' });
});
```
Also write:
- `MEC-015-R1 variants follow config weights` → 400 seeded spawns: both variants occur; with `chicken.weight = 0` only cats.
- `MEC-015-R3 route is telegraphed for 1500 ms before the first move and respects rule 2` → spawn from head (8,8) dir right: route cells have Manhattan ≥ 4 and none in (9…12, 8); `moverCell` null before 1500 ms.
- `MEC-015-R6 NPC leaves at a route end after its life` → removed after `lifeMs` + at most one leg.
- `MEC-015-R7 shield knocks the NPC away` → head into NPC with Shield: alive, NPC removed, `shieldBroke.family === 'npc'`.
- `MEC-015-R8 npc is introduced at L21 only`.
- [ ] **Step 2: Run** `npx vitest run tests/core/hazards/npc.test.ts` → FAIL.
- [ ] **Step 3: Implement** `npc.ts`. Spawn: variant by `pickWeighted` over config weights; `len = rng.int(max − min + 1) + min`; `bend = rng.next() < 0.5 ? null : 1 + rng.int(len − 2)`; start cell `rng.int(cols)`, `rng.int(rows)`, directions from `rng.int(4)`; `tries` attempts; valid when every route cell passes `candidateValid(s, b, route, { nearDist: b.fairness.nearHeadDist, wallCells: [route[0]] })` (rule 3 checked with the NPC start cell as a BFS wall) and no route cell is solid. Update: `stepMover(m, env, 'wait')` with `blocked = solidCauseAt ≠ null`, `bodyOn` = body cells (index > 0), `headAt` = head; `'enter-head'` ⇒ `ctx.hitHead('npc', x, y, 'mover', moverDir(m))`. The snake moving into the NPC cell is covered by `headHit` in the P2a snake-move collision (`resolveHeadCell`), which reports cause via `causeAt`. Fuzz extraction: route `warn` during the telegraph, NPC cell `mover` after.
- [ ] **Step 4: Run** `npx vitest run tests/core/hazards/npc.test.ts tests/core/fairness`; `npm run typecheck`; before commit `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(core): patrolling cat and chicken from level 21 (MEC-015)`

---

### Task 8: Mango-thief bird (L22)

**Files:**
- Create: `src/core/hazards/bird.ts`, `tests/core/hazards/bird.test.ts`
- Modify: `registry.ts`, `sim.ts`, `src/core/mango.ts` (export `placeMango(s, b, rng)` if not already public; steal path), `balance.ts`, `config/balance.json`, `familyFuzz.test.ts` (`bird: 22`), `queries.test.ts`

**Interfaces:**
- Consumes: P0/P1 BFS `bfsDistance(s, from, to): number | null` (from `grid.ts`; add it if P0 only exports `reachable`), `baseTickMs(s, b)` (`level.ts`), mango placement (`mango.ts`).
- Produces: `export const bird: HazardFamily` `{key: 'bird', cause: null, capClass: 'modifier', maxActiveKey: 'bird.maxActive', breakable: false}`; state `s.families.bird = { target: { x: number; y: number; leftMs: number } | null }`; never solid, lethal, BFS wall or reserved; `export function birdCanTarget(s: SimState, b: Balance): boolean` (MEC-016-R1).
- Config:
```json
"bird": { "shadowMs": 3000, "marginMs": 600, "maxActive": 1 }
```
Table: L22–30 add `bird: 2`. Director: `capClass: 'modifier'` is offered regardless of the small cap (P2a `directorOptions`).

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/bird.test.ts
import { it, expect } from 'vitest';
import { bird, birdCanTarget } from '../../../src/core/hazards/bird';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { buildState } from '../../support/buildState';
import { testCtx } from '../../support/fakeFamily';
import { loadBalance, soloTable } from '../../support/balance';

it('MEC-016-R1 bird targets only a regular mango reachable in time with enough rot time', () => {
  const b = loadBalance();
  const near = buildState({ head: [8, 8], dir: [1, 0], mango: [12, 8], level: 22 });
  near.mango!.leftMs = 6000;
  expect(birdCanTarget(near, b)).toBe(true);
  near.mango!.golden = true;
  expect(birdCanTarget(near, b)).toBe(false);
  const lowRot = buildState({ head: [8, 8], dir: [1, 0], mango: [12, 8], level: 22 });
  lowRot.mango!.leftMs = 2900;
  expect(birdCanTarget(lowRot, b)).toBe(false);
  const far = buildState({ head: [0, 0], dir: [1, 0], mango: [16, 16], level: 22 });   // 32 steps × 96 ms + 600 > 3000
  far.mango!.leftMs = 9000;
  expect(birdCanTarget(far, b)).toBe(false);
});
it('MEC-016-R3 an uneaten mango is taken at shadow end: no rock, counters unchanged, new mango placed', () => {
  const b = soloTable(loadBalance(), 'bird');
  const sim = createSimInternal(b, 22, { startLevel: 22 }, { directorEnabled: false, freezeSnake: true });
  const s = stateOf(sim);
  const before = { ...s.mango! }, eaten = s.eatenInLevel, score = s.score, rocks = s.families.rottenRock.length;
  s.mango!.leftMs = 9000;
  s.families.bird.target = { x: before.x, y: before.y, leftMs: b.bird.shadowMs };
  sim.advance(b.bird.shadowMs);
  const ev = sim.drainEvents();
  expect(ev.find(e => e.type === 'mangoStolen')).toMatchObject({ x: before.x, y: before.y });
  expect(s.eatenInLevel).toBe(eaten);
  expect(s.score).toBe(score);
  expect(s.families.rottenRock.length).toBe(rocks);
  expect(s.mango).not.toBeNull();
  expect(s.families.bird.target).toBeNull();
});
```
Also write:
- `MEC-016-R4 eating the target mango cancels the bird` → mango eaten during the shadow: no `mangoStolen`, `target` null.
- `MEC-016-R5 bird never kills and is never solid` → for all 289 cells `solidCauseAt`, `headHitAt`, `bfsWall` null/false with a target set.
- `MEC-016-R6 bird is outside the small cap, max 1` → small cap full: `directorOptions` still includes `bird`; with a target set `bird.spawn` returns `null`.
- `MEC-016-R2 rot timer keeps running under the shadow` → mango `leftMs` decreases 1 per ms while targeted.
- `MEC-016-R7 bird is introduced at L22 only`.
- [ ] **Step 2: Run** `npx vitest run tests/core/hazards/bird.test.ts` → FAIL.
- [ ] **Step 3: Implement**
```ts
export function birdCanTarget(s: SimState, b: Balance): boolean {     // MEC-016-R1
  const m = s.mango; if (!m || m.golden || s.families.bird.target) return false;
  const d = bfsDistance(s, s.snake[0]!, m); if (d === null) return false;
  return d * baseTickMs(s, b) + b.bird.marginMs <= b.bird.shadowMs && m.leftMs > b.bird.shadowMs;
}
export const bird: HazardFamily = {                                    // MEC-016
  key: 'bird', cause: null, capClass: 'modifier', maxActiveKey: 'bird.maxActive', breakable: false,
  spawn(s, ctx) {
    if (!birdCanTarget(s, ctx.balance)) return null;                   // TR-B6
    const m = s.mango!; s.families.bird.target = { x: m.x, y: m.y, leftMs: ctx.balance.bird.shadowMs };
    ctx.emit({ type: 'hazardIncoming', family: 'bird' });
    return [{ x: m.x, y: m.y }];
  },
  update(s, ctx) {                                                     // MEC-016-R3/R4
    const t = s.families.bird.target; if (!t) return;
    if (!s.mango || s.mango.x !== t.x || s.mango.y !== t.y) { s.families.bird.target = null; return; }
    if (--t.leftMs > 0) return;
    s.families.bird.target = null;
    ctx.emit({ type: 'mangoStolen', x: t.x, y: t.y });
    s.mango = null; placeMango(s, ctx.balance, ctx.rng);               // fresh timer, no rock, counters unchanged
  },
  count: s => (s.families.bird.target ? 1 : 0),
  solidAt: () => false, bfsWallAt: () => false, reservedAt: () => false,
  snapshot: s => s.families.bird.target,
};
```
`bird.spawn` returns the mango cell for the observer; the fuzz harness skips I1–I3/I5 for `capClass: 'modifier'` families and adds the family invariant `MEC-016-R1 bird target was reachable in time at spawn` (via `birdCanTarget(before)`). If `placeMango` defers (no free cell, MEC-003-R13), the P1 deferred-mango path applies unchanged.
- [ ] **Step 4: Run** `npx vitest run tests/core/hazards/bird.test.ts tests/core/fairness`; `npm run typecheck`; before commit `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(core): mango-thief bird from level 22 (MEC-016)`

---

### Task 9: AreaBlast block and timed bomb (L23)

**Files:**
- Create: `src/core/hazards/blocks/areaBlast.ts`, `src/core/hazards/bomb.ts`, `tests/core/hazards/bomb.test.ts`
- Modify: `registry.ts`, `sim.ts`, `balance.ts`, `config/balance.json`, `familyFuzz.test.ts` (`bomb: 23`), `queries.test.ts`, `tests/support/fuzz.ts` (blast extraction)

**Interfaces:**
- Consumes: P2a `HitCtx`, `applyHeadHit` (Shield absorb, L7), `candidateValid`, `baseTickMs`.
- Produces:
```ts
// blocks/areaBlast.ts — MEC-004-R5
export function plusArea(cx: number, cy: number, arm: number, cols: number, rows: number): Cell[];   // centre first, clipped
export interface BlastState { area: Cell[]; countdownMs: number; activeMs: number; phase: 'count' | 'active' | 'done' }
export function stepBlast(b: BlastState): 'activated' | 'keep' | 'done';
// bomb.ts
export interface BombInstance { id: number; x: number; y: number; t: number; warnMs: number; landed: boolean; blast: BlastState | null }
export const bomb: HazardFamily;   // {key:'bomb', cause:'bomb', capClass:'small', maxActiveKey:'bomb.maxActive', breakable:true}
```
Bomb lifecycle (MEC-017-R1…R3): `warn` (`bomb.warnMs`, cell passable) → lands when no snake cell is on it (TimedCells rule) → solid bomb cell with `blast = {area: plusArea(x, y, bomb.arm, …), countdownMs: bomb.countdownMs, activeMs: baseTickMs(s, b) (TR-B7), phase: 'count'}` → at 0 the bomb cell vanishes and the area is `active` for `activeMs`: each ms, if the head is in the area ⇒ `ctx.hitHead('bomb', hx, hy, 'area', s.dir)` once per blast → `done` ⇒ removed. Body cells are ignored. `solidAt` → landed bomb cell during `count`; `headHit` → `'area'` for area cells while `active` (snake moving into the area during the active tick); `bfsWallAt` → bomb cell (warn and count); `reservedAt` → bomb cell + area (any state); `onBreak(x, y)` on the bomb cell during `count` ⇒ defused (removed, no blast).
- Config:
```json
"bomb": { "warnMs": 1200, "countdownMs": 3000, "arm": 2, "maxActive": 1, "tries": 40 }
```
Table: L23–30 add `bomb: 2`.

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/bomb.test.ts
import { it, expect } from 'vitest';
import { plusArea } from '../../../src/core/hazards/blocks/areaBlast';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { loadBalance, soloTable } from '../../support/balance';

const landed = (b: ReturnType<typeof loadBalance>, x: number, y: number, countdownMs: number, activeMs: number) => ({
  id: 1, x, y, t: 0, warnMs: b.bomb.warnMs, landed: true,
  blast: { area: plusArea(x, y, b.bomb.arm, 17, 17), countdownMs, activeMs, phase: 'count' as const } });

it('MEC-017-R2 plus area has arm 2 and is clipped to the board', () => {
  expect(plusArea(8, 8, 2, 17, 17)).toHaveLength(9);
  expect(plusArea(0, 0, 2, 17, 17)).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }]);
});
it('MEC-017-R3 head in the area when the blast fires dies with cause bomb; body in the area is safe', () => {
  const b = soloTable(loadBalance(), 'bomb');
  const sim = createSimInternal(b, 23, { startLevel: 23 }, { directorEnabled: false, freezeSnake: true });
  const s = stateOf(sim);
  s.snake = [{ x: 10, y: 8 }, { x: 11, y: 8 }, { x: 12, y: 8 }, { x: 13, y: 8 }];
  s.families.bomb.bombs.push(landed(b, 8, 8, 10, 96));
  sim.advance(10);
  expect(sim.drainEvents().find(e => e.type === 'died')).toMatchObject({ cause: 'bomb', x: 10, y: 8 });
  const sim2 = createSimInternal(b, 23, { startLevel: 23 }, { directorEnabled: false, freezeSnake: true });
  const s2 = stateOf(sim2);
  s2.snake = [{ x: 8, y: 12 }, { x: 8, y: 11 }, { x: 8, y: 10 }, { x: 8, y: 9 }];   // head outside, body inside
  s2.families.bomb.bombs.push(landed(b, 8, 6, 10, 96));
  sim2.advance(200);
  expect(s2.status).toBe('playing');
});
it('MEC-017-R4 shield absorbs one blast without bonk or rubble; shield on the bomb cell defuses it', () => {
  const b = soloTable(loadBalance(), 'bomb');
  const sim = createSimInternal(b, 23, { startLevel: 23 }, { directorEnabled: false, freezeSnake: true });
  const s = stateOf(sim);
  s.snake = [{ x: 9, y: 8 }, { x: 10, y: 8 }, { x: 11, y: 8 }, { x: 12, y: 8 }];
  s.shield = { leftMs: 5000 };
  s.families.bomb.bombs.push(landed(b, 8, 8, 10, 96));
  sim.advance(200);
  expect(s.status).toBe('playing');
  expect(s.shield).toBeNull();
  expect(s.families.rubble).toEqual([]);
});
```
Also write:
- `MEC-017-R1 bomb warns at least 900 ms and lands only when no snake cell is on it`.
- `MEC-017-R2 countdown lasts 3000 ms and the area is reserved during it` → `reservedByFamilies` true for all 9 cells during `count`.
- `MEC-017-R3 blast is active for exactly one base tick at activation, also during slow-mo` → Slow-mo on at L23: active phase lasts `baseTickMs` (96) ms.
- `MEC-017-R4 shield breaking the bomb cell defuses it (no bombBlast event)`.
- `MEC-017-R5 a blast does not affect other bombs, hazards, mangoes or orbs` → two bombs with overlapping areas: second keeps its countdown; mango in area unchanged.
- `MEC-017-R6 bomb is introduced at L23 only`.
- [ ] **Step 2: Run** `npx vitest run tests/core/hazards/bomb.test.ts` → FAIL.
- [ ] **Step 3: Implement** `areaBlast.ts` (`plusArea` order: `centre, +x 1..arm, −x 1..arm, +y 1..arm, −y 1..arm`, filtered by bounds; the corner test expectation follows this order) and `bomb.ts` per the lifecycle above. Spawn: like rock `single` with `candidateValid(s, b, [cell], { nearDist: b.fairness.nearHeadDist, wallCells: [cell] })`; the area is exempt from rule 2 (P2 design §7) but must not be reserved at spawn (`extraFree: area`). Emit `bombBlast {x, y, cells}` at activation.
- [ ] **Step 4: Run** `npx vitest run tests/core/hazards/bomb.test.ts tests/core/fairness`; `npm run typecheck`; before commit `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(core): area-blast block and timed bombs from level 23 (MEC-017)`

---

### Task 10: Greybox rendering, banners and death texts

**Files:**
- Create: `src/game/render/movers.ts`, `src/game/render/cycles.ts`, `src/game/render/blasts.ts`
- Modify: `src/game/scenes/GameScene.ts` (call the three draw functions), `src/game/text.ts`, `src/core/sim.ts` snapshot (`families` views for the six keys), `tests/game/text.test.ts` (keys exist), `docs/CODEMAP.md`

**Interfaces:**
- Consumes: snapshot `families.coconut | gate | spike | npc | bird | bomb` (Tasks 4–9 `snapshot` members).
- Produces:
```ts
export function drawMovers(g: Phaser.GameObjects.Graphics, snap: SimSnapshot, cellPx: number, timeMs: number, reducedMotion: boolean): void;
export function drawCycles(g: Phaser.GameObjects.Graphics, snap: SimSnapshot, cellPx: number, timeMs: number, reducedMotion: boolean): void;
export function drawBlasts(g: Phaser.GameObjects.Graphics, snap: SimSnapshot, cellPx: number, timeMs: number, reducedMotion: boolean): void;
```
Greybox rules (P2 design §18): warning = blink 250 ms + icon + shape, never color only; reduced motion = no blink, solid outline. Coconut: lane highlight with arrows in roll direction, brown circle while rolling. Gate: fence cells as P0 fence; gate cell open = dashed bar, warn = blinking bar + lock icon, closed = solid bar. Spike: down = small dots, warn = blinking triangles, up = solid triangles. NPC: route highlight with arrows, cat = grey square with ears, chicken = white circle with beak. Bird: shadow ellipse on the target mango, shrinking with `leftMs / shadowMs`. Bomb: warn like rock; landed = black circle + countdown digit `ceil(leftMs / 1000)`; area outline dashed; active = filled area for the tick.
- Texts (OQ-B6, owner review):
```ts
'banner.new.coconut': 'Rolling coconuts! Watch the lanes', 'banner.new.gate': 'Gates open and close',
'banner.new.spike': 'Spikes pop up on the beat', 'banner.new.npc': 'Cats and chickens on patrol',
'banner.new.bird': 'A bird wants your mango!', 'banner.new.bomb': 'Bombs! Stay out of the cross',
'death.coconut': 'Hit by a coconut.', 'death.gate': 'Crushed by a gate.', 'death.spike': 'Spiked.',
'death.cat': 'Ran into the cat.', 'death.chicken': 'Ran into the chicken.', 'death.bomb': 'Caught in the blast.',
'toast.mangoStolen': 'The bird took your mango!',
```

- [ ] **Step 1: Write the failing test**
```ts
// tests/game/text.test.ts (add)
it('MEC-003 §8 every P2b family has a banner and every P2b cause has a death text', () => {
  for (const k of ['coconut', 'gate', 'spike', 'npc', 'bird', 'bomb']) expect(t(`banner.new.${k}`)).not.toMatch(/^banner\./);
  for (const c of ['coconut', 'gate', 'spike', 'cat', 'chicken', 'bomb']) expect(t(`death.${c}`)).not.toMatch(/^death\./);
});
```
- [ ] **Step 2: Run** `npx vitest run tests/game/text.test.ts` → FAIL.
- [ ] **Step 3: Implement** texts, snapshot views, the three draw modules, `GameScene` calls (after tiles, before snake), `mangoStolen` toast in the HUD.
- [ ] **Step 4: Run** `npx vitest run tests/game`; `npm run typecheck`; `npm run dev`, debug start levels 16, 17, 18, 21, 22, 23: each family visible, warning blinks, no console errors. Before commit `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(game): greybox visuals and texts for P2b families`

---

### Task 11: P2b verification (fuzz, fairness per family, bot report, browser QA)

**Files:**
- Modify: `tests/core/fairness/familyFuzz.test.ts` (INTRO map complete), `tools/bot/botConfig.ts` (`levels: { from: 16, to: 25 }` for this run), `docs/PLAYTEST.md` (P2b bot report entry), `docs/STATUS.md`, `CHANGELOG.md`, `docs/README.md` (MEC-013…017 status Implemented)

**Interfaces:**
- Consumes: every task above; P2a `runFamilyFuzz`, `escapeExists`, `runLevel`, `formatReport`.
- Produces: green fairness layers 1–2 for `coconut, gate, spike, npc, bird, bomb`; bot report L16–25.

- [ ] **Step 1: Fairness test per family** — final `INTRO` map and one escape test per family:
```ts
// tests/core/fairness/familyFuzz.test.ts
const INTRO = { rock: 1, fence: 6, mud: 7, terrain: 11, ice: 13, coconut: 16, gate: 17, spike: 18,
  npc: 21, bird: 22, bomb: 23, maze: 26 } as const;
```
```ts
// tests/core/fairness/p2bEscape.test.ts
import { describe, it, expect } from 'vitest';
import { runFamilyFuzz } from '../../support/fuzz';
const P2B = { coconut: 16, gate: 17, spike: 18, npc: 21, bird: 22, bomb: 23 } as const;
describe('MEC-004-R18 escape check per P2b family', () => {
  for (const [family, startLevel] of Object.entries(P2B))
    it(`MEC-004-R18 no ${family} spawn removes the last escape`, () => {
      expect(runFamilyFuzz({ family: family as never, mode: 'solo', startLevel, seeds: 3, durationMs: 30000, escape: 'all' })).toEqual([]);
    }, 10000);
});
```
Run `npx vitest run tests/core/fairness` → PASS.
- [ ] **Step 2: Full suites** — `npm test` (PASS; if > 10 s budget is exceeded by the new smoke samples, lower P2b smoke to 2 seeds × 20 s and record it in `docs/DECISIONS.md`), then `npm run typecheck` (PASS), then `npm run test:fuzz` (200 seeds × 120 s per configuration, solo + full, intro level and L30; PASS). Any fuzz failure is a fairness bug: `systematic-debugging`, fix the family, never relax an invariant without a lead decision.
- [ ] **Step 3: Bot report** — `npm run bot:report` with levels 16–25 → paste the markdown into `docs/PLAYTEST.md` under "P2b bot report"; triage every WARN line in one line each (warning only, P2-D6). Expected: every level L16–25 cleared by ≥ 1 seed.
- [ ] **Step 4: agy browser QA checklist** (delegate to agy via `delegate-workers`; phone viewport 390 × 844 and desktop 1280 × 800; `npm run dev`; debug start level picker):
  1. Start L16: banner "Rolling coconuts!" shows; a lane highlights with arrows ≥ 1.5 s before the coconut rolls; the coconut never starts in the head's row/column.
  2. Let a coconut roll into the snake body: it shatters, no death.
  3. Start L17: a gate line/U appears; gate cells blink before closing; the snake can pass an open gate; standing in the gate keeps it warning.
  4. Start L18: spikes in all groups pop on the same beat; each pop is preceded by a visible warning.
  5. Start L21: an NPC route highlights for 1.5 s; the NPC stops in front of the body instead of walking into it; moving the head into it shows "Ran into the cat./chicken."
  6. Start L22: a shadow appears on the mango only when it is close; not eating it shows the toast and a new mango, no rock, quota unchanged.
  7. Start L23: bomb warning, then countdown digits 3-2-1 and a dashed plus outline; body in the area survives, head in the area dies with "Caught in the blast."
  8. With Shield equipped: break a coconut, a closed gate cell, an NPC; absorb a blast (Shield gone, no rubble).
  9. Level up while a coconut rolls or a bomb counts down: it continues and can still hit (flow B, TR-B1).
  10. Reduced motion on: no blinking, warnings still readable by shape/icon.
  11. Both viewports: nothing clipped, HUD readable, devtools console has no errors or warnings.
  agy reports pass/fail per item with screenshots; lead triages failures (code → implementer, test → agy, spec gap → owner).
- [ ] **Step 5: Docs and commit** — STATUS (Now: P2b done; Next: P2c plan), CHANGELOG line, README statuses. Commit `test: P2b fairness verification and bot report`.

---

## Self-review (writing-plans)

| Spec item (P2 design / MEC) | Task |
|---|---|
| §3 P2b content: Mover block | 3 |
| §3 coconut (MEC-013) | 1, 4 |
| §3 cycle block reuse, gates, spikes (MEC-014) | 1, 5, 6 |
| §3 cat/chicken (MEC-015) | 1, 7 |
| §3 bird (MEC-016) | 1, 8 |
| §3 area-blast block, bombs (MEC-017) | 1, 9 |
| §3 exit: layers 1–2 per new family; bot report L16–25 | 11 |
| §6 registry order coconut, gate, spike, npc, bird, bomb | 4–9 (`queries.test.ts` R1) |
| §6/§7 head-only lethality, rule 4 telegraph | 3, 4, 7, 9 (TR-B3, TR-B4) |
| §8 BFS / reserved table rows | 4–9 |
| §9 Shield / Slow-mo table | 4, 5, 6, 7, 9 (TR-B7) |
| §11 introductions L16/17/18/21/22/23, weight 2 | 4–9 |
| §14 FamilyKey, CauseKey, moverHit, bombBlast, mangoStolen, family snapshots | 2, 10 |
| §18 greybox feedback, banners | 10 |
| §20 items 2 (BFS from registry), 6 (banners), 10 (breakable flag), 11 (Shield on headHit/area) | 4–10 |
| Flow B: no onLevelEnd, obstacles survive level up | TR-B1, 11 Step 4 item 9 |
| Verification: fuzz, fairness per family, agy QA | 11 |

Type names used across tasks: `MoverState`, `newMover`, `stepMover`, `moverCell`, `moverDir`, `CyclePhases`, `CycleCell`, `cyclePhase`, `stepCycleCell`, `plusArea`, `BlastState`, `stepBlast`, `laneCandidates`, `routeCells`, `birdCanTarget`, `causeAt`. Not covered here (P2c): shrink (MEC-018), challenge rows, per-biome tuning, board-size check, human playtest.
