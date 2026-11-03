# Mango Snake (working title)

> One-line pitch: Steer a growing snake to eat mangoes and climb levels while the board keeps dropping rocks, fences, rising ground and hedge mazes on you — and spend stamina on silly skills to escape.

**Genre:** Casual · arcade **Platform:** web (prototype); release platform not decided yet **Status:** see [docs/STATUS.md](docs/STATUS.md)

## Quick start
```bash
# install: none (no dependencies, no build step)
python3 -m http.server 8000   # then open http://localhost:8000/prototype/mango-snake-hard.html
# test: none yet (added with the first gameplay task)
```

## Docs map
| File | Purpose | Who updates |
|---|---|---|
| [AGENTS.md](AGENTS.md) | Rules for AI agents (read first) | Human |
| [docs/GDD.md](docs/GDD.md) | Game design: product intent, scope, milestones | Human (AI may propose) |
| [docs/STATUS.md](docs/STATUS.md) | Project memory: now, next, blockers | AI every session |
| [CHANGELOG.md](CHANGELOG.md) | What changed, per version | AI with every change |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Why we chose X over Y | AI / Human |
| [docs/README.md](docs/README.md) | Docs map: index + what to read per task | AI when docs change |
| [docs/CODEMAP.md](docs/CODEMAP.md) | Code map: where code lives | AI when structure changes |
| `docs/specs/`, `docs/integrations/`, `docs/ARCHITECTURE.md` | Detailed specs, created only when needed | AI / Human |

## AI setup (required)
Built with an AI agent + Superpowers ([obra/superpowers](https://github.com/obra/superpowers), MIT). In Claude Code:
```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```
Other agents (Codex, Cursor): install Superpowers for that harness. All repository content is written in English.
