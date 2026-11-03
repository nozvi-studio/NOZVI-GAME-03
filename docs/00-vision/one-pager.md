# One-pager — Mango Snake

## Elevator pitch

Classic Snake, but every level the board fights back: rocks land, fences pop up, the ground rises
and hedge mazes grow in. Fill the mango bar to climb a level. Spend stamina on silly skills —
slow time, mango rain, smash an obstacle, or snip off your own tail — to survive one more level.

## Design pillars

Every feature should support at least one pillar. If it supports none, cut it.

1. **Readable danger.** Every death must feel like the player's fault. Hazards always warn
   before they become solid (the prototype already does this; keep it sacred).
2. **Escalation you can feel.** Each level adds pressure *or* variety, never just bigger numbers.
3. **Clever escapes.** Skills and wrap zones are tools for getting out of a bad spot,
   not buttons to press on cooldown.
4. **Cheeky, not cruel.** The humor is in reactions, sounds and words — it never hides
   information or punishes the player for a joke.

## Target player (hypothesis — not validated)

- Casual / mid-core mobile and web players who know Snake and want short sessions (3–8 min).
- Plays in portrait, one hand or thumbs, often with sound off.
- Motivation: "one more try", beating a best score / highest level.

## What makes it different

| Classic Snake | Mango Snake |
|---|---|
| Static empty board | Obstacles spawn, live and crumble on a timer |
| Endless | 10 levels (+ endless mode later?) with a progress bar |
| Only skill is steering | Stamina + 4 active skills |
| Walls kill | Some wall segments are portals to the other side |
| No personality | Silly death messages, reactions, sound gags |

## Hypotheses to validate (in this order)

| # | Hypothesis | How we test it | Pass signal |
|---|---|---|---|
| H1 | The core loop (current prototype) is fun for 5+ minutes | 5 playtesters, no instructions | ≥3 of 5 ask for "one more" without being prompted |
| H2 | Skills add decisions, not just power | Prototype with 2 skills | Players use skills in danger, not randomly; deaths per level don't collapse |
| H3 | Wrap zones add routes, not confusion | Prototype with 1 wrap zone layout | Wrap deaths < 15% of all deaths after 3 runs |
| H4 | The humor makes people share / smile | Watch faces, ask "what do you remember?" | Players quote a joke unprompted |
| H5 | Someone would pay or watch ads for it | Later — store page / itch.io page test | Wishlists / plays vs. similar games |

H1 matters most: if the base loop is not fun, skills and jokes will not save it.

## Scope boundary (for the first public build)

In: 10 levels, 4 obstacle families, wrap zones, stamina + 2–4 skills, best score, humor pass.
Out (for now): accounts, online leaderboards, skins shop, level editor, multiplayer.
