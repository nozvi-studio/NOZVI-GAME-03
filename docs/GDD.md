# GDD — Mango Snake (working title)

> Casual-game GDD. Sections marked **[REQUIRED]** must be filled (no `TBD`) before any gameplay code.
> This GDD is intentionally longer than a typical casual GDD because it is the **master overview** from which per-phase specs (`docs/specs/mechanics/MEC-xxx.md`) and plans are generated with Superpowers. The GDD owns intent, scope and phases; exact rules and edge cases belong in MEC specs and win over this file once written.
> Numbers below are **starting values**. They move to `config/balance.json` in Phase 0 and are tuned there; after that, the config is the source of truth and this file links to it.
> **Version:** 0.2 · **Updated:** 2026-11-03 · **Owner:** Quốc Khánh Nguyễn
>
> **OPEN (owner)** = proposal waiting for the owner's decision; it blocks gameplay code for that section (AGENTS §5).
> **ASSUMPTION** = the agent's interpretation of the owner's description; confirm or correct before the relevant phase starts.

## 1. Pitch [REQUIRED]
- **One sentence:** A reinvented Snake: climb 30 levels across 6 biomes while the board fights back with ever-smarter obstacles, collect energy to fire off skills at the right moment, and cash every run in for marbles to shoot in a lucky marble machine that drops cute chibi pet skins.
- **Hook (3 seconds in a store/feed):** a familiar Snake board that visibly transforms (rocks landing, ground rising, coconuts rolling) + a chibi capybara/cat/dog "snake" + a juicy marble machine.
- **Reference games and what we take / avoid:**
  - Classic Snake — take: instant readability, one-thumb control. Avoid: static board, no personality, no reason to return.
  - Casual mobile games with a pachinko / marble-drop reward screen (e.g. the owner's reference screenshot, 2026-11-03) — take: the *feel* of a chunky, glowing reward machine and visible odds. Avoid: copying any specific game's layout, icons or art; real-money gacha.
  - Further references: **OPEN (owner)**, optional.
- **Target player (hypothesis, to validate in playtests):** casual mobile players who already know Snake; short sessions (3–10 min), phone in portrait, often sound off; enjoy collecting cosmetics.

## 2. Core loop [REQUIRED]
### 2.1 In-run loop (every 5–30 s)
    Steer to a mango (or an energy orb) → eat → bar fills / energy fills
    → obstacles warn and land, speed rises with level
    → spend energy on a skill to escape or to farm
    → bar full = level up (snake shrinks back to start length) · crash = run over (next run can start at an unlocked checkpoint, §6.4)
### 2.2 Session loop (every 3–10 min)
    Home → pick 2 skills → run (levels 1…30) → results: score + marbles → marble machine → skins / coins → equip skin → next run
- **Core verbs (max 2):** steer; fire a skill.
- **What makes one attempt different:** random mango, energy and obstacle placement (seeded RNG), weighted obstacle director, golden mangoes, skill loadout and timing, checkpoint state.
- **Key decision the player makes every few seconds:** mango (progress) vs. energy orb (future escape) vs. safety (stay away from warnings).
- **Tone:** silly and cheeky ("bựa"). Humor lives in reactions, sounds, death lines and pet skins, never in hidden rules. Every death must feel like the player's fault.

## 2b. Mechanics index [REQUIRED]
Each row gets its own spec before its phase is implemented. Status: Implemented / Proposed / Parked.
| ID | Mechanic | Player-facing purpose | Phase | Spec | Status |
|---|---|---|---|---|---|
| MEC-001 | Snake movement, growth, self-collision, **length reset on level up** | Core steering challenge | P0 (port), P1 (reset) | `docs/specs/mechanics/MEC-001-snake.md` | Implemented (P1) |
| MEC-002 | Mangoes: rot timer, golden mango, rotten mango → temporary obstacle | Time pressure, risk/reward | P0, P1, P2 | `docs/specs/mechanics/MEC-002-mango.md` | Implemented (P1) |
| MEC-003 | Level & biome progression: 30 levels, 6 biomes × 5 levels, quotas, speed curve, level up | Short-term goal, escalation, sense of travel | P1 | `docs/specs/mechanics/MEC-003-levels-biomes.md` | Implemented (P1) |
| MEC-012 | Ground tiles: mud (slows the head) and ice (slide until off) patches from L7 and L13 | Readable terrain variety without lethal cost | P2a | `docs/specs/mechanics/MEC-012-ground-tiles.md` | Implemented (P2a) |
| MEC-013 | Rolling coconuts: a telegraphed lane, then a coconut rolls across it (L16) | Reading lanes | P2b | `docs/specs/mechanics/MEC-013-rolling-coconuts.md` | Proposed |
| MEC-014 | Gates that open/close on a rhythm (L17) and spike traps on a global beat (L18) | Pathing + timing | P2b | `docs/specs/mechanics/MEC-014-gates-spikes.md` | Proposed |
| MEC-015 | Patrolling cat / chicken on a visible back-and-forth route (L21) | Timing | P2b | `docs/specs/mechanics/MEC-015-patrol-npcs.md` | Proposed |
| MEC-016 | Mango-thief bird: shadow on the mango, steals it if not eaten in time (L22) | Time pressure, never lethal | P2b | `docs/specs/mechanics/MEC-016-mango-thief-bird.md` | Proposed |
| MEC-017 | Timed bombs: countdown, then a plus-shaped blast for one tick (L23) | Area avoidance | P2b | `docs/specs/mechanics/MEC-017-timed-bombs.md` | Proposed |
| MEC-004 | Obstacle families + director + fairness rules (warn → solid → crumble, never on snake, always a path) | Escalating, readable danger | P0 (port), P2 (new families) | to write (template 03) | Partly implemented (rocks, fences, rising ground, mazes) |
| MEC-006 | Energy orbs, energy bar, 4 skills with energy cost and side effects | Clever escapes and farming at a cost | P1 | `docs/specs/mechanics/MEC-006-energy-skills.md` | Implemented (P1) |
| MEC-007 | Skill loadout: pick 2 of the unlocked skills before a run | Strategy before the run; uncluttered phone controls | P1 | `docs/specs/mechanics/MEC-007-loadout.md` | Implemented (P1) |
| MEC-008 | Checkpoints: milestone levels unlock a later start level for new runs, speed ramp, partial energy carry-over | No full reset after a death; makes energy farming meaningful | P1 | `docs/specs/mechanics/MEC-008-checkpoints.md` | Implemented (P1) |
| MEC-009 | Run results & marble reward formula | Every run pays out | P4 | to write | Proposed |
| MEC-010 | Marble machine (pachinko): pegs, bumpers, prize slots, PUSH, public odds, pity | Juicy reward moment; collection driver | P4 | to write | Proposed |
| MEC-011 | Skins, coins, duplicates, shop, equip | Long-term goal; self-expression | P4 | to write | Proposed |
| MEC-005 | Wrap zones (edge segments the snake passes through) | Escape routes | — | — | Parked (not in the owner's 2026-11-03 design; see Parking lot) |

## 3. Controls & input [REQUIRED]
- **Touch (primary):** swipe anywhere on the board to turn; optional on-screen D-pad (setting). Up to 3 buffered turns; no instant reverse.
- **Skills:** 2 large skill buttons in the bottom corners (left = slot 1, right = slot 2), reachable with thumbs. Each shows its icon, energy cost and an "affordable" glow. A skill that is not affordable is greyed and gives a short "nope" shake + sound when tapped.
- **Keyboard (desktop web):** arrows / WASD to steer; `J` / `K` (also `Q` / `E`) for skill slots 1 / 2; `P` / `Esc` pause.
- **Launch to first input:** ≤ 5 s on a mid-range phone. Play → loadout (remembers last choice, 1 tap to confirm) → 3-2-1 countdown (1.5 s).
- **Accessibility:** reduced-motion setting disables shake and big flashes; warnings never rely on color alone (blink + icon + shape).

## 3b. First-time user experience (first 60 s) [REQUIRED]
- **Second 0–5:** Home shows the snake (default skin) and one big Play button. First run skips the loadout screen (skills are locked).
- **Teaching steering:** Level 1 = rocks only, quota 4 mangoes; the first mango spawns within reach and never next to the head.
- **First success:** first mango within ~5 s; level 1 cleared within ~30 s; the level-up shrink is shown with a "Fresh start!" banner.
- **First failure and retry:** crash → shake + death line naming the cause → results screen (marbles earned) → "Play again" (1 tap). The first results screen points to the marble machine with an arrow.
- **Staged unlocks (first time only):** energy orbs appear from level 2 · first skill (Slow-mo) unlocks on reaching level 3 with a one-line tooltip · second slot + Tail Snip on reaching level 6 · Shield on level 11 · Mango Rain on level 16 · marble machine after the first run · checkpoint explained the first time it unlocks.

## 4. Win / lose & session [REQUIRED]
- **Fail (death):** head hits the board edge, the snake's own body, or any solid obstacle (unless a skill prevents it, §6.3).
- **After a death:** the run is over (results + marbles). The next run starts at the highest unlocked checkpoint by default, or at L1 by choice (MEC-008, §6.4).
- **Run win:** clear level 30. The full clear shows a celebration and a big marble bonus.
- **Target session length:** typical run 3–8 min; full 30-level clear ~12–18 min (estimate, measure in playtests). **OPEN (owner)** confirm targets.
- **Restart cost:** ≤ 1 tap, ≤ 1 s (plus the 1.5 s countdown).

## 5. Run structure, levels & difficulty [REQUIRED]
### 5.1 Levels and biomes (MEC-003)
30 levels in 6 biomes of 5 levels. Each biome introduces 1–3 obstacle families (biomes 4–5 have 3, one new family per level; owner 2026-11-04) and has its own palette; its 5th level is a **challenge level** (denser director, mixes the biome's families). Only one big terrain event (maze or rising ground) is active at a time.
| Biome | Levels | Palette idea | New obstacle families (details §5.4) | Challenge level |
|---|---|---|---|---|
| 1. Mango Orchard | 1–5 | green / mango yellow | Falling pebbles & rocks | L5 "Rock rain" |
| 2. Rice Paddy | 6–10 | light green / straw | Simple fences (straight → L-shape), mud tiles | L10 "Fence field" |
| 3. Frozen Pond | 11–15 | ice blue / white | Rise-and-sink stone tiles, ice tiles, rotten mangoes turn into rocks | L15 "Thin ice" |
| 4. Rocky Hills | 16–20 | sand / brown | Rolling coconuts, complex fences (U-traps, gates), spike traps | L20 "Avalanche" |
| 5. Backyard | 21–25 | warm orange / brick | Patrolling cat & chicken, mango-thief bird, timed bombs | L25 "Pet chaos" |
| 6. Storm Garden | 26–30 | dark violet / neon | Hedge mazes, shrinking board, mixes of all families | L30 "Final storm" |

### 5.2 Per-level rules
- **Quota:** mangoes needed to clear level *n* (1-based) = `4 + floor((n − 1) / 3)` → L1 = 4, L30 = 13; 255 mangoes for a full clear.
- **Speed:** tick = `140 ms − 2 ms × (n − 1)` → L1 = 140 ms, L30 = 82 ms. (Replaces the prototype's 10-level curve whose minimum was never reached.)
- **Length reset on level up (owner decision A):** when the bar fills, the snake shrinks to its start length (4 segments) keeping head position and direction; growth restarts from there. Golden mangoes still grow +1.
- **Level up (no freeze):** the snake keeps moving and existing obstacles stay until they end by their own lifetime; from the higher levels a short slowdown eases back to the new speed (owner 2026-11-04). Exact rules → MEC-003-R7..R9 and R22.
- **Director:** spawn interval `max(1.6 s, 5 s − 0.12 s × n)`; small-hazard cap `min(10, 2 + floor(n / 3))`. Challenge levels: interval × 0.8, cap +2.

### 5.3 Fairness rules (apply to every obstacle family, MEC-004)
1. Every obstacle shows a warning (color + blink + icon) before it becomes solid; warn time ≥ 0.9 s and ≥ 4 ticks at the base tick (`speed.startMs`; owner 2026-11-04 — slow effects such as mud or Slow-mo only add margin).
2. Nothing ever lands on or appears inside the snake, or in the 3 cells in front of the head.
3. After any spawn, the head must still be able to reach the current mango (BFS reachability); otherwise the spawn is rejected.
4. Moving obstacles telegraph their whole path (lane highlight) before moving.
5. A new family is introduced alone (no other new family in the same level) with a one-line tooltip the first time.

### 5.4 Obstacle catalogue
| Family | Behavior | Tests the player's… | Biome | Prototype? |
|---|---|---|---|---|
| Pebbles & rocks | Warn → land → solid → crumble after a while | Pathing | 1+ | Yes |
| Fences, simple | 2–4 straight cells, then L-shapes | Pathing | 2+ | Yes |
| Mud tiles | Not deadly; the snake moves at half speed while its head is on mud | Rhythm, timing | 2+ | No |
| Rise-and-sink stone tiles | Cells cycle flat → warn → raised (solid) → flat | Timing | 3+ | Yes (rising ground) |
| Ice tiles | On ice the snake cannot turn; it slides straight until it leaves the ice | Planning ahead | 3+ | No |
| Rotten mangoes → rocks | A mango not eaten in time turns into a rock for a short time (owner design) | Time pressure | 3+ | Yes (prototype: always on; v0.2: from biome 3) |
| Rolling coconuts | A lane (row/column) is highlighted, then a coconut rolls across it | Reading lanes | 4+ | No |
| Fences, complex | U-traps, gates that open/close on a rhythm | Pathing + timing | 4+ | No |
| Spike traps | Cells that pop up on a fixed beat | Timing | 4+ | No |
| Patrolling cat / chicken | NPC walks a fixed, visible back-and-forth route | Timing | 5+ | No |
| Mango-thief bird | Shadow appears on the mango; if not eaten in time the bird takes it (mango respawns elsewhere, no rock) | Time pressure | 5+ | No |
| Timed bombs | 3-2-1 countdown then a plus-shaped blast (1 turn of danger) | Area avoidance | 5+ | No |
| Hedge mazes | Large maze grows from warned cells | Pathing under pressure | 6 | Yes |
| Shrinking board | Border closes in by one ring for a few seconds, then reopens | Space pressure | 6 | No |

**Never use:** reversed controls, wind that pushes the snake, fog that hides the board, unwarned instant hazards. They take control away and make deaths feel unfair.

### 5.5 Difficulty targets
- A first-time player should first die after ~30–60 s (biome 1) and feel it was their fault.
- Each biome should feel harder than the previous one even after the checkpoint speed reset (obstacle complexity is the second difficulty axis).
- Death cause distribution: no single cause > 40% (measured from P1 playtests).

## 6. Energy, skills & checkpoint [REQUIRED for P1]
### 6.1 Energy (MEC-006)
- **Energy orbs** spawn scattered on free cells, separate from mangoes: one every 6 s, max 2 on the board, each disappears after 8 s (blinks the last 2 s). Eating an orb: +15 energy, does **not** grow the snake or fill the level bar.
- Golden mango: +10 energy in addition to its normal reward.
- **Start energy:** a run starts with the energy carried over from the previous run (§6.4), otherwise 0.
- **Energy bar:** max 100. No passive regeneration (energy only comes from playing well).
- Energy is **kept between levels** within a run; part of it carries into the next run (§6.4).

### 6.2 Skill rules
- Skills cost energy; **no cooldowns** (owner decision, 2026-11-03). A skill can be fired whenever its cost is affordable and no other skill effect of the same skill is active.
- The player takes **2 skills** into a run (MEC-007), chosen on the loadout screen before the run from the skills unlocked so far.
- Every skill removes a source of difficulty, so every skill has a **real cost and a side effect**.

### 6.3 Skill list
| Skill | Cost | Effect | Side effect (the price) |
|---|---|---|---|
| **Slow-mo** | 40 | Snake tick × 1.6 (slower) for 4 s | Mango rot timers and obstacle timers keep running in real time, so they feel faster |
| **Tail Snip** | 30 | Removes the back half of the snake (min length 3) | The cut segments become a temporary rock wall for 3 s |
| **Shield (Headbutt)** | 50 | For 5 s, the first hit on a breakable obstacle destroys it and the snake survives | Does not protect from the board edge or the snake's own body; rubble blocks the cell behind the broken obstacle for 1.5 s |
| **Mango Rain** | 80 | For 6 s, 6–10 mangoes rain onto safe cells | Each mango still grows the snake (long snake risk); Rain mangoes fill at most 50% of the level bar per cast; extra ones give score and marbles only |

Owner decision (2026-11-03): the "many-food farming event" is the 4th skill (Mango Rain), not a random board event.

### 6.4 Checkpoints (MEC-008)
Owner intent (clarified 2026-11-03): once a player has reached a milestone level, a death no longer sends them back to level 1. The run ends normally, and the **next run** starts at a checkpoint at level-1 speed but with that level's obstacles, keeping part of their energy, so farming energy pays off later.
- **Milestones (owner decision: fixed milestones, every 5 levels):**

  | Reach (best ever) | Unlocks start at | ≈ |
  |---|---|---|
  | L10 | L4 | 40% |
  | L15 | L6 | 40% |
  | L20 | L8 | 40% |
  | L25 | L10 | 40% |
  | L30 (full clear) | L12 | 40% |
- **Permanent:** a checkpoint stays unlocked once reached (saved with the best level). The HUD shows the next milestone ("Next checkpoint at L15").
- **Start choice:** Home offers "Play from checkpoint L__" (default: highest unlocked) and "Play from L1" (for players who want to farm energy and marbles from the start).
- **Energy carry-over:** 50% of the energy held at the moment of death, max 50, becomes the next run's start energy (whatever level it starts at). It is saved, so it survives closing the game.
- **Speed ramp:** the tick starts at L1 speed (140 ms) and moves linearly to the start level's normal tick over the first 5 mangoes eaten (owner decision b). Later levels use their normal speed.
- **Rewards:** marbles count only the levels cleared in this run (§8.1), so a checkpoint start does not pay for skipped levels.
- **Skill unlocks** (§3b) depend on the best level ever reached, so a checkpoint start always has the skills the player has earned.
- **Risk to test in P1:** a checkpoint start pairs slow speed with a later biome's obstacles (e.g. L8 = biome 2 fences). Playtest whether this feels fair or like being "dropped mid-fight".

## 7. Balance parameters [REQUIRED]
Starting values; they move to `config/balance.json` in P0 and are tuned there.
| Key | Value | Notes |
|---|---|---|
| Board | 17 × 17 | Revisit in P2 if biomes 5–6 feel cramped |
| Levels / biomes | 30 / 6 × 5 | §5.1 |
| Start length | 4 | Reset on level up |
| Quota per level | `4 + floor((n−1)/3)` | 255 total |
| Tick | `140 − 2 × (n−1)` ms | 82 ms at L30 |
| Mango rot time | `max(4 s, 8 s − 0.15 s × eaten in level)` | golden × 0.5; rotten → rock only from biome 3 |
| Golden mango | 15% after 3 eaten in the run; +3 score, +2 bar, +10 energy | |
| Spawn interval / small-hazard cap | `max(1.6 s, 5 − 0.12 n)` / `min(10, 2 + floor(n/3))` | challenge levels × 0.8 / +2 |
| Warn times | rock 1.5 s · fence 2 s · maze 2.6 s · ground 0.9 s · coconut lane 1.5 s · bomb 3 s | all ≥ 4 base ticks |
| Energy | orb +15 · every 6 s · max 2 · life 8 s · bar max 100 | |
| Skill costs | Slow-mo 40 · Tail Snip 30 · Shield 50 · Mango Rain 80 | §6.3 |
| Checkpoints | reach L10/15/20/25/30 → start at L4/6/8/10/12 · carry 50% energy (max 50) · ramp over 5 mangoes | §6.4 |
| Marbles | `floor(mangoes / 2) + 2 × levels cleared + 10 × biomes cleared + 30 (full clear)` | §8.1 |

## 8. Progression & meta [P4]
All meta currency is earned by playing. **No real-money purchases** (owner decision, 2026-11-03).
### 8.1 Run results (MEC-009)
- Results screen: level reached, score, best score, death cause, marbles earned with a count-up animation, "Play again" and "Marble machine" buttons.
- Marble formula in §7 (rewards progress and mangoes, not survival time, so stalling never pays).
- Rough target: a level-8 run ≈ 30–40 marbles. Tune so a new player wins their **first skin within the first 2–3 runs**.

### 8.2 Marble machine (MEC-010)
- A vertical pachinko board in the art style of §10: pegs, 2 round bumpers, a curved guide, and **5 prize slots** at the bottom, e.g. `10 coins · 25 coins · ★ Mystery skin · 25 coins · 10 coins`.
- **PUSH** button shoots 1 marble (hold for auto-fire; ×10 button after 50 marbles owned). Marble count and coin count always visible.
- **Outcome is decided first** by a weighted table (seeded RNG), then the physics animation is guided into that slot. This keeps the published odds exact. The motion must still look natural.
- Starting odds: 10 coins 30% × 2, 25 coins 17.5% × 2, Mystery 5%. Mystery rarity: Common 70%, Rare 25%, Epic 5%.
- **Public odds:** an "i" button shows the full odds table, always in sync with the config (tested).
- **Pity:** if 40 marbles in a row give no skin, the next marble lands in Mystery.
- **Duplicates:** a skin you already own converts to coins (Common 60, Rare 150, Epic 400).

### 8.3 Skins & coins (MEC-011)
- **Skin = chibi head icon + body made of same-colored blocks** that grows like the snake (cheap to produce: one head drawing per skin + a color). Launch set proposal: Snake (default), Dog, Cat, Capybara, + 8 more (e.g. Duck, Frog, Panda, Fox, Pig, Axolotl, Hamster, Mango-cat).
- Rarity shows in presentation, not power (skins never change gameplay): Common = head + color · Rare = + eat effect / trail particles · Epic = + animated head, custom death reaction and sound.
- **Coins** buy any skin directly in the shop (Common 300, Rare 800, Epic 2000), so the player always has a deterministic path to the skin they want.
- Equip from the Skins screen; the equipped skin is shown on Home.
- **Reason to come back tomorrow:** **OPEN (owner)** — candidates: daily seeded run with a marble bonus, daily free marbles, endless mode after L30, new skin sets per season.

### 8.4 Save data (local)
Best level, best score, unlocked checkpoints, carried energy, marbles, coins, owned skins, equipped skin, pity counter, unlocked skills, last loadout, settings (sound, haptics, D-pad, reduced motion). Versioned save format with migration.

## 9. Monetization [P5 — optional]
- **No real money in the current plan.** Marbles, coins and skins are earned only by playing.
- If monetization is ever added (e.g. opt-in rewarded ads for extra marbles), it requires a DECISIONS entry approved by the owner and a fresh legal check: buying marbles with real money would make the marble machine a loot box (banned or regulated in some countries; app stores require disclosed odds).

## 10. Art, audio & UI direction [REQUIRED]
### 10.1 Style (owner decision, 2026-11-03: hybrid)
- **UI, characters, marble machine:** chunky cartoon — thick dark outlines, saturated colors, glossy rounded buttons, big readable numbers, rounded "Baloo 2" font. This is where the "wow" is (marble machine, skins, results).
- **Game board:** flat and low-detail so play stays readable. Plain ground with a subtle checker, high-contrast obstacles with outlines, warnings use color + blink + icon.
- **Biomes:** each biome has its own palette and ground tile (§5.1) — the cheapest way to show progress.
- **Inspiration, not copying:** take the chunky-cartoon *feel* from reference screenshots, but design our own layout, icons and characters.
- Light and dark themes for the board; UI stays in its cartoon style.
- **First art task:** a **style tile** (board + snake + 3 obstacles + 1 chibi skin + 1 button + marble machine corner), checked on a real 5" phone before producing assets at scale. Can run in parallel with P1 (P1 uses greybox).
- If AI image generation is used for assets: keep one style guide + palette, check license terms of the tool, and redraw/clean up for consistency.

### 10.2 Audio
- Synth SFX as in the prototype (eat chirp, golden double chirp, level-up arpeggio, death drop) + new: energy pickup, skill cast (one per skill), checkpoint unlocked, marble peg ticks, slot win, skin unlock fanfare.
- Short cheeky death lines per cause (text first; voice optional, parking lot).

### 10.3 Screens
Boot → Home (Play from checkpoint · Play from L1 · Marble machine · Skins · Settings) → Loadout (pick 2 skills) → Game (HUD: level, biome, quota bar, energy bar, 2 skill buttons, pause, "next checkpoint at L__" hint) → Results → Marble machine → Home. Pause and countdown are overlays on the board.

### 10.4 Feedback & juice [REQUIRED for P3]
| Event | Visual | Sound | Haptic |
|---|---|---|---|
| Eat mango | gulp scale, particles, "+1" float, bar bump | triangle chirp (golden: double) | 12 ms |
| Eat energy orb | spark burst toward the energy bar | soft zap | 8 ms |
| Skill cast | skill-colored flash, icon pops from the button, effect overlay (blue tint for Slow-mo…) | per-skill sound | 20 ms |
| Level up | snake shrink "pop", gold board glow, banner | 4-note arpeggio | 15-40-15 ms |
| Biome change | palette sweep + biome name card | longer jingle | 30 ms |
| Checkpoint unlocked | flag plants on the level bar, "Next run starts at L6!" banner | fanfare | 40 ms |
| Death | screen shake, red flash, X eyes, death line | sawtooth drop | 90 ms |
| Marble machine | peg ticks, bumper glow, slot light-up, coin burst / skin reveal | ticks + win jingle | light per bump |

## 11. Scope & phases [REQUIRED]
Big phases; each phase gets **one spec set + one plan** (Superpowers `brainstorming` → `writing-plans`), and the plan is executed as **small tasks, one PR each** (AGENTS §6). The owner approves at two gates per phase: the spec and the exit criteria. Do not start a phase before the previous phase's exit criteria pass.
| Phase | Milestone | In scope | Exit criteria | Out of scope |
|---|---|---|---|---|
| **P0 Foundation** | M1 | Phaser 3 + TypeScript + Vite project; pure TS core (`src/core/`, no Phaser imports) with Vitest; seeded RNG; `config/balance.json`; port MEC-001…004 from the prototype; greybox rendering; local save skeleton | Parity with the prototype's core loop; tests + typecheck pass; no console errors; runs on a phone browser | new mechanics, art |
| **P1 New core loop** | M1 | MEC-001 length reset, MEC-003 30-level/biome structure (using existing obstacle families only), MEC-006 energy + 4 skills, MEC-007 loadout, MEC-008 checkpoint; death causes logged locally | **Playtest:** 5 testers, ≥ 3 of them replay ≥ 3 times unprompted; skills used in ≥ 50% of runs. If it fails, iterate P1 — do not move on | new obstacle families, art, meta |
| **P2 Content** | M1 | New obstacle families of §5.4, challenge levels, fairness checks per family, director tuning per biome | All 30 levels playable to the end; no death cause > 40%; fairness tests pass | art, meta |
| **P3 Juice & art** | M2 | Style tile → asset production, §10.4 table, biome palettes, death lines, UI screens | Feedback table done; readable on a 5" phone; 60 fps on a mid-range phone | meta |
| **P4 Meta** | M3 | MEC-009 results + marbles, MEC-010 marble machine (Matter.js physics), MEC-011 skins + coins + shop, save migration | Run → marbles → machine → skin loop complete; measured drop rates match published odds (test); first skin within 2–3 runs in playtest | monetization |
| **P5 Ship** | M4 | Performance, analytics events (§12), web build for portals (and optional app wrapper), store/portal assets | Ships on the chosen platform; no blocker bugs | new mechanics |

## 12. Success metrics & playtest [REQUIRED]
- **Hypotheses:** (1) the escalating-board loop with length reset is fun for 5+ minutes; (2) skills add decisions, not just power; (3) checkpoints make a death feel like progress, and energy carry-over makes players farm energy on purpose; (4) the marble machine makes players start another run.
- **Metrics:** first-session length, runs per session, level reached, death cause distribution (no cause > 40%), skill use per run, checkpoint usage, runs started from the results screen vs. from Home, D1 retention (when live).
- **Analytics events (P5, local log from P1):** `run_start` (start level, start energy, loadout), `level_up` (level, time), `skill_used` (skill, level, energy before), `checkpoint_unlocked` (level), `run_end` (level, score, cause, duration, marbles), `marble_shot` (slot), `skin_unlocked` (skin, source).
- Playtest log → `docs/PLAYTEST.md` (created at the first playtest).

## 13. Technical constraints [REQUIRED]
- **Stack (owner decision, 2026-11-03):** Phaser 3 + TypeScript + Vite; unit tests with Vitest; Matter.js (bundled with Phaser) for the marble machine. Exact versions are verified and pinned in P0 (do not assume from memory).
- **Architecture:** `src/core/` pure simulation (tick-based, deterministic, seeded RNG, no Phaser) · `src/meta/` pure economy, odds and save logic · `src/game/` Phaser scenes for rendering, input and audio · `config/balance.json` for all tuning. Details go to `docs/ARCHITECTURE.md` in P0.
- **Platform (owner decision, 2026-11-03): web-first**, portrait, modern mobile and desktop browsers; an app wrapper (e.g. Capacitor) is optional in P5. **Publish target (owner decision, 2026-11-04): GitHub Pages** for now (static Vite build; set Vite `base` to the repo path). Other portals (itch.io, Poki, CrazyGames) may be added later, each with its own SDK and size rules.
- **Performance:** 60 fps; ≤ 3 s to first input on a mid-range phone; initial download budget ≤ 5 MB (proposal).
- **Offline:** playable after first load; save data local (§8.4).
- The current `prototype/mango-snake-hard.html` remains as a reference until P0 reaches parity, then it is frozen.

## Parking lot (ideas not in scope)
- Wrap zones (MEC-005), teleport portals, one-way arrow tiles, rival AI snake competing for mangoes, fake mango with a learnable tell, banana peel, lawnmower sweep.
- Endless mode after L30, daily seeded run, online leaderboard, seasonal skin sets, voiced death lines, Vietnamese localization.
