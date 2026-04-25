# delve-moar

A homebrew-first TTRPG utility suite for game masters: catalog,
encounter builder, and character tools, all self-hosted and SRD-powered.

> **Status**: Phase 1a (SRD catalog, read-only) in progress. See the
> [roadmap](docs/roadmap.md) for what is shipping and what comes next.

## What this is

A monorepo with three apps that share an OpenAPI contract:

- a Python FastAPI backend
- a React web app
- a Go CLI (`dm`) with a Bubble Tea TUI

The contract is generated, not hand-written: the API's `openapi.json`
produces both the web's TypeScript types and the CLI's Go HTTP client.

## Quick start

```sh
git clone git@github.com:iangoodnight/delve-moar.git
cd delve-moar
cp .env.example .env
task setup      # install hooks, pnpm deps, oapi-codegen
task dev        # docker compose: postgres, api, web
```

API at `http://localhost:8000`, web app at `http://localhost:5173`.

Full prerequisite list and tooling versions are in
[`CONTRIBUTING.md`](CONTRIBUTING.md#local-setup).

## Common tasks

Run from the repo root via `task <name>`:

| Task | Description |
|------|-------------|
| `task dev` | Start all services via Docker Compose |
| `task lint` | Lint all services in parallel |
| `task test` | Run all tests in parallel |
| `task build` | Build all service artifacts |
| `task gen:types` | Regenerate OpenAPI types for web + CLI |
| `task db:migrate` | Apply pending Alembic migrations |

A full list: `task --list`.

## Project structure

```
delve-moar/
├── apps/
│   ├── api/          # FastAPI (Python, uv)
│   ├── cli/          # dm CLI (Go, Cobra, Bubble Tea)
│   └── web/          # React SPA (TypeScript, Vite)
├── packages/
│   └── api-types/    # Generated OpenAPI TypeScript types (do not edit)
├── infra/
│   └── docker-compose.yml
├── scripts/
│   └── gen_types.sh  # OpenAPI codegen pipeline
├── docs/             # Architecture, recipes, ADRs, roadmap, glossary
└── Taskfile.yml      # Root task runner
```

## Documentation

- [Roadmap](docs/roadmap.md), what is shipping by phase
- [Architecture overview](docs/architecture/README.md), how the three
  apps fit together
- [OpenAPI pipeline](docs/architecture/openapi-pipeline.md), the shared
  contract and codegen
- [Web features layout](docs/architecture/web-features-layout.md),
  bulletproof-react boundaries
- [Local development](docs/recipes/local-development.md), commands and
  gotchas
- [Adding a new endpoint](docs/recipes/adding-a-new-endpoint.md),
  end-to-end walkthrough
- [Architecture Decision Records](docs/decisions/README.md), why the
  project is shaped the way it is
- [Glossary](docs/glossary.md), D&D and project terms

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full workflow:
branching, commits, PR conventions, and the OpenAPI source-of-truth
rule.

For security issues, see [`SECURITY.md`](SECURITY.md). Do not open a
public issue for security reports.

## License

[MIT](LICENSE).
