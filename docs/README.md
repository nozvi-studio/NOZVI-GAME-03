# Docs index

| Area | File | Purpose | Notion type |
|---|---|---|---|
| Vision | `00-vision/one-pager.md` | Pitch, pillars, audience, hypotheses to validate | Page |
| Design | `01-design/gdd.md` | Game Design Document: core loop, controls, systems map | Page |
| Design | `01-design/stamina-skills.md` | Stamina economy + the 4 skills | Page |
| Design | `01-design/wrap-zones.md` | Wall zones the snake can pass through | Page |
| Design | `01-design/obstacles.md` | Obstacle catalog (existing + proposed) | Page + DB |
| Design | `01-design/level-progression.md` | Difficulty curve and tuning numbers | Page |
| Design | `01-design/humor-and-tone.md` | The "bựa" layer: rules and idea bank | Page |
| Production | `02-production/roadmap.md` | Milestones with exit criteria | Page |
| Production | `02-production/risks.md` | Risk register | Page |
| Playtest | `03-playtest/playtest-plan.md` | How to test, what to measure | Page |
| Playtest | `03-playtest/session-template.md` | Copy once per playtest session | Template |
| Tech | `04-tech/prototype-architecture.md` | How the prototype works + tech debt | Page |
| Decisions | `decision-log.md` | Decisions and their reasons | Page (or DB) |
| Databases | `notion-databases/*.csv` | Backlog, obstacles, skills, playtest log | Database |

## Importing into Notion

Notion can import Markdown and CSV directly:

1. In Notion: **Settings → Import** (or `•••` on a page → **Import**).
2. Choose **Text & Markdown** and select the `.md` files. Each becomes a page.
   You can zip the whole `docs/` folder and import the zip to keep the folder structure.
3. Choose **CSV** for each file in `notion-databases/`. Each becomes a database.
   After import, change the column types (Select, Number, Status) — CSV imports everything as text.

Suggested Notion structure:

```
Mango Snake (team space)
├── 📌 One-pager
├── 📘 Design            ← gdd, mechanics, obstacles, progression, humor
├── 🗺️ Production        ← roadmap, risks, decision log
├── 🧪 Playtests         ← plan + "Playtest log" database (one row per session, template body)
├── ⚙️ Tech              ← prototype architecture
└── 🗃️ Databases         ← Backlog, Obstacles, Skills
```

### Source of truth

Pick one. Recommendation: **the repo is the source of truth for design numbers and specs**
(they change together with code and have history), **Notion is the source of truth for tasks,
playtest notes and discussion**. If you edit a spec in Notion, copy it back here in the same week,
or the two will drift apart.
