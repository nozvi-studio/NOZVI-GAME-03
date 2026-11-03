# P2 Content — design (umbrella for P2a / P2b / P2c)

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P2 · Date: 2026-11-03
> Scope source: GDD §11 row "P2 Content" (new obstacle families of GDD §5.4, challenge levels, fairness checks per family, director tuning per biome). Out of scope: art, meta.
> Exact rules live in the MEC specs. This document fixes the decisions and the split; it does not repeat rules that a MEC file owns.

## 1. Goal and exit criteria
Add the 9 new obstacle families of GDD §5.4 to the 30-level structure of P1, make every fifth level a themed challenge level, and prove fairness per family.

P2 exit (GDD §11, checked at the end of P2c):
1. All 30 levels are playable to the end (bot report + human playtest).
2. No death cause > 40% in the human playtest (rule scope in §15).
3. Fairness tests pass for every family (MEC-004-R17 layers 1 and 2).
4. `npm test`, `npm run typecheck` pass; the game starts with no console errors.

Sub-phase exits are in §3.

## 2. Decisions taken (lead, delegated by owner, 2026-11-03)
| # | Decision | Rejected alternatives |
|---|---|---|
| P2-D1 | Three sub-phases P2a / P2b / P2c, each with its own plan; P2b/P2c family specs (MEC-013…018) and plans are written at P2a exit | One P2 spec + plan; two sub-phases |
| P2-D2 | Hazard families are modules on one registry (P0 design §3 `HazardFamily`, minimal form in P0). P2a extends the interface with `tileAt`, `headHit`, `areaHit`, `onBreak` and mover/blast hooks | Cell-layer engine; per-family branches in collision/BFS code |
| P2-D3 | Sim state is plain JSON-serializable data with `sim.clone()` (from P0); P2 fairness tooling and the bot build on it | Re-simulating from seed + inputs |
| P2-D4 | Movers and blasts kill only through the head; they never kill through the body | Any snake cell lethal; per-family choice |
| P2-D5 | Shield/Slow-mo table of §9; GDD §5.3 rule 1 "≥ 4 ticks" is measured at the level's base tick; mud × Slow-mo multiply; Shield absorbs one blast on the head | Measuring at the slowed tick |
| P2-D6 | Fairness proven in 3 layers: per-family invariant fuzz, escape check, bot death-cause report. The bot report is a warning, not a CI gate; the human playtest gates the 40% rule | Fuzz only; bot as hard CI gate |
| P2-D7 | Specs: MEC-004 core + MEC-012…018 grouped by mechanic (§10) | One MEC-004 file; one file per family |
| P2-D8 | Board stays 17 × 17; measured in P2c (§17); escalate only on evidence | Grow the board now |
| P2-D9 | Introduction schedule §11 (one family per level). GDD §5.1 "1–2 families per biome" conflicts with the GDD §5.1 table (biome 4: 3, biome 5: 3); the table is followed (lead decision, owner FYI, GDD not edited) | Cutting families from biomes 4–5 |

## 3. Split and order
| Sub-phase | Content | Specs | Exit |
|---|---|---|---|
| **P2a** Framework + tools + biomes 2–3 | Interface extension, generic collision/step pipeline, director generalization, fairness rule 3 for all families, `died.context`, escape check, per-family fuzz harness, bot + report, ground-tile building block, mud (L7), ice (L13) | MEC-004, MEC-012 | Layers 1–2 pass for the director families rock, fence, maze, terrain, mud, ice (full-table runs also cover rotten rocks); bot report for L1–15 shows every level cleared by ≥ 1 seed (warning only otherwise) |
| **P2b** Biomes 4–5 families | Mover block (coconut, cat/chicken), cycle block reuse (gates, spikes), area-blast block (bombs), mango modifier (bird) | MEC-013…017 | Layers 1–2 pass for each new family; bot report L16–25 |
| **P2c** Biome 6 + challenge + tuning | Shrinking board, challenge rows and multipliers, per-biome weights, board-size measurement, human playtest | MEC-018 + config/MEC-003 data | GDD P2 exit (§1) |

Dependencies: P2b needs the P2a pipeline hooks and harness; P2c needs every family. Precondition for P2a: the P1 exit criteria passed.

## 4. Family framework
- One registry (`src/core/hazards/registry.ts`) lists every family in a fixed order (§6). Each family is a stateless module whose state lives in `SimState.families[key]` (JSON data, so `sim.clone()` copies it).
- P0 minimal members: `key`, `spawn`, `update`, `snapshot`, `solidAt`, `bfsWallAt`, `reservedAt`, `breakable`.
- P2a adds (all optional, a missing member means "never"): `cause` (the `CauseKey` of its solid cells), `capClass` (`small | big | modifier | none`), `maxActiveKey`, `tileAt` (ground tile kind), `headHit` (`'mover' | 'area' | null` for a head moving into the cell), `onBreak` (Shield removes one cell), `onLevelEnd` (MEC-003-R7 end state). A mover entering the head cell or a blast activating on the head during `update` reports it through the step context callback `ctx.hitHead(family, x, y, kind, dir)`.
- Composite queries (`solidCauseAt`, `bfsWallAt`, `reservedAt`, `tileAt`) loop over the registry; nothing else in the core asks a family directly. Exact contract: MEC-004-R1…R4.

## 5. Building blocks
Small pure helpers that families compose (MEC-004-R5):
| Block | Behavior | Used by |
|---|---|---|
| TimedCells | warn → solid → crumble; a cell turns solid only when no snake cell is on it (P0 lifecycle) | rock, fence, maze, bomb body, shrink ring |
| CycleCells | per-cell cycle down → warn → up with delay; waits for the snake (P0 terrain cycle, parameterized) | terrain, gate cells, spikes |
| GroundTiles | warn → active → fade; never solid; waits for the snake; gives a tile kind | mud, ice |
| Mover (P2b) | telegraphed path, then 1 cell per `cellMs`; waits for body cells; head-only hit | coconut, cat/chicken |
| AreaBlast (P2b) | telegraphed area during a countdown, then active for one base tick; head-only hit | bomb |

## 6. Step order and collision
- 1 ms step order: `docs/ARCHITECTURE.md` "Sim step order" is the single source. P2a amends it there so per-family obstacle updates become "every registry family's `update` in registry order" and the speed update uses the ground-tile factor (MEC-004-R7).
- Registry order: `rock, fence, maze, terrain, rottenRock, snipWall, rubble` (P0/P1) → `mud, ice` (P2a) → `coconut, gate, spike, npc, bird, bomb` (P2b) → `shrink` (P2c).
- Snake-move collision: `wall` → `self` → solid-cell stage (`solidCauseAt`, then `headHit`), Shield at that stage only (MEC-004-R6).
- Non-move hits: a mover entering the head cell or a blast activating on the head kills during that family's `update`, unless Shield (MEC-004-R8). With 1 ms steps processed in a fixed order, a mover and the head cannot pass through each other unseen.
- Head-only lethality (P2-D4): movers wait for body cells; blasts ignore the body.

## 7. Fairness model
GDD §5.3 rules as MEC-004 states them (R9–R14):
1. Warn ≥ `max(fairness.minWarnMs, fairness.minWarnTicks × speed.startMs)` (900 ms; "4 ticks at the base tick", P2-D5), validated by `parseBalance`.
2. New cells never in `nearHead(d = 4)` or the 4-cell front lane (stricter than GDD's 3). Exempt: snip wall and rubble (MEC-006), shrink ring cells (they wait instead, MEC-018), blast area (head-only, 3 s countdown; the bomb cell itself is not exempt).
3. **Post-spawn reachability for every family:** a spawn that makes a reachable regular mango unreachable is rejected (new in P2a; P0/P1 did not check it).
4. Movers telegraph their whole path for ≥ warn before the first move.
5. One new family per level with a tooltip (MEC-003-R16; schedule §11).
GDD §5.4 "Never use" list is binding (MEC-004-R14).

## 8. BFS and placement rules (summary; owners in brackets)
| Family | Solid / lethal | BFS wall | Reserved | Notes |
|---|---|---|---|---|
| rock, fence, maze, rotten rock, snip wall, rubble | solid state | every state | every state | P0/P1 |
| terrain | `up` | no | every state | P0 |
| mud [MEC-012] | never | no | every state | tick × 2 while the head is on active mud |
| ice [MEC-012] | never | ice cells: yes | ice cells + 4-neighbour ring | no turning while the head is on active ice |
| coconut [MEC-013] | head-only | no | lane while warning/rolling (other lanes only) | shatters on body or solid |
| gate [MEC-014] | closed gate cells; fence cells as fence | fence cells yes, gate cells no | every state | |
| spike [MEC-014] | `up` | no | every state | global beat |
| npc [MEC-015] | head entering NPC cell | NPC cell | route | waits for body/solid |
| bird [MEC-016] | never | no | no | targets the regular mango |
| bomb [MEC-017] | bomb cell solid; blast head-only | bomb cell | bomb cell + area | |
| shrink [MEC-018] | ring cells when closed | every state | every state | cause `shrink`, not breakable |

## 9. Skill interactions (P2-D5)
| Family | Shield | Slow-mo |
|---|---|---|
| mud, ice, bird | not applicable | timers real time; mud × Slow-mo multiply (`round(base × 1.6 × 2)`) |
| coconut | breakable (coconut removed) | real time |
| gate (closed cell), spike (`up`) | breakable (cell removed for the rest of the family's life) | real time |
| npc | breakable (knocked away, removed) | real time |
| bomb | bomb cell breakable during countdown (defused, no blast); an active blast on the head is absorbed once (Shield consumed, no bonk, no rubble) | real time |
| shrink ring | not breakable (edge-like) | real time |
Rubble after a break follows MEC-006-R28 for every breakable family. The breakable list becomes the registry `breakable` flag (change to MEC-006-R24, §20).

## 10. Family summaries (fixed decisions; exact rules in the MEC spec)
- **MEC-012 Ground tiles (P2a).** Mud: patches of 2–5 cells, warn 1500 → active 9–12 s → fade; head on active mud ⇒ effective tick × 2. Ice: line 2–4 or 2 × 2 patches, warn 1500 → active 10–14 s → melt; while the head is on active ice the turn queue is not consumed (turns stay queued and apply after the slide); the 4-neighbour ring of a patch must be in bounds and free at spawn and stays reserved, so every slide exits onto a free cell. Both small-cap, max 2 active each, never under the snake when activating.
- **MEC-013 Rolling coconuts (P2b).** Lane = a full row or column that is not the head's row/column and does not contain a front-lane cell; warn 1500 with the lane and roll direction shown; then 1 cell per `coconut.cellMs` (90) from one edge; stops and shatters on a solid cell or a body cell; head contact ⇒ `coconut` (Shield breaks it). Mangoes and orbs are not affected. Small cap, max 2, one coconut per lane.
- **MEC-014 Gates & spikes (P2b).** Gate: a fence line (5–7) or U shape whose 1–2 middle/mouth cells are CycleCells (open → warn 900 → closed, closed shorter than open); cause `gate`. Spikes: 1–2 cell groups, all spikes share one beat from `levelTimeMs` (down → warn 900 → up), cause `spike`. Both wait for the snake; escape check covers U-trap gates.
- **MEC-015 Patrol NPCs (P2b).** One family `npc`, variants cat (slow, route 5–8) and chicken (fast, route 3–5) chosen by config weights; straight or L route of free cells telegraphed 1500 ms; ping-pong for 15–20 s, then leaves. The NPC waits if its next cell holds a snake cell or a solid cell, so only the head entering it kills (`cat` / `chicken`).
- **MEC-016 Mango-thief bird (P2b).** Modifier family outside the cap, max 1. Targets the regular non-golden mango only if `BFS distance × base tick + bird.marginMs ≤ bird.shadowMs` (3000) and the rot time left > `shadowMs`. Uneaten at shadow end ⇒ mango taken: no rock, counters unchanged, next mango placed, event `mangoStolen`. Never lethal.
- **MEC-017 Timed bombs (P2b).** Bomb lands like a rock (warn ≥ 900), then a solid bomb cell counts down 3000 ms with the plus-shaped area (arm 2, clipped to the board) shown; blast active for one base tick; head in the area ⇒ `bomb` (Shield absorbs once). No chain reactions; blasts do not affect other objects or the body.
- **MEC-018 Shrinking board (P2c).** Big event (exclusive with maze and terrain). The outer ring warns 2000 ms, closes for `shrink.closedMs` (6000), then reopens through crumble. A ring cell closes only when no snake cell is on it and it is outside `nearHead`; until then it keeps warning. At warn start the mango on the ring is displaced (new placement, fresh timer, no rock) and orbs/rain mangoes on it are removed (`displaced`). Starts only when no coconut is rolling and no NPC route touches the ring. Cause `shrink`, not breakable.

## 11. Level table and introductions
One new family per level (MEC-003-R16). P1 rows stay as they are except for the additions below; P2c sets final weights.
| Level | Introduces | Phase |
|---|---|---|
| 1 / 6 / 11 / 12 / 26 | rock / fence / terrain / rotten rock / maze | P1 |
| 7 | mud | P2a |
| 13 | ice | P2a |
| 16 / 17 / 18 | coconut / gate / spike | P2b |
| 21 / 22 / 23 | npc (cat & chicken) / bird / bomb | P2b |
| 27 | shrink | P2c |
P2a rows: L7–30 add `mud 2`; L13–30 add `ice 2`. P2b/P2c rows add each family from its level with weight 2 until P2c tuning.

## 12. Challenge levels (P2c)
- Config only for the multipliers: `director.challengeIntervalFactor = 0.8`, `challengeCapBonus = 2` (MEC-003-R4).
- Composition = own table rows for L5, 10, 15, 20, 25, 30 (MEC-003-R14 already allows any row split; no schema change). Starting weights: L5 "Rock rain" rock 5 (all shapes) · L10 "Fence field" fence 4, mud 2, rock 2 · L15 "Thin ice" ice 4, terrain 2, rock 2, fence 1 · L20 "Avalanche" coconut 4, rock 3, spike 2, gate 1 · L25 "Pet chaos" npc 4, bomb 2, bird 2, rock 1 · L30 "Final storm" every family 2.
- A challenge row never introduces a family (validated: introduction levels in §11 are not multiples of 5).
- Banners `banner.challenge.{5…30}` and the HUD marker turn on (MEC-003 §8).

## 13. Per-biome director tuning (P2c)
Weights per row are the only tuning lever besides family parameters. Targets: each biome feels harder than the previous one at checkpoint speed (GDD §5.5); no family cause > 40% (§15). Big events (maze, terrain, shrink) stay mutually exclusive, max 1 active. Tuning changes are config-only PRs with the bot report attached.

## 14. Core API changes (P2 total)
- `FamilyKey` adds `mud | ice | coconut | gate | spike | npc | bird | bomb | shrink`.
- `CauseKey` adds `coconut | gate | spike | cat | chicken | bomb | shrink` (mud, ice, bird never kill).
- `died` adds `context?: 'ice' | 'mud'` (MEC-004-R15).
- `SimSnapshot` adds `tiles` and `headTile` (MEC-012), and per-family snapshots for P2b/P2c families (`families[key]`).
- `SimEvent`: `hazardIncoming.family` widens to `FamilyKey`; P2b adds `moverHit`, `bombBlast`, `mangoStolen`; P2c adds `mangoDisplaced`.
- Test-only (not in `index.ts`): `escapeExists(state, balance)` and the fuzz harness.

## 15. Test strategy
- **Layer 1, per-family invariant fuzz** (MEC-004-R17): each family alone (table override) and all enabled families together; a smoke sample in `npm test` (3 seeds × 30 s per family, suite < 10 s), 200 seeds × 120 s per configuration in `npm run test:fuzz`. Shared invariants: no cell becomes solid/active under the snake; new cells respect rule 2 (exemptions listed); warn ≥ rule 1; rule 3 holds after every spawn; no placement on a reserved cell; determinism across `advance` chunking. Family-specific invariants live in each MEC spec.
- **Layer 2, escape check:** a spawn never turns a state with an escape into one without (time-expanded BFS, horizon `fairness.escapeHorizonMs`). Sampled in `npm test`, every spawn in `test:fuzz`.
- **Layer 3, bot report:** §16. Warning only.
- **40% rule scope:** death causes are counted by cause key (family `cause`, not family key): `rock`, `fence`, `maze`, `ground` (terrain), `rotten`, `snipWall`, `rubble`, and the P2 family causes through `shrink`. Each must be ≤ 40% of all deaths in the playtest. `wall` and `self` are reported separately, split by `died.context`; a share > 40% triggers a tuning review, not an exit failure.

## 16. Bot and death-cause report
- `tools/bot/` (pure TS, imports `src/core` only through `index.ts`, plus the test-only escape helper). No new dependency; runs through Vitest with `npm run bot:report` (mode `bot`; the test is skipped in other modes).
- Policy per snake step: build a solid/tile timeline for the next `bot.horizonSteps` steps from a `sim.clone()` (director off), discard moves with no escape, then pick the move with the shortest time-aware path to the regular mango, tie → keep straight. Uses no skills (documented limitation).
- Runs: every level L1…30 (P2a: L1…15) × `bot.seeds` (20) starting at that level, until level clear, death or `bot.timeoutMs` (180000).
- Output (stdout, markdown): clear rate per level; deaths per cause per biome with context; WARN lines for clear rate 0 on any level and for any family death cause key (incl. `ground` for terrain; `wall`/`self` excluded) > 40% in a biome. The owner copies the output into `docs/PLAYTEST.md` when needed.

## 17. Board-size check (P2c)
Metric from bot runs at L25 and L30: median BFS-reachable free cells and clear rate. Escalate to the owner only if the median reachable area is < 40% of the board or the L26–30 clear rate is < half the L21–25 clear rate, after weight tuning. Otherwise 17 × 17 stays (GDD §7).

## 18. Greybox feedback
Every family: warning = blink + icon + shape, never color only (GDD §3). First introduction: `banner.new.{family}` one-line tooltip. Movers: lane/route highlight with direction arrows. Bomb: digit countdown on the cell + area outline. Shrink: ring outline blink. Death text adds a context suffix for `ice`/`mud`. Sounds reuse P0/P1 synth tones (new tones are P3).

## 19. Out of scope
Art and juice beyond greybox (P3), meta (P4), bot skill use, any GDD Parking-lot idea (wrap zones, portals, banana peel, lawnmower…), board-size change without owner approval.

## 20. P2 changes to P1 specs (applied by the PR that implements them, with lead approval)
1. **MEC-002-R2** reserved list: snake, regular mango, orbs, rain mangoes, plus every cell where a registered family's `reservedAt` is true (adds mud, ice + ring, and later families).
2. **MEC-002 "good" set / MEC-006-R6:** BFS walls come from the registry `bfsWallAt` (adds ice cells, NPC cells, bomb cells, shrink ring).
3. **MEC-003-R7/R8:** "every hazard and terrain" becomes "every registry family's `onLevelEnd`" (tiles fade, movers vanish, bombs defuse).
4. **MEC-003-R14/R15:** weight keys for new families; rows from §11; challenge rows (P2c).
5. **MEC-003-R4 / §9:** challenge factor 0.8 and bonus 2 (P2c config).
6. **MEC-003 §8:** challenge banners and HUD marker on; `banner.new.{family}` for every new family.
7. **MEC-003-R19:** `run_end` adds `context` (from `died.context`); written by the run log in `src/session`.
8. **MEC-001-R1:** the step does not take a queued turn while the head is on active ice (MEC-012).
9. **MEC-006-R17:** effective tick = `round(base × slowFactor × tileFactor)`.
10. **MEC-006-R24:** breakable = registry `breakable` flag (§9 table).
11. **MEC-006-R25/R26:** Shield also applies to `headHit` (movers) and absorbs one blast (`areaHit`) without bonk or rubble.
12. **`docs/ARCHITECTURE.md` "Sim step order"** (single source; MEC-006-R35 only points there): step order generalized to the registry (§6).
13. **P0/P1 director behavior:** fairness rule 3 now rejects rock/fence/maze spawns that cut off the mango; seeded sequences change from L1 on (golden-value tests updated in the same PR).

## 21. Owner escalations / FYI
- FYI: GDD §5.1 "1–2 families per biome" vs the GDD table (P2-D9).
- FYI: GDD §5.3 rule 1 interpreted at the base tick (P2-D5); GDD §5.3 rule 3 now enforced for P1 families too (§20 item 13).
- Conditional: board size, only if §17 triggers.
