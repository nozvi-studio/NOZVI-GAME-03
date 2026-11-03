# AGENTS.md — rules for AI agents
Ruleset version: 0.3.1

Read this whole file first. Then read `docs/STATUS.md` and `docs/README.md` (docs map + routing). Read other docs only as the routing table says. Do not rely on chat memory.

## 0. Language (mandatory)
All repository content you write is **English only**: docs, plans, code comments, commit messages, PR text, changelogs, status and review reports. The owner may talk to you in Vietnamese; still write files in English. Exceptions: player-facing localized strings and exact vendor identifiers.

## 1. Stack (filled at setup from the Game Brief; do not guess)
- Engine / framework: None — vanilla HTML5 + Canvas 2D, single-file prototype (production stack not chosen yet; see `docs/STATUS.md`)
- Language: JavaScript (browser, no build step, no modules)
- Install: `none` · Run: `python3 -m http.server 8000` then open `http://localhost:8000/prototype/mango-snake-hard.html` (or open the file directly) · Test: `none yet — add with the first gameplay task` · Typecheck/lint: `none yet`
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
- One task = one branch = one PR. Conventional Commits (`feat:`, `fix:`, `docs:`…).
- New dependency: one-line reason in the PR and in `docs/DECISIONS.md`.
- **Secrets:** never commit credentials, API secret keys, private keys, signing files or tokens; use env vars / CI secrets. Public client IDs (e.g. ad unit IDs, analytics app IDs) may be committed in config after review, separated per environment.

## 7. Definition of done
- [ ] §1 test and typecheck commands pass; game starts with no console errors
- [ ] Behavior matches the GDD / mechanic spec (or they were updated with human approval)
- [ ] STATUS.md and CHANGELOG.md updated; CODEMAP / docs map updated if structure changed; all in English

## 8. Protected actions
Pushing, installing dependencies, and editing AGENTS.md, CLAUDE.md, `.claude/` or `.github/` require the human's approval. Claude Code enforces this through `.claude/settings.json` permissions; other agents must ask first. Never read or print `.env` files.
