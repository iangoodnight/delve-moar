# delve-moar

A homebrew-first TTRPG utility suite for game masters.

> **Status**: 🚧 Early development — Phase 0 (foundation)

## What this will be

- **Catalog** — Monsters, spells, conditions, and homebrew entries seeded from the 5e SRD
- **Encounter Builder** — Party-aware encounter building with XP budgets and CR calculations
- **Character Sheets** — A usable, self-hosted alternative to commercial VTT tools
- **CLI** — A TUI-powered power-user companion

## Stack

| Layer    | Tech                              |
|----------|-----------------------------------|
| Database | PostgreSQL (Docker)               |
| API      | FastAPI + SQLAlchemy + Alembic    |
| Web      | Vite + React + Radix UI Themes    |
| CLI      | Go + Cobra + Bubble Tea           |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Node 24](https://nodejs.org/) + [pnpm](https://pnpm.io/)
- [Python 3.12](https://www.python.org/) + [uv](https://docs.astral.sh/uv/)
- [Go 1.23+](https://go.dev/)
- [Task](https://taskfile.dev/) (task runner)

## Getting started

```sh
cp .env.example .env
# edit .env with your local values
task dev
```

See `apps/api`, `apps/web`, and `apps/cli` for service-specific documentation.
