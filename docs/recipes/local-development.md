# Local development

Reference card for day-to-day work in DelveMoar. For first-time setup, see
the [Quick start](../../README.md#quick-start) in the root README.

## One-time setup

After cloning, in order:

```sh
cp .env.example .env       # defaults work for local Docker dev
task setup                 # installs git hooks, pnpm deps, oapi-codegen
uv sync --group dev        # (in apps/api) Python deps
cd apps/cli && go mod download && cd ../..
```

`task setup` installs the pre-commit hooks at three stages: `pre-commit`,
`commit-msg`, and `pre-push`. These run automatically on the corresponding
git operations. See [hooks](#hooks) below.

## Day to day

| To...                                | Run                       |
| ------------------------------------ | ------------------------- |
| Start everything (postgres, api, web) | `task dev`                |
| Start only postgres + api            | `task dev:api`            |
| Start only postgres                  | `task db:up`              |
| Stop only postgres                   | `task db:down`            |
| Lint everything                      | `task lint`               |
| Lint one app                         | `task lint:api`, `task lint:web`, `task lint:cli`, `task lint:shell` |
| Test everything                      | `task test`               |
| Test one app                         | `task test:api`, `task test:web`, `task test:cli` |
| Build everything                     | `task build`              |
| Regenerate OpenAPI types             | `task gen:types`          |
| Apply pending DB migrations          | `task db:migrate`          |
| Roll back the last migration         | `task db:rollback`         |

Full list: `task --list`.

## Service URLs (when `task dev` is up)

| Service          | URL                              |
| ---------------- | -------------------------------- |
| API              | http://localhost:8000            |
| Swagger UI       | http://localhost:8000/docs       |
| ReDoc            | http://localhost:8000/redoc      |
| OpenAPI JSON     | http://localhost:8000/openapi.json |
| Web app (Vite)   | http://localhost:5173            |
| Postgres         | localhost:5432 (per `.env`)      |

## Hooks

`task setup` installs three hook stages via [pre-commit](https://pre-commit.com/):

| Stage         | What runs                                                    |
| ------------- | ------------------------------------------------------------ |
| `pre-commit`  | trailing whitespace, end-of-file fixer, check yaml/json/toml, no large files, shellcheck, shfmt, ruff (check + format), golangci-lint (cli), eslint (web), prettier (web) |
| `commit-msg`  | commitlint (Conventional Commits)                            |
| `pre-push`    | pytest (api), vitest (web), go test (cli)                    |
| skip a hook   | `git commit --no-verify` for `pre-commit`/`commit-msg` (please don't); for `pre-push`, `git push --no-verify` |

Skipping hooks is a code smell. The hooks exist because CI runs the same
checks; skipping locally just delays the failure.

## Database

The local database is a Docker container managed by Docker Compose. State
lives in a named volume and survives container restarts.

### Reset the database

To wipe and reseed from scratch:

```sh
task db:down
docker volume rm $(docker volume ls -q | grep delve_moar_postgres) || true
task db:up
task db:migrate
task seed:srd       # all SRD data, or use seed:srd:monsters / spells / items
```

The `init.sql` in `infra/postgres/` runs once when the volume is first
created; it sets up extensions like `uuid-ossp` and `pgcrypto`.

### Connect with psql

```sh
docker exec -it $(docker ps -qf "name=postgres") \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

(Variables come from your `.env`.)

### Seeding SRD data

```sh
task seed:srd               # everything
task seed:srd:monsters      # just monsters
task seed:srd:spells        # just spells
task seed:srd:items         # equipment + magic items
```

Source: [dnd5eapi.co](https://www.dnd5eapi.co). Idempotent. Re-running
skips records that already exist.

## OpenAPI types

When you change a router or schema, regenerate the client code:

```sh
task gen:types
```

Commit any diff in:

- `packages/api-types/src/index.ts` (TypeScript)
- `apps/cli/internal/apiclient/client.gen.go` (Go)
- `apps/cli/go.mod`, `apps/cli/go.sum` (only if Go deps changed)

CI will fail your PR if the generated files drift. See
[architecture/openapi-pipeline.md](../architecture/openapi-pipeline.md) for
the full pipeline and the OpenAPI 3.0 downgrade quirk.

## Migrations

Alembic lives in `apps/api/alembic/`. Common commands:

```sh
# Create a new migration from autogenerate (after editing models)
cd apps/api
uv run alembic revision --autogenerate -m "add conditions table"

# Apply all pending migrations
task db:migrate

# Roll back the most recent migration
task db:rollback

# See current revision
cd apps/api && uv run alembic current

# See history
cd apps/api && uv run alembic history
```

Always inspect autogenerated migrations before committing them. Alembic
catches schema diffs but does not always reach the right SQL.

## Common gotchas

### "Port 8000 / 5173 / 5432 is already in use"

Another `task dev` (or stray uvicorn / vite / postgres) is already
running. `task dev` has no auto-stop. Either find and kill the other
process, or use `task dev:api` if you only need the API.

### "Container exits immediately on `task dev`"

Most often, a missing `.env`. Run `cp .env.example .env` once.

### Pre-commit installed but not running

Run `task setup` again (it is idempotent). If hooks still do not run,
check `.git/hooks/pre-commit` exists and is executable.

### `pnpm install` is slow or fails

This repo uses pnpm workspaces. Install from the repo root, not from
inside an app:

```sh
# in repo root
pnpm install
```

Inside `apps/web`, `pnpm install` will work but is slower because pnpm
walks up to the workspace root anyway.

### Web tests cannot find a generated type

You changed the API but did not regenerate. Run `task gen:types`. If you
have not started the API since the change, `gen:types` will start it for
you in the background.

### Pytest passes locally but fails on CI

Two common causes: a test relies on local DB state (CI does not have
seeded data; tests that need data should use fixtures), or a test relies
on local environment variables not in `.env.example`.

### "Architectural boundary" ESLint error in the web app

You imported across features, or from a layer that is not allowed to
import from the source layer. See
[architecture/web-features-layout.md](../architecture/web-features-layout.md)
for what is allowed.

## Where to look next

- [Architecture overview](../architecture/README.md)
- [Adding a new endpoint](adding-a-new-endpoint.md), an end-to-end tutorial
- [Glossary](../glossary.md)
- `Taskfile.yml`, every task defined
- `infra/docker-compose.yml`, the dev environment
