# AGENTS.md

Guidance for coding agents working in `/home/runner/work/delve-moar/delve-moar`.

## Repository overview

DelveMoar is a monorepo for a self-hosted TTRPG utility suite with three apps
sharing an OpenAPI contract:

- `apps/api` — FastAPI backend (`uv`, Python 3.12)
- `apps/web` — React SPA (`pnpm`, Vite, TypeScript)
- `apps/cli` — Go CLI/TUI (`go`, Cobra, Bubble Tea)
- `packages/api-types` — generated TypeScript API types; do not hand-edit

Read `README.md` for the product overview and `CONTRIBUTING.md` for the full
workflow.

## Project layout

- `apps/api/app` — API application code
- `apps/api/alembic` — database migrations
- `apps/api/tests` — API tests
- `apps/web/src` — web app source
- `apps/cli` — CLI source and tests
- `scripts` — repo helper scripts
- `test` — shell-script tests (`bats`)
- `docs` — architecture, recipes, runbooks, ADRs

## Key rules

1. Use `task` from the repo root for common workflows.
2. Do not hand-edit generated API client artifacts:
   - `packages/api-types/**`
   - `apps/cli/internal/apiclient/**`
   Regenerate them with `task gen:types` after API contract changes.
3. If you change the database schema, add the Alembic migration in the same
   change.
4. If you make a user-visible change, add an entry under `[Unreleased]` in the
   root `CHANGELOG.md`.
5. Keep web feature boundaries intact; shared code should move to common
   locations rather than crossing feature boundaries.

## Common commands

From the repo root:

- `task lint` — lint all apps
- `task test` — run all tests
- `task build` — build all apps
- `task gen:types` — regenerate OpenAPI-derived web + CLI artifacts
- `task db:up` — start Postgres for local API work/tests
- `task db:migrate` — apply Alembic migrations

Per area:

- API: `task lint:api`, `task test:api`
- Web: `task lint:web`, `task test:web`
- CLI: `task lint:cli`, `task test:cli`
- Shell: `task lint:shell`, `task test:shell`

## Validation guidance

- API tests require Postgres; start it with `task db:up` first.
- Docs-only changes usually do not need builds or tests.
- Run the smallest relevant lint/test commands for the files you changed, then
  broaden only if needed.

## Workflow notes

- The default integration branch is `dev`; PRs target `dev`.
- Branch names follow `<type>/<issue-number>-<short-slug>`.
- Commits use Conventional Commits.
- Route-handler docstrings in FastAPI become public OpenAPI descriptions, so
  keep them short and prose-focused.

## Useful references

- `README.md` — quick start and repo map
- `CONTRIBUTING.md` — branching, commits, PRs, release workflow
- `docs/architecture/README.md` — high-level architecture
- `docs/architecture/openapi-pipeline.md` — contract/codegen flow
- `docs/architecture/web-features-layout.md` — frontend boundaries
