# Docs map (read this instead of scanning docs/)
Updated: 2026-11-22

## 1. Document index
Only files listed here exist. Status: Draft / Approved / Deprecated.
| ID | File | Owns (source of truth for) | Status |
|---|---|---|---|
| GDD | `docs/GDD.md` | Product intent, scope, milestones, mechanics index | Draft |
| UI-MOCKUPS | `docs/design/UI-MOCKUPS.md` | D3 boards (`docs/design/mockups/d3/`: `boards.html`, `d3.css`, `png/`), rules for agents, board-to-code map; D2 mockups kept as history | Draft |
| STATUS | `docs/STATUS.md` | Current state, next steps, blockers | — |
| CODEMAP | `docs/CODEMAP.md` | Where code lives, module boundaries, entry points | — |
| DEC | `docs/DECISIONS.md` | Technical/design trade-offs (ADR-lite) | — |
| — | `CHANGELOG.md` | History | — |
| P0-DESIGN | `docs/superpowers/specs/2026-11-03-p0-foundation-design.md` | P0 architecture, port behavior of MEC-001…004 (prototype rules), test strategy, pinned versions | Approved |
| P0-PLAN | `docs/superpowers/plans/2026-11-03-p0-foundation.md` | P0 task-by-task implementation plan (9 PRs) | Approved |
| P1-DESIGN | `docs/superpowers/specs/2026-11-03-p1-core-loop-design.md` | P1 new core loop design, delivery order, playtest protocol; step order moved to ARCH | Approved |
| P1-LEVELUP-B | `docs/superpowers/specs/2026-11-04-levelup-flow-b-design.md` | P1 rework: level up without freeze or crumble, slowdown tiers; supersedes MEC-003 R7-R11 | Approved |
| P1-LEVELUP-B-PLAN | `docs/superpowers/plans/2026-11-04-levelup-flow-b.md` | Implementation plan for level-up flow B (8 tasks: slowdown tiers, no freeze, no crumble, director, banner, specs, QA) | Approved |
| P1-PLAN | `docs/superpowers/plans/2026-11-03-p1-core-loop.md` | P1 implementation plan (10 PRs) | Approved |
| P2-DESIGN | `docs/superpowers/specs/2026-11-03-p2-content-design.md` | P2 umbrella design (P2a/P2b/P2c), changes to P1 specs | Approved |
| P2A-PLAN | `docs/superpowers/plans/2026-11-03-p2a-framework-ground-tiles.md` | P2a implementation plan (family framework, mud, ice) | Approved |
| P2B-PLAN | `docs/superpowers/plans/2026-11-04-p2b-movers-cycles-blasts.md` | P2b implementation plan (mover, cycle and area-blast blocks; coconut, gate, spike, npc, bird, bomb; 11 tasks) | Draft |
| P2C-PLAN | `docs/superpowers/plans/2026-11-04-p2c-shrink-challenge-tuning.md` | P2c implementation plan (shrinking board, challenge levels, biome tuning, board-size check, P2 exit with 40% metric; 8 tasks) | Draft |
| ARCH | `docs/ARCHITECTURE.md` | Module boundaries, time model, Sim step order | Draft |
| PLAYTEST | `docs/PLAYTEST.md` | Playtest evidence | — |
| P3-UIFIX | `docs/superpowers/specs/2026-11-07-p3-ui-review-fixes-design.md` | P3 UI fixes from the agy review: banner strip, toasts, dark theme, layout, polish (UIFIX-R1..R15) | Approved |
| UI-D3 | `docs/superpowers/specs/2026-11-10-ui-d3-juicy-design.md` | D3 "Juicy" mobile-first visual redesign: tokens, skin kit, viewport and layout, per-screen rules, visual interaction feedback (D3-R1..R28, R7b), phases U0..U7; supersedes the D2 look; direction study in `docs/design/mockups/d3/directions.html` (section A is the reference); D3 marble machine and wheel mockups in `docs/design/mockups/d3/marble.html` | Draft |
| UI-D4 | `docs/superpowers/specs/2026-11-23-ui-d4-duolingo-design.md` | D4 "Duolingo Modern" umbrella design: Hybrid Phaser + HTML/CSS overlay, 60-30-10 tokens, upgraded Duolingo Vector SVG rig, 3-tier animation system, 5-phase rollout index | Draft |
| UI-D4-P1..P5 | `docs/superpowers/specs/2026-11-23-d4-p1-design-system-and-stylebook.md`, `-p2-characters-art-and-motion.md`, `-p3-characters-and-home.md`, `-p4-menus-and-overlays.md`, `-p5-ingame-harmonization-and-cleanup.md` | Phase specs for D4 rollout: P1 foundation & stylebook, P2 character art & motion, P3 Characters & Home, P4 Loadout/Results/Settings & overlays, P5 in-game Phaser HUD/board harmonization & D3 cleanup | Draft |
| UI-D4-P1-PLAN | `docs/superpowers/plans/2026-11-23-d4-p1-design-system-and-stylebook.md` | D4-P1 implementation plan: 10 TDD tasks (happy-dom harness, tokens.css, components.css, icon kit, singleton audio, stage sync + band lock, UI host/bridge, index/main wiring, visual stylebook, close-out) | Draft |
| UI-D4-P2-PLAN | `docs/superpowers/plans/2026-11-23-d4-p2-characters-art-and-motion.md` | D4-P2 implementation plan: 12 TDD tasks (zero-id art guard, flat cel-shaded rig + CAPY_HASH re-baseline, tapered ribbon geometry, heroSvg, motion tokens + injectable clock, motion.css, HeroStage blink/lookAt/reactions, stagger/countUp/shake, confetti + CelebrationFx seam, live stylebook heroes, close-out) | Draft |
| UI-D4-P3-PLAN | `docs/superpowers/plans/2026-11-23-d4-p3-characters-and-home.md` | D4-P3 implementation plan: 10 TDD tasks (UiBridge token mounts + close ordering, owner-ruled PLAY-only Home model + GDD/MEC-008/DECISIONS, shared screen parts + screens.css, Characters DOM screen, simplified Home DOM screen, thin Home/Characters shims + Phaser port, skin texture preload before GameScene, #FAF9F5 boot handoff, Chrome QA 360x640/360x780, close-out) | Draft |
| UI-D3-PLANS | `docs/superpowers/plans/2026-11-10-ui-d3-roadmap.md`, `-u0-boards-tokens.md`, `-u1-skin-kit.md` | D3 roadmap U0..U7 (task lists, shared interfaces), detailed plans for U0 and U1; plans for U2..U7 are written at each phase start | Draft |
| TERRAIN-DESIGN | `docs/superpowers/specs/2026-11-11-fixed-terrain-design.md` | Fixed terrain design (TER-R1..R14, now MEC-019-R<n>): segments, variants, level-up change, Shield breach, invulnerability, fairness | Approved |
| P4A-SKINS | `docs/superpowers/specs/2026-11-16-p4a-skins-design.md` | P4a skins design (MEC-011-R1..R25): 5 skins, ownership, coins, equip, save v4, Characters screen direction A (`docs/design/mockups/d3/skins.html`), Rare presentation | Approved |
| P4A-SKINS-PLAN | `docs/superpowers/plans/2026-11-16-p4a-skins.md` | P4a skins (MEC-011) implementation plan: 8 tasks (rules, save v4 + session, 3 new skins, run colours, Characters view/layout, scene + Home entry, Rare effects, docs) | Approved |
| TERRAIN-PLAN | `docs/superpowers/plans/2026-11-16-fixed-terrain.md` | Fixed terrain (MEC-019) implementation plan: 7 tasks, lead rulings FT-1..FT-8 (family key `fixedTerrain`, cause `terrain`) | Approved |
| P3-UIFIX-PLANS | `docs/superpowers/plans/2026-11-07-p3-uifix-wave1.md`, `-wave2.md`, `-wave3.md` | UI fix plans: wave 1 occlusion + color, wave 2 layout, wave 3 polish + agy re-review | Draft |
| ART-001 | `docs/specs/art/ART-001-character-coordinate-system.md` | Character anchors, look rules, action list, asset folders and production routes (capy reference) | Draft |
| ART-002 | `docs/specs/art/ART-002-capy-master-still.md` | Capy master still brief: spec files, Codex steps, acceptance checklist, motion test | Draft |
| ART-003 | `docs/specs/art/ART-003-skin-production.md` | Skin production guide: steps from the capy template, acceptance checklist, refactor needed before the 2nd skin | Draft (not fully approved) |
| MEC-001 | `docs/specs/mechanics/MEC-001-snake.md` | Snake movement, growth, self-collision, length reset | Approved |
| MEC-002 | `docs/specs/mechanics/MEC-002-mango.md` | Mango placement, golden, rot, rotten rock | Approved |
| MEC-003 | `docs/specs/mechanics/MEC-003-levels-biomes.md` | 30 levels, quotas, speed, transition, run log | Approved |
| MEC-004 | `docs/specs/mechanics/MEC-004-obstacles-director-fairness.md` | Obstacle family framework, director, fairness | Approved |
| MEC-006 | `docs/specs/mechanics/MEC-006-energy-skills.md` | Energy orbs, energy bar, 4 skills | Approved |
| MEC-007 | `docs/specs/mechanics/MEC-007-loadout.md` | Skill loadout | Approved |
| MEC-008 | `docs/specs/mechanics/MEC-008-checkpoints.md` | Checkpoints, energy carry-over, save v2 | Approved |
| MEC-011 | `docs/specs/mechanics/MEC-011-skins.md` | Skins, coins, shop, equip, Characters screen, Rare effects (P4a) | Implemented |
| MEC-012 | `docs/specs/mechanics/MEC-012-ground-tiles.md` | Mud and ice ground tiles | Approved |
| MEC-013 | `docs/specs/mechanics/MEC-013-rolling-coconuts.md` | Rolling coconuts on telegraphed lanes | Approved |
| MEC-014 | `docs/specs/mechanics/MEC-014-gates-spikes.md` | Gates on a rhythm and spike traps on a global beat | Approved |
| MEC-015 | `docs/specs/mechanics/MEC-015-patrol-npcs.md` | Patrolling cat and chicken | Approved |
| MEC-016 | `docs/specs/mechanics/MEC-016-mango-thief-bird.md` | Mango-thief bird (modifier) | Approved |
| MEC-017 | `docs/specs/mechanics/MEC-017-timed-bombs.md` | Timed bombs with a plus-shaped blast | Approved |
| MEC-018 | `docs/specs/mechanics/MEC-018-shrinking-board.md` | Shrinking board (outer ring closes), P2c | Approved |
| MEC-019 | `docs/specs/mechanics/MEC-019-terrain.md` | Fixed terrain: 12 hand-drawn maps, level-up change, Shield breach, invulnerability | Implemented |
<!-- Add rows as specs are created, e.g.:
| MEC-001 | `docs/specs/mechanics/MEC-001-jump.md` | Exact jump rules | Approved |
| INT-001 | `docs/integrations/INT-001-analytics.md` | Analytics events, consent | Draft |
-->

## 2. Routing: what to read per task
Read the "First" column; open "Then" only if the task needs it. Never read every file.
| Task | First | Then (only if needed) |
|---|---|---|
| New gameplay feature | GDD (relevant § only), STATUS | MEC spec, CODEMAP module row, related tests |
| Gameplay bug | MEC spec (or GDD §) for that behavior | CODEMAP module row → that module's files + tests |
| Balance / tuning | GDD §7, balance config | MEC spec §9 |
| Refactor | CODEMAP, ARCHITECTURE | DECISIONS (grep topic), module tests |
| UI / juice | GDD §6, §10, `docs/design/UI-MOCKUPS.md` (then the board PNG + `.dc.html` it points to) | CODEMAP ui row |
| Analytics / ads / SDK | INT spec | GDD §9, §12; CODEMAP integrations row |
| Playtest follow-up | PLAYTEST (latest entry only) | GDD §12 |
| Release | STATUS, CHANGELOG [Unreleased] | Test results, INT specs |

## 3. Requirement IDs
IDs (GDD-§n, MEC-xxx, INT-xxx) appear in specs, in test names and in a one-line comment at the main implementing function, so `grep -r "MEC-001"` finds spec, code and tests without scanning.
