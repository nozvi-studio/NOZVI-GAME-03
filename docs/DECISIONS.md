# Decision log
Append-only. Format: `## YYYY-MM-DD — <decision>` then Context / Choice / Alternatives / Consequence (1 line each).

## 2026-11-03 — Adopt studio ruleset 0.3.1 for this repo
- Context: The repo started with ad-hoc design docs and Notion CSVs that duplicated the studio's "AI Vibe-Code Rules — Casual Game" structure.
- Choice: Keep exactly the ruleset's Setup files; condense the earlier docs into `docs/GDD.md`; detailed mechanic specs are written on demand (Studio Standards template 03).
- Alternatives: Keep both doc sets (two sources of truth); import everything into Notion only.
- Consequence: One source of truth per topic; the earlier detailed proposals are only in git history (commit `9fe2bb0`) and must be rewritten as MEC specs when needed.

## 2026-11-03 — The single-file HTML prototype is the current baseline; production stack postponed
- Context: The playable prototype already validates movement, hazards and juice; the target platform is not decided.
- Choice: Keep iterating in `prototype/mango-snake-hard.html` (vanilla JS, Canvas 2D, no build) until the platform decision.
- Alternatives: TypeScript + Canvas (Vite); Phaser 3; Godot 4.
- Consequence: AGENTS §6 rules (pure `src/core/`, balance config, tests) apply from the first gameplay task after the stack is chosen; the prototype is tech debt, not the production codebase.

## 2026-11-03 — Production stack: Phaser 3 + TypeScript + Vite (supersedes "production stack postponed")
- Context: The owner redesigned the game (30 levels, skills, marble-machine meta) and wants a web-first build that is cheap to playtest; the owner already knows JS/TS.
- Choice: Phaser 3 + TypeScript + Vite, Vitest for the pure core, Matter.js (bundled with Phaser) for the marble machine; versions verified and pinned in Phase 0.
- Alternatives: TS + raw Canvas (no physics/scene tooling); Godot 4 (new language, heavier web build); Cocos Creator (smaller English ecosystem); Unity (too heavy for a 2D grid game).
- Consequence: AGENTS.md §1 Stack line must be updated (protected file, needs owner approval); the HTML prototype is frozen once P0 reaches parity.

## 2026-11-03 — Game redesign v0.2: 30 levels, length reset, energy skills without cooldowns, in-run checkpoint
- Context: Owner's design session; a growing snake would fill the 17×17 board long before level 30.
- Choice: 30 levels in 6 biomes × 5; snake length resets to 4 on level up; energy orbs fund 4 skills by energy cost only (no cooldowns), 2 chosen per run; one checkpoint continue at L11, armed by reaching L16, with a speed ramp from L1 speed.
- Alternatives: keep length across levels (board fills, Tail Snip becomes mandatory); energy + cooldowns (double gate, harder to read); new runs start at the checkpoint (removes early-level farming).
- Consequence: GDD v0.2; MEC-003/006/007/008 specs needed before P1; checkpoint reading and Mango Rain as a skill are marked ASSUMPTION for owner confirmation.

## 2026-11-03 — Meta: marble machine with public odds, no real money
- Context: Owner wants a pachinko-style marble machine dropping skins or coins, with cosmetic-only rewards.
- Choice: marbles and coins earned only by play; outcome chosen by a weighted table then animated; odds shown in-game and tested against config; pity after 40 marbles; duplicates convert to coins; coins buy skins directly.
- Alternatives: real-money marbles (loot-box regulation, store odds rules); pure physics outcomes (odds cannot be published exactly).
- Consequence: any future monetization needs a new decision and a legal check; MEC-009/010/011 specs in P4.

## 2026-11-03 — Art direction: hybrid chunky-cartoon UI + flat readable board
- Context: Owner's reference screenshot uses a chunky, thick-outline cartoon style; the board must stay readable at speed on a 5" phone.
- Choice: chunky cartoon for UI, characters, skins and the marble machine; flat low-detail board with high-contrast obstacles; one palette per biome; style tile validated on a phone before asset production.
- Alternatives: flat pastel everywhere (cheap, bland); hand-drawn doodle; pixel art.
- Consequence: art production starts in P3; P1/P2 use greybox; reference games inspire the feel only, never layouts or icons.

## 2026-11-03 — Roadmap as 6 big phases, each with one spec + one plan, executed as small PRs
- Context: Owner wants large phases for AI-driven development with Superpowers.
- Choice: P0 Foundation → P1 New core loop (playtest gate) → P2 Content → P3 Juice & art → P4 Meta → P5 Ship; owner approves each phase's spec and exit criteria; tasks stay one PR each.
- Alternatives: many small milestones (more overhead for the owner); one PR per phase (unreviewable diffs).
- Consequence: Maps onto AGENTS M1–M4 order (P0–P2 = M1, P3 = M2, P4 = M3, P5 = M4); wrap zones (MEC-005) parked.
