# Game Design Document

Version 0.1 — derived from `prototype/mango-snake-hard.html` + new proposals.
Sections marked **[PROTOTYPE]** already exist in code. **[PROPOSED]** are not built yet.

## 1. Core loop

```
steer → eat mango → bar fills (+stamina) → level up → new obstacles unlock / speed up
   ↑                                                                   │
   └──── dodge hazards, use skills / wrap zones to escape ←────────────┘
```

- **Second-to-second:** steer, read warnings, avoid your own tail.
- **Level-to-level (30–60 s):** fill the bar; each level feels a bit faster or has a new threat.
- **Run (3–8 min):** reach the highest level / best score. Death restarts from level 1.

## 2. Board and movement [PROTOTYPE]

- 17×17 grid, fixed-tick movement (140 ms at level 1, 4 ms faster per level).
- Input buffer of up to 3 turns; instant reverse is blocked.
- Death: board edge (except wrap zones), own body, any solid obstacle.
- 3-2-1 countdown at start and after every pause.

## 3. Mangoes [PROTOTYPE]

- One mango on the board at a time, always spawned in a reachable cell.
- Mangoes **rot**: a ring timer counts down (8 s, shrinking to 4 s as you eat more).
  A rotten mango leaves a **permanent rock** — only if it was fair (reachable).
- **Golden mango:** 15% chance after 3 eaten; half the timer, +3 score, +2 bar progress.

## 4. Levels [PROTOTYPE]

- Mangoes needed for level *n* (0-based): `4 + n` → 4, 5, 6 … 13. 85 mangoes to finish level 10.
- Level-ups unlock obstacle families. Full table: `level-progression.md`.

## 5. Obstacles [PROTOTYPE + PROPOSED]

Lifecycle: **warn (blinking red/orange) → solid → flicker → crumble.**
Never lands on the snake. Details and new ideas: `obstacles.md`.

## 6. Wrap zones [PROPOSED]

Some edge segments are portals: exit on one side, appear on the opposite side.
Spec: `wrap-zones.md`.

## 7. Stamina and skills [PROPOSED]

A stamina bar filled mainly by eating. Four skills: **Slow-mo**, **Mango Rain**, **Headbutt**
(break obstacle), **Tail Snip** (cut own length). Spec: `stamina-skills.md`.

## 8. Scoring

- [PROTOTYPE] +1 per mango, +3 per golden mango. Best score saved locally.
- [PROPOSED] Level-clear bonus = `level × 5`; small bonus for finishing a level without skills
  (rewards skilled play so skills don't feel mandatory).

## 9. Controls

| Platform | Steer | Skills [PROPOSED] |
|---|---|---|
| Keyboard | Arrows / WASD | `J K L ;` or `1–4` |
| Mobile | D-pad or swipe | Skill buttons next to the D-pad |

**Open problem:** a D-pad + 4 skill buttons is crowded on a phone in portrait.
Options: (a) only 2 skill slots, chosen before the run; (b) one skill button that uses the
"equipped" skill; (c) radial menu. Recommendation: test (a) first — it is also a free
source of replayability (loadouts).

## 10. Feedback and juice [PROTOTYPE]

Particles, gulp animation, score bump, screen shake on death, level-up glow, synth SFX,
vibration, reduced-motion support. Humor layer: `humor-and-tone.md`.

## 11. Meta / retention [PROPOSED, low priority]

Do not build until H1–H3 pass. Candidates: daily seeded run, endless mode after level 10,
unlockable cosmetic snakes, achievements ("Ate 0 golden mangoes and still won").

## 12. Open questions

- Is 10 levels the right length? (Measure average run length in playtests.)
- Do rotten-mango rocks + new obstacles make late levels too cluttered?
- Should death keep the level reached (checkpoints) or always restart? Restart is more
  "arcade"; checkpoints help casual retention. Decide after playtests.
