# Wrap zones [PROPOSED]

## What

Marked segments of the board edge act as portals: moving off the board there makes the snake
appear on the opposite edge, same row/column. The rest of the edge still kills.

## Why

- Adds **routes**: a way out when the board is cluttered (pillar 3).
- Classic Snake variants either always wrap or never wrap. *Partial* wrapping is a decision:
  "is the portal close enough to use?"

## Rules (first version)

1. Portals come in **pairs** on opposite edges, same row/column, length 2–4 cells.
2. Always visually marked (animated dashed edge + same color on both sides).
3. Portals can move or switch on/off between levels (later: on a timer, with a warning — same
   warn → active rule as obstacles).
4. The exit cell and 2 cells beyond it are kept clear of new obstacle spawns
   (otherwise a portal can teleport you into a wall — unfair).
5. The body wraps too: rendering must draw the body split across both edges.

## Proposed rollout

| Level | Portals |
|---|---|
| 1–2 | None (learn the base game) |
| 3 | One fixed pair, left/right, middle rows |
| 5+ | Two pairs |
| 7+ | Pairs move between levels |
| Endless | Portals blink on/off on a timer |

## Humor hooks

- Snake makes a "whoosh" + tiny "wheee" sound on first wrap of a run.
- Death by plain wall right next to a portal: "So close. The portal was RIGHT THERE."

## Technical impact (see `../04-tech/prototype-architecture.md`)

- `inBounds` checks in `step()` and in the BFS `reachable()` must use a `wrap(x, y)` helper,
  or mangoes may be judged unreachable when they are reachable through a portal.
- `nearHead` / fairness checks must consider the wrapped lane ahead of the head.
- Snake rendering currently draws one continuous stroke; it must break the path at a wrap.
- Interpolation (`headFrom` → head) must not lerp across the whole board on a wrap.
