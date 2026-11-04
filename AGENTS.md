# AGENTS.md — rules for AI agents
Ruleset version: 0.3.2

Read this whole file first. Then read `docs/STATUS.md` and `docs/README.md` (docs map + routing). Read other docs only as the routing table says. Do not rely on chat memory.

## 0. Language (mandatory)
All repository content you write is **English only**: docs, plans, code comments, commit messages, PR text, changelogs, status and review reports. The owner may talk to you in Vietnamese; still write files in English. Exceptions: player-facing localized strings and exact vendor identifiers.

## 1. Stack (filled at setup from the Game Brief; do not guess)
- Engine / framework: Phaser 3 (web-first, portrait) + Vite; Matter.js (bundled with Phaser) for the marble machine. Exact versions are verified and pinned in Phase 0 (see `docs/DECISIONS.md`, 2026-11-03).
- Language: TypeScript (strict). Pure game logic in `src/core/` and `src/meta/` (no Phaser imports); Phaser scenes in `src/game/`.
- Install: `npm install` · Run: `npm run dev` · Test: `npm test` (Vitest) · Typecheck/lint: `npm run typecheck` — these scripts are created by the Phase 0 scaffold; until it lands, the only runnable code is the reference prototype: `python3 -m http.server 8000` then open `http://localhost:8000/prototype/mango-snake-hard.html`.
If any value is `<...>`, ask the human before writing gameplay code.

## 2. Source of truth (authority order)
| Information | Authoritative file | Created |
|---|---|---|
| Product goal, pillars, scope, milestones | `docs/GDD.md` | at setup |
| Exact gameplay behavior of one mechanic | `docs/specs/mechanics/MEC-xxx.md` | only when a mechanic has non-trivial rules or edge cases |
| Tuning numbers | `config/balance.json` (or stack equivalent) | first gameplay task |
| Module boundaries | `docs/ARCHITECTURE.md` | when there are 2+ modules worth separating |
| Third-party SDK / analytics payloads, consent | `docs/integrations/<name>.md` | when the SDK is added (M3/M4) |
| Technical trade-offs | `docs/DECISIONS.md` | append as needed |
| Test evidence | `docs/PLAYTEST.md`, tests in repo | first playtest |
Rules: one source of truth per rule or number; the GDD links to specs instead of repeating them. Never create empty placeholder files. If two sources conflict or a needed one is missing, stop and ask.

## 2b. Context budget (do not scan the project)
1. **Never** read all of `src/` or `docs/`, and never open files just to "get familiar". Start from `docs/README.md` (routing) and `docs/CODEMAP.md` (where code lives).
2. Locate before reading: search by requirement ID (`MEC-001`), symbol or file name with grep/glob; then open only the matching files. Read only the relevant section of long docs (by heading).
3. Soft budget: before writing a plan, open about 8 files. You may read more when the task needs it; state the reason in one line. If you keep needing more, the task is too big or the maps are stale: say so and propose splitting the task or fixing the map.
4. For broad searches ("where is X used?"), delegate to a search subagent if available and keep only its conclusion. Subagents are read-only or work in a separate git worktree; only the main agent merges.
5. Skip generated, vendored and binary paths listed in CODEMAP "Do not read".
6. **Keep the maps true:** adding/moving/removing a module or entry point → update `docs/CODEMAP.md`; adding/renaming/deprecating a doc → update `docs/README.md`. Same PR. A stale map is a bug.
7. Keep memory small: STATUS.md ≤ 60 lines; CHANGELOG: read only `[Unreleased]`; DECISIONS: grep by topic, do not read top to bottom; PLAYTEST: latest entry only.
8. Put the requirement ID in test names and a one-line comment at the main implementing function, so grep finds spec, code and tests together.

## 2c. GitNexus code graph (owner 2026-11-04)
The repo is indexed by GitNexus (local index in `.gitnexus/`, git-excluded; MCP tools `mcp__gitnexus__*` or CLI `node .gitnexus/run.cjs`).
1. **Task start:** run `node .gitnexus/run.cjs status`; if stale, run analyze (below) and wait. Before editing a symbol, use GitNexus (`query` / `context` / `impact`) to locate code and check blast radius instead of scanning files.
2. **Task end (after commit/merge):** refresh the index **in the background** (do not block on it): `node .gitnexus/run.cjs analyze --index-only --workers 2`.
3. Always pass `--index-only`: GitNexus must not inject text into AGENTS.md / CLAUDE.md or install skills into `.claude/`. Do not commit `.gitnexus/`.
4. If GitNexus is missing (`Cannot find module`), run `npx gitnexus analyze --index-only` (or `gitnexus analyze --index-only` if installed globally).

## 3. Session protocol (memory)
1. **End of every session (even if unfinished):** rewrite `docs/STATUS.md` (Now / Next / Blockers / Last session).
2. **Every change you commit:** add a line under `## [Unreleased]` in `CHANGELOG.md` in the same PR.
3. **Non-obvious choice:** append to `docs/DECISIONS.md`.

## 4. Superpowers workflow (mandatory)
| Situation | Skill |
|---|---|
| New feature / unclear request | `brainstorming` → design approved by human before code |
| Approved design | `writing-plans` |
| Implementing | `executing-plans` (or `subagent-driven-development`) + `test-driven-development` |
| Bug | `systematic-debugging` — root cause before fix |
| Before saying "done" | `verification-before-completion` |
| Branch finished | `requesting-code-review` → `finishing-a-development-branch` |
- Trivial changes (one balance value, a typo) may skip brainstorming and planning.
- If Superpowers is not available: tell the human and **wait for approval** before continuing with the same steps manually (design → plan → TDD → verify). Never silently skip them.

## 5. Scope guard
- Build only what is in the GDD's current milestone. Out-of-scope ideas go to the GDD "Parking lot".
- If a GDD section marked **[REQUIRED]** is empty or `TBD`, do not start gameplay code; ask.
- Default milestone order: M1 core loop → M2 juice → M3 meta → M4 monetization/ship. Changing it requires a DECISIONS.md entry approved by the human.
- Approved gameplay rules are never changed silently: propose → impact (specs, code, tests, metrics) → human approval → implement → update docs in the same PR.

## 6. Code rules
- Gameplay logic lives in a pure core module with no engine/rendering imports, so it is unit-testable (path defined in ARCHITECTURE or `src/core/` by default).
- No magic numbers; tuning values live in the balance config.
- One task = one branch. Conventional Commits (`feat:`, `fix:`, `docs:`…).
- **Branching (owner 2026-11-04):** `master` ← `dev` ← `version/vX.Y` ← task branches (`feat/…`, `fix/…`, `docs/…`, `chore/…`). Create each task branch from the current version branch (see STATUS) and merge it back with `git merge --no-ff` — no PR needed — after tests + typecheck pass. Merge the version branch into `dev` at a phase exit, and `dev` into `master` on release. Never branch from or commit to `master`/`dev` directly; local `main` is the old Ant Trail project, never use it.
- New dependency: one-line reason in the PR and in `docs/DECISIONS.md`.
- **Secrets:** never commit credentials, API secret keys, private keys, signing files or tokens; use env vars / CI secrets. Public client IDs (e.g. ad unit IDs, analytics app IDs) may be committed in config after review, separated per environment.

## 6b. Test scope (owner 2026-11-04)
- **While working:** run only the minimal tests for what you touched, e.g. `npx vitest run <path-or-pattern>` or `-t "MEC-002"`, plus `npm run typecheck` when types changed. Do not run the full suite after every edit.
- **Before a commit or a merge:** run the full suite `npm test` and `npm run typecheck` (sequentially); both must pass. `npm run test:fuzz` only where the plan or a phase exit requires it.

## 7. Definition of done
- [ ] §1 test and typecheck commands pass; game starts with no console errors
- [ ] Behavior matches the GDD / mechanic spec (or they were updated with human approval)
- [ ] STATUS.md and CHANGELOG.md updated; CODEMAP / docs map updated if structure changed; all in English

## 8. Protected actions
Pushing, installing dependencies, and editing AGENTS.md, CLAUDE.md, `.claude/` or `.github/` require the human's approval. Claude Code enforces this through `.claude/settings.json` permissions; other agents must ask first. Never read or print `.env` files.
