# Roadmap

Each milestone has an **exit criterion**. Do not start the next one until it is met — or
until you consciously decide to change the plan (write that in `../decision-log.md`).

## M0 — Validate the core (1 week)

- [ ] 5 playtests of the current prototype with no explanation (`../03-playtest/playtest-plan.md`).
- [ ] Add a death-cause + level-reached log (console or localStorage) to collect data.
- **Exit:** H1 passes (≥3 of 5 want another run). If not: fix the core before anything else.

## M1 — Stamina + 2 skills (1–2 weeks)

- [ ] Stamina bar UI (keyboard + mobile).
- [ ] Slow-mo and Tail Snip (with wriggling-tail obstacle).
- [ ] Skill buttons on mobile without breaking the D-pad.
- **Exit:** H2 passes; average level reached does not jump by more than ~2 levels.

## M2 — Wrap zones (1 week)

- [ ] `wrap()` helper used by movement, BFS, fairness checks, rendering.
- [ ] One fixed pair from level 3.
- **Exit:** H3 passes.

## M3 — Humor pass + remaining skills (2 weeks)

- [ ] Death-message pools, reaction animations, SFX gags.
- [ ] Headbutt, Mango Rain (only if M1 balance held).
- [ ] 1–2 new obstacles (banana peel, wriggling tail already done).
- **Exit:** H4 signal in playtests; no feature makes a death feel unfair.

## M4 — Public test build (1–2 weeks)

- [ ] Decide engine/stack for the real build (see `../04-tech/prototype-architecture.md`).
- [ ] Settings, onboarding (first-run hints), simple analytics.
- [ ] Publish on itch.io (web) and/or a test store listing.
- **Exit:** real numbers: plays, average session length, D1 return if measurable.

## Later / parking lot

Endless mode, daily seeded run, cosmetics, online leaderboard, Vietnamese localization,
monetization (ads vs. premium — decide only after M4 data).

## Estimates

The week numbers are rough guesses for a solo developer working part-time with AI coding help.
Track actual time per milestone and correct the next estimate with it.
