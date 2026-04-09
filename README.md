# delve-moar

A homebrew-first TTRPG utility suite for game masters — catalog, encounter
builder, and character tools, all self-hosted and SRD-powered.

> **Status**: 🚧 Early development — Phase 0 complete, Phase 1 in progress

---

## What this will be

| Feature | Description |
|---------|-------------|
| **Catalog** | Monsters, spells, conditions, and homebrew entries seeded from the 5e SRD |
| **Encounter Builder** | Party-aware encounter building with XP budgets and CR calculations |
| **Character Sheets** | A usable, self-hosted alternative to commercial VTT tools |
| **CLI** | A TUI-powered power-user companion (`dm`) |

---

## Architecture

| Layer | Tech |
|-------|------|
| **Database** | PostgreSQL 17 (Docker) |
| **API** | Python · FastAPI + SQLAlchemy 2 async + Alembic |
| **Web** | TypeScript · Vite + React 19 + Radix UI Themes |
| **CLI** | Go · Cobra + Bubble Tea |
| **Monorepo** | pnpm workspaces + Turborepo (TS), Taskfile (root) |

---

## Prerequisites

Install all of the following before running anything locally.

### Runtime dependencies

| Tool | Version | Install |
|------|---------|---------|
| [Docker](https://docs.docker.com/get-docker/) + Compose | latest | Docker Desktop or `brew install --cask docker` |
| [Node.js](https://nodejs.org/) | 24 (see `.nvmrc`) | `nvm install 24` (recommended via [nvm](https://github.com/nvm-sh/nvm)) |
| [pnpm](https://pnpm.io/) | 10+ | `npm install -g pnpm` or `brew install pnpm` |
| [Python](https://www.python.org/) | 3.12 | `brew install python@3.12` or [pyenv](https://github.com/pyenv/pyenv) |
| [uv](https://docs.astral.sh/uv/) | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| [Go](https://go.dev/) | 1.23+ | `brew install go` or [official installer](https://go.dev/dl/) |

### Developer tooling

| Tool | Purpose | Install |
|------|---------|---------|
| [Task](https://taskfile.dev/) | Root task runner | `brew install go-task` |
| [pre-commit](https://pre-commit.com/) | Git hooks | `pip install pre-commit` or `brew install pre-commit` |
| [shfmt](https://github.com/mvdan/sh) | Shell formatter | `go install mvdan.cc/sh/v3/cmd/shfmt@latest` |
| [golangci-lint](https://golangci-lint.run/) | Go linter | `brew install golangci-lint` |
| [oapi-codegen](https://github.com/oapi-codegen/oapi-codegen) | OpenAPI → Go client | `go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@v2.6.0` |

> **Tip — Go binaries**: after `go install`, ensure `$(go env GOPATH)/bin` is in
> your `$PATH` so `shfmt` and `oapi-codegen` are available.

---

## Quick start

```sh
# 1. Clone and enter the repo
git clone git@github.com:iangoodnight/delve-moar.git
cd delve-moar

# 2. Configure environment
cp .env.example .env
# Edit .env — defaults work for local Docker dev, no changes required

# 3. Install Git hooks (run once)
task hooks:install

# 4. Install dependencies
uv sync --group dev          # Python API
pnpm install                 # TypeScript packages
cd apps/cli && go mod download && cd ../..  # Go CLI

# 5. Start all services
task dev
```

The API will be available at `http://localhost:8000`, the web app at
`http://localhost:5173`.

---

## Common tasks

Run these from the repo root via `task <name>`:

| Task | Description |
|------|-------------|
| `task dev` | Start all services via Docker Compose |
| `task lint` | Lint all services in parallel |
| `task lint:api` | Python — ruff check + mypy |
| `task lint:web` | TypeScript — ESLint |
| `task lint:cli` | Go — golangci-lint |
| `task lint:shell` | Shell — shellcheck + shfmt |
| `task test` | Run all tests in parallel |
| `task test:api` | pytest (with coverage) |
| `task test:web` | Vitest |
| `task test:cli` | go test -race |
| `task build` | Build all service artifacts |
| `task gen:types` | Regenerate OpenAPI types for web + CLI |

---

## Project structure

```
delve-moar/
├── apps/
│   ├── api/          # FastAPI — Python, uv, ruff, mypy, pytest
│   ├── cli/          # dm CLI — Go, Cobra, Bubble Tea, golangci-lint
│   └── web/          # React SPA — TypeScript, Vite, Vitest, ESLint
├── packages/
│   └── api-types/    # Generated OpenAPI TypeScript types (do not edit)
├── infra/
│   └── docker-compose.yml
├── scripts/
│   └── gen_types.sh  # OpenAPI codegen pipeline (API → TS + Go)
└── Taskfile.yml      # Root task runner
```

---

## Git hooks

`task hooks:install` installs two hook stages via pre-commit:

- **pre-commit** — trailing whitespace, YAML/JSON/TOML checks, shellcheck,
  shfmt, ruff, golangci-lint, ESLint, Prettier
- **pre-push** — pytest (90% coverage threshold), Vitest, go test -race

---

## OpenAPI type generation

The TypeScript web types and Go HTTP client are both generated from the live
FastAPI OpenAPI schema. If you change the API schema, regenerate them:

```sh
task gen:types
# then commit the updated files:
#   packages/api-types/src/index.ts
#   apps/cli/internal/apiclient/client.gen.go
```

CI enforces that generated files are never out of sync with the schema
(`gen-types-check` job).

---

## Contributing

1. Branch from `main` using `feat/<issue-number>-<short-slug>`
2. Commit messages reference the issue as `Closes #N`
3. All CI checks must pass before merging
