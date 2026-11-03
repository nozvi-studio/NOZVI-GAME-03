# Obstacle catalog

All obstacles follow the prototype's fairness rules:

- **Warn first** (blink speeds up as impact approaches), then solid.
- Never spawn near the head or in the 4 cells straight ahead.
- Never become solid on a cell the snake occupies (waits until the body passes).
- Mangoes never spawn in a pocket that is or will become closed.
- Only one "big event" (maze / rising ground) at a time.

Also kept as a database: `../notion-databases/obstacles.csv`.

## Existing [PROTOTYPE]

| Name | Unlock (level) | Shape | Warn | Lifetime | Notes |
|---|---|---|---|---|---|
| Rotten-mango rock | 1 | 1 cell | — | Permanent | Only placed if the mango was reachable |
| Falling rock | 1 | 1 cell → lines (L3) → corner/block (L5) | 1.5 s | 6–10 s | Most common hazard |
| Fence | 3 | Line (gap if ≥7), L, then T/Z, then F/U/+ | 2 s | 9–13 s | Random rotation/mirror |
| Rising ground | 5 | Wave strip or 4×4 checkerboard | 0.9 s per cycle | 18–24 s | Cycles down/warn/up every 3.4 s |
| Hedge maze | 7 | 4 hand-made layouts with doors | 2.6 s | 14–18 s | 26 s cooldown |

## Proposed new obstacles

Ranked by (fun + humor) ÷ cost to build. Each must pass a playtest before it stays.

| Name | Idea | Fairness risk | Humor | Cost |
|---|---|---|---|---|
| **Wriggling tail** | Your cut-off tail (Tail Snip) wiggles around for 6 s | Low (you made it) | High | Low — reuses snake rendering |
| **Rolling coconut** | Moves 1 cell per 2 ticks in a straight line, bounces off walls | Medium — needs a clear path preview | Medium | Medium |
| **Sleepy cat** | Cat lies across 3 cells; sometimes rolls over to the side (warns with a yawn) | Low | High | Medium (art) |
| **Banana peel** | Not solid: stepping on it makes the snake slide 2 extra cells in the same direction | Medium | High | Low |
| **Fake mango** | Looks like a mango, slightly wrong color, turns into a rock when eaten → "lol" | **High** — breaks "readable danger" unless the tell is learnable | High | Low |
| **Conveyor strip** | Cells push the snake one step sideways | Medium | Low | Medium |
| **Lawnmower** | Crosses one row/column after a long warning; destroys rocks too | Low (long warning) | High | Medium |

Recommendation: start with **Wriggling tail** (comes for free with Tail Snip) and **Banana peel**
(cheap, funny, introduces a new verb). Do the **Fake mango** only with a clear, consistent tell,
otherwise it violates pillar 1.

## Combination rules (escalation)

Variety should come from **combinations**, not just new types:

- L1–2: rocks only, sparse.
- L3–4: rocks + fences.
- L5–6: + rising ground (big event).
- L7–8: + mazes (big event alternates with ground).
- L9–10: two terrain events allowed, highest spawn rate, proposed new obstacles mixed in.
