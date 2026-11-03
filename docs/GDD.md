# GDD — Mango Snake (working title)

> Casual-game GDD. Sections marked **[REQUIRED]** must be filled (no `TBD`) before any gameplay code.
> Keep it short: a casual GDD over ~3 pages usually means scope is too big.
> Numeric targets below are **defaults** for mobile casual games, not laws. Override per game with a one-line reason in `docs/DECISIONS.md`.
> The GDD owns product intent, scope and milestones. Exact rules of a complex mechanic go in `docs/specs/mechanics/MEC-xxx.md` and are linked here, not repeated.
> **Version:** 0.1 · **Updated:** 2026-11-03 · **Owner:** Quốc Khánh Nguyễn
>
> Items marked **OPEN (owner)** are proposals waiting for the owner's decision. They block gameplay code for that section (AGENTS §5).

## 1. Pitch [REQUIRED]
- **One sentence:** Steer a growing snake to eat mangoes and fill the level bar, while the board keeps dropping new obstacles on you — and use stamina skills to wriggle out of trouble.
- **Hook (why someone taps it in a store/feed in 3 seconds):** a familiar Snake board that visibly transforms (rocks landing, ground rising, mazes growing) plus a silly, cheeky reaction when you die.
- **Reference games (2–3) and what we take / avoid from each:** **OPEN (owner)** — proposal: classic Snake (take: instant readability; avoid: static board, no personality).
- **Target player:** **OPEN (owner)** — hypothesis: casual players who know Snake, short sessions (3–8 min), phone in portrait, often sound off.

## 2. Core loop [REQUIRED]
The loop the player repeats every 5–30 seconds.
    Steer to a mango → eat (grow, bar fills, +stamina) → obstacles warn and land / speed rises → crash = run over, or bar full = level up → instant retry
- **Core verb(s)** (max 2): steer; spend stamina (skill).
- **What makes one attempt different from the last:** random mango and obstacle placement, weighted obstacle director, golden mangoes, the player's skill timing.
- **Tone:** silly and cheeky ("bựa"): humor lives in reactions, sounds and death lines, never in hidden rules. Every death must still feel like the player's fault.

## 2b. Mechanics index [REQUIRED once a 2nd mechanic exists]
| ID | Mechanic | Player-facing purpose | Spec | Status |
|---|---|---|---|---|
| MEC-001 | Snake movement, growth, self-collision | Core steering challenge | GDD §2 (prototype) | Implemented (prototype) |
| MEC-002 | Mangoes: rot timer, golden mango, rotten-mango rocks | Time pressure, risk/reward | GDD §2, §7 | Implemented (prototype) |
| MEC-003 | Level bar and level unlocks | Short-term goal, escalation | GDD §5, §7 | Implemented (prototype) |
| MEC-004 | Obstacles: falling rocks, fences, rising ground, hedge mazes (warn → solid → crumble, fairness rules) | Escalating, readable danger | spec needed before changes (template 03) | Implemented (prototype) |
| MEC-005 | Wrap zones: edge segments the snake passes through to the opposite side | Escape routes, route choice | spec needed before implementation | Proposed |
| MEC-006 | Stamina + skills: Slow-mo, Mango Rain (extra food), Headbutt (break obstacle), Tail Snip (cut own length) | Clever escapes at a cost | spec needed before implementation | Proposed |

Design constraint for MEC-006: every skill removes a source of difficulty, so each needs a real cost and a side effect (e.g. the snipped tail becomes a temporary obstacle). Proposed: stamina comes from eating, no passive regen.

## 3. Controls & input [REQUIRED]
- Input scheme: arrows / WASD on keyboard; on-screen D-pad (pointerdown) and swipe on touch; up to 3 buffered turns; no instant reverse. Skill input for MEC-006: **OPEN (owner)** — proposal: 2 skill slots chosen before a run, so the D-pad is not crowded on a phone.
- Launch to first input: **≤ 5 s**. Any direction or Play starts the run after a 3-2-1 countdown.

## 3b. First-time user experience (first 60 s) [REQUIRED]
- Second 0–5: start card with a 3-item legend (lands soon / ground rising / mango rotting) and a Play button; first input is a direction or Play.
- How the core verb is taught: level 1 has rocks only and needs 4 mangoes; steering is taught by doing.
- First success moment: first mango within ~5 s (mango never spawns next to the head or in an unreachable pocket).
- First failure and retry: crash → shake + death line naming the cause → "Play again" (1 tap).
- Hidden until later: fences (L3), rising ground (L5), mazes (L7); proposed wrap zones and skills unlock by level.

## 4. Win / lose & session [REQUIRED]
- **Fail condition:** head hits the board edge (except future wrap zones), own body, or any solid obstacle.
- **Win / level-complete condition:** fill the bar to level up; max level 10 (85 mangoes in total). Board full = win.
- **Target session length:** **OPEN (owner)** — estimate: 5–7 min for a full run, 3–8 min per sitting; measure in the first playtest.
- **Restart cost:** ≤ 1 tap, ≤ 1 s (plus the 1.5 s countdown).

## 5. Difficulty & pacing [REQUIRED]
- Ramp: +1 mango needed per level; tick 4 ms faster per level; obstacle spawn interval shrinks; new obstacle family at L3 (fences), L5 (rising ground), L7 (mazes), two terrain events at L9. Only one big event (maze or rising ground) at a time.
- First-time player should fail first after ~30–60 s and **feel it was their fault** (all obstacles warn before turning solid and never land on the snake).

## 6. Feedback & juice [REQUIRED for M2]
| Event | Visual | Sound | Haptic |
|---|---|---|---|
| Core action (eat) | gulp scale, particles, "+1" float, score bump | triangle chirp (golden: double chirp) | 12 ms |
| Score / reward (level up) | gold board glow, bar flash, banner | 4-note arpeggio | 15-40-15 ms |
| Fail | screen shake, red flash, X eyes, death line | sawtooth drop | 90 ms |

## 7. Balance parameters [REQUIRED]
Currently in the prototype's `tuning` block; moves to `config/balance.json` at the first gameplay task.
| Key | Value | Notes |
|---|---|---|
| Board | 17 × 17 | |
| Tick start / per level / min | 140 ms / −4 ms / 95 ms | min is never reached (L10 = 104 ms, max level = 100 ms) |
| Max level | 10 | |
| Mangoes needed | 4 + level (0-based) | 85 total |
| Mango rot time | max(4 s, 8 s − 0.15 s × eaten) | golden: ×0.5 |
| Golden mango | 15% after 3 eaten; +3 score, +2 bar | |
| Spawn interval | max(2 s, 5 s − 0.3 s × level) | |
| Small-hazard cap | min(8, 2 + level/2) | |
| Warn times | rock 1.5 s · fence 2 s · maze 2.6 s · ground 0.9 s | |
| Unlocks (0-based level) | fence 2 · terrain 4 · maze 6 | |

## 8. Progression & meta [M3]
- Short-term (per run): score, level reached, best score (local).
- Long-term: **OPEN (owner)** — candidates: endless mode after L10, daily seeded run, cosmetic snakes.
- **Reason to come back tomorrow:** **OPEN (owner)**.

## 9. Monetization [M4 — optional for prototype]
- Model: **OPEN (owner)** — not needed for the prototype.
- Rules: no interstitial before ~3rd session; rewarded ads must be opt-in.

## 10. Art, audio & UI direction [REQUIRED]
- Style: soft flat colors, rounded "Baloo 2" font, cute characters contrasted with cheeky lines; light and dark themes. Reference images: **OPEN (owner)**.
- Screens (minimal): Boot → Game → Game Over (start/pause/game-over are overlays on the board).
- Readability: playable on a 5" phone, high contrast; warnings use both color and blinking (check color-blind safety for red vs. orange warnings).

## 11. Scope & milestones [REQUIRED]
| Milestone | Exit criteria | In scope | Out of scope |
|---|---|---|---|
| M1 Core loop | Greybox; 5 testers replay ≥ 3 times unprompted | §2–5, §13; MEC-001…004 validated; MEC-005/006 only if the base loop passes | art, menus, meta, ads |
| M2 Juice | Feels good; §6 table done; humor pass (death lines, reactions) | §6, §10 | meta, ads |
| M3 Meta | Reason to return | §8 | ads |
| M4 Ship | Store/web-ready | §9, polish | new mechanics |

## 12. Success metrics & playtest [REQUIRED]
- Hypothesis being tested: the escalating-board core loop is fun for 5+ minutes; skills (later) add decisions, not just power.
- Metrics: first-session length, retries per session, level reached, death cause distribution (no cause > 40%), D1 retention (when live).
- Analytics events needed: `run_start`, `level_up`, `run_end` (level, score, cause, duration), `skill_used` (later).
- Playtest log → `docs/PLAYTEST.md` (create at first playtest).

## 13. Technical constraints [REQUIRED]
- Target devices / browsers: **OPEN (owner)** — prototype runs in modern mobile and desktop browsers.
- Frame-rate target 60 fps; ≤ 3 s to first input on a mid-range phone.
- Build size budget: prototype ~49 KB (single HTML, no assets).
- Offline play: yes after first load (only the web font needs the network). Save data: local (best score, sound setting).

## Parking lot (ideas not in scope)
- New obstacles: banana peel (slide), rolling coconut, sleepy cat, lawnmower sweep, fake mango (only with a learnable tell).
- Endless mode, daily seeded run, cosmetics, online leaderboard, Vietnamese localization.
