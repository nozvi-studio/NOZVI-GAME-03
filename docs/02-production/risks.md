# Risk register

Likelihood / impact: L (low), M (medium), H (high). Review at the end of every milestone.

| # | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Skills make the game easier and less tense | H | H | Costs + side effects, no passive regen, no-skill bonus, playtest H2 | Design |
| R2 | Too many systems for a small team (skills × obstacles × wrap × humor) | H | H | Strict milestone order, cut anything that fails its playtest | Producer |
| R3 | Mobile UI too crowded (D-pad + skills) | M | H | 2-skill loadout; test on a real phone early | Design |
| R4 | "Snake remake" market is crowded; low discoverability | H | H | Lead with the hook (skills + escalating board + humor) in every screenshot/GIF; test the store page early | Business |
| R5 | Late levels become cluttered and unreadable | M | M | Hazard cap, only one big event at a time, readability check in playtests | Design |
| R6 | Wrap zones break fairness logic (BFS, spawns) | M | M | Central `wrap()` helper + tests for reachability | Tech |
| R7 | Humor doesn't translate (VI ↔ EN) | M | L | String table from day one, separate joke pools per language | Content |
| R8 | Single-file prototype becomes the production code by accident | H | M | Decide stack at M4; rewrite cleanly, reuse tuning + rules, not the file | Tech |
| R9 | Name / look too close to an existing Snake game | L | H | Original art, name check before going public | Business |
