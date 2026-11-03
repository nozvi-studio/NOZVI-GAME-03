# Level progression and tuning

Numbers below are copied from the prototype (`// ---------- tuning ----------` block).
Display levels are 1-based; the code uses 0-based `level`.

## Current curve [PROTOTYPE]

| Level | Mangoes needed | Tick (ms) | Speed | Spawn interval (s) | Max small hazards | Unlocks |
|---|---|---|---|---|---|---|
| 1 | 4 | 140 | 1.0× | 5.0 | 2 | Rocks |
| 2 | 5 | 136 | 1.03× | 4.7 | 2 | |
| 3 | 6 | 132 | 1.06× | 4.4 | 3 | Fences, line rocks |
| 4 | 7 | 128 | 1.09× | 4.1 | 3 | T/Z fences |
| 5 | 8 | 124 | 1.13× | 3.8 | 4 | Rising ground, corner/block rocks, F/U/+ fences |
| 6 | 9 | 120 | 1.17× | 3.5 | 4 | |
| 7 | 10 | 116 | 1.21× | 3.2 | 5 | Hedge mazes |
| 8 | 11 | 112 | 1.25× | 2.9 | 5 | |
| 9 | 12 | 108 | 1.30× | 2.6 | 6 | Two terrain events at once |
| 10 | 13 | 104 | 1.35× | 2.3 | 6 | |
| Max | — | 100 | 1.40× | 2.0 | 7 | |

Total to reach max level: **85 mangoes**. Mango rot timer: `max(4 s, 8 s − 0.15 s × eaten)`.

## Observations

- `MIN_MS = 95` is never reached (max level gives 100 ms). Either lower `MS_PER_LEVEL` floor
  or remove `MIN_MS` — keep the code honest about what it does.
- Speed only grows 1.4×; most of the difficulty comes from obstacles. That fits pillar 2.
- Rot timer reaches its 4 s floor after ~27 mangoes (around level 5). After that the mango
  pressure is flat — consider tying the floor to level instead.
- 85 mangoes at ~3–5 s each ≈ 5–7 min for a full run, if the player survives. Matches the
  3–8 min target, but **measure it** in playtests.

## Proposed additions

| Level | Proposed new element |
|---|---|
| 2 | Stamina bar appears, first skill (Slow-mo) unlocks — tutorial moment |
| 3 | First wrap-zone pair |
| 4 | Tail Snip unlocks |
| 5 | Second wrap pair |
| 6 | Headbutt unlocks |
| 8 | Mango Rain unlocks, banana peels |
| 10 | "Final exam": short boss-like event (e.g. lawnmower sweeps) |

## How to tune

1. Change one variable at a time.
2. Record in the playtest log: average level reached, death causes, run length.
3. Target death distribution for a typical player: no single cause > 40% of deaths
   (if "self" dominates, the board is too cramped; if "rock" dominates, warnings are too short).
