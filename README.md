# NOZVI-GAME-03 — Mango Snake (working title)

A level-climbing remake of classic Snake. Eat mangoes to fill the level bar, survive obstacles that
keep landing, rising and rotating in, and use a stamina-powered skill kit to get out of trouble.
Tone: silly, a bit cheeky ("bựa"), never mean.

> Status: **prototype / pre-production.** The playable prototype is a single HTML file.
> Everything under `docs/` is a proposal until it is validated by playtests.

## Repository layout

```
prototype/
  mango-snake-hard.html     # current playable prototype (open in any browser)
docs/
  README.md                 # doc index + how to import everything into Notion
  00-vision/                # one-pager, pillars, target player, hypotheses
  01-design/                # GDD, mechanics, obstacles, progression, humor
  02-production/            # roadmap, milestones, risks
  03-playtest/              # playtest plan + session template
  04-tech/                  # prototype architecture, tech decisions
  notion-databases/         # CSV files that import into Notion as databases
  decision-log.md           # every important decision, with the reason
```

## Run the prototype

Open `prototype/mango-snake-hard.html` in a browser. No build step, no dependencies
(only Google Fonts is loaded from the network).

Controls: arrow keys / WASD, on-screen D-pad or swipe. `P`/`Space`/`Esc` pause, `M` mute.

## Where to start reading

1. `docs/00-vision/one-pager.md` — what the game is and why it might be worth making.
2. `docs/01-design/gdd.md` — the core loop and how the systems fit together.
3. `docs/01-design/stamina-skills.md` and `docs/01-design/wrap-zones.md` — the new mechanics.
4. `docs/02-production/roadmap.md` — what to build first, and what to postpone.
