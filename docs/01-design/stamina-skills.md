# Stamina and skills [PROPOSED]

## Goal

Give the player **escape tools** with a cost, so a run is about *when* to spend, not only how
to steer. Supports pillar 3 ("Clever escapes").

## The core risk (read first)

Every skill proposed here **removes** a source of difficulty:

| Skill | Removes |
|---|---|
| Slow-mo | Speed pressure |
| Mango Rain | Level progress pressure |
| Headbutt | Obstacle pressure |
| Tail Snip | Self-collision pressure (length is *the* difficulty of Snake) |

If skills are cheap, the game gets easier and *more boring* as you play. So each skill needs a
real cost and ideally a **side effect** that creates a new, funny problem. Balance rule:
**a perfect player should be able to clear level 10 without skills; skills buy survival for
imperfect players, at a price.**

## Stamina economy

| Source | Amount | Why |
|---|---|---|
| Eat mango | +10 | Ties stamina to the core loop |
| Eat golden mango | +25 | Makes golden mangoes worth the risk |
| Near-miss (pass next to a solid obstacle) | +2, max once/sec | Rewards skilled, risky play |
| Passive regen | **none** | Regen rewards stalling in a safe corner |

- Max stamina: 100. Starts each run at 30 (enough for one emergency skill).
- Stamina bar sits under the level bar. Skill buttons grey out when unaffordable.
- All numbers are first guesses — move them into the tuning table once implemented.

## Skills

### 1. Slow-mo ("Chill Pill") — cost 30
- Tick length ×1.8 for 3 s. Hazard timers and mango rot keep running at **normal** speed
  (otherwise it is just a pause button).
- Side effect / joke: music drops an octave, snake eyes go sleepy.
- Design note: the most "fair" skill; good candidate for the first build.

### 2. Mango Rain — cost 60
- Spawns 3 extra mangoes for 5 s (they rot fast). Each counts toward the bar.
- Original idea was "greatly increase food to level up" — that risks skipping levels without
  playing them. Proposed limits: cannot be used in the last 2 mangoes of a level; extra mangoes
  do **not** give stamina (no infinite loop).
- Side effect: rotten rain mangoes leave rocks too → greed is punished. Funny *and* fair.

### 3. Headbutt — cost 40
- Next solid obstacle the head touches within 2 s is destroyed instead of killing you
  (fence/hedge: only the touched cell breaks; rotten-mango rocks: fully).
- Does not work on board edges or your own body.
- Side effect: snake is "dizzy" — next 2 turns are delayed by one tick (small, readable cost).
- Design note: activated *before* impact, so it rewards reading the board. A "shield that
  saves you automatically" would be more forgiving but removes the decision.

### 4. Tail Snip — cost 50
- Cuts the last 40% of the body (minimum length 3).
- The cut piece becomes a **wriggling tail obstacle** for 6 s, then crumbles.
  This is the "bựa" payoff and also the cost: you dropped a wall behind you.
- Score is not reduced; bar progress is not reduced.

## Open questions

- Do players get all 4 skills from the start, or unlock them by level? Unlocking one every 2
  levels also teaches them one at a time (recommended).
- Loadout of 2 skills before a run (solves mobile UI crowding) vs. all 4 always available.
- Does using a skill cancel the "no-skill level bonus"? (Proposed: yes.)

## Build order recommendation

1. Stamina bar + **Slow-mo** + **Tail Snip** (one defensive, one "bựa"). Playtest (H2).
2. Only if H2 passes: Headbutt, then Mango Rain (Mango Rain is the most likely to break balance).
