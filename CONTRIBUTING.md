# Contributing to DelveMoar

Thanks for your interest. This document is the workflow guide. For what the
project is and how the apps fit together, see the [README](README.md).

DelveMoar is a small project today, but the conventions here are written as if
many people might land in the repo. Following them keeps the bar consistent.

For deeper material (architecture, recipes, glossary), see
[`docs/`](docs/README.md).

## Local setup

Install the required tools (macOS with Homebrew):

```bash
brew bundle          # installs everything listed in Brewfile
```

Or install manually: Node.js 24 (`.nvmrc`), pnpm 9+, Python 3.12 +
[uv](https://docs.astral.sh/uv/), Go 1.23+, Docker + Docker Compose,
[go-task](https://taskfile.dev), [pre-commit](https://pre-commit.com),
`golangci-lint`, `shellcheck`, `shfmt`.

Then from the repo root:

```bash
task setup:dev   # git hooks, oapi-codegen, pnpm install
cp .env.example .env
task dev         # docker compose up: postgres, api, web
```

Maintainers who work with the production infrastructure also need
`flyctl` and `terraform` (both in the Brewfile) and should run:

```bash
task setup:maintainer   # setup:dev + terraform init
```

Common workflows:

```bash
task lint        # all three apps + shell scripts in parallel
task test        # all three apps in parallel
task gen:types   # regenerate api-types and Go client from the live OpenAPI spec
task db:migrate  # apply pending Alembic migrations
```

A full task list: `task --list`.

## Testing

`task test` runs every app's suite in parallel, and each app has its
own task: `task test:api`, `task test:web`, `task test:cli`.

### The API suite needs a running Postgres

Some API tests run against a real Postgres. Start the dev database —
the `postgres` service in
[`infra/docker-compose.yml`](infra/docker-compose.yml) — before
running the suite locally:

```bash
task db:up      # start only the postgres container
uv run pytest   # or `task test:api`, from apps/api
```

The test harness
([`apps/api/tests/conftest.py`](apps/api/tests/conftest.py)) derives a
dedicated `<db>_test` database from `DATABASE_URL` — for the default
`delve_moar`, that is `delve_moar_test` — creates the schema from the
model metadata, and isolates each test in a transaction that is rolled
back afterward (`join_transaction_mode="create_savepoint"`). It never
touches your dev database.

CI provisions this automatically: the API job in
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs a
`postgres:17-alpine` service and sets `DATABASE_URL` on the pytest
step, so no extra setup is needed there.

Only the auth tests hit the database — the read-only SRD route tests
still use a mocked SQLAlchemy session and need no Postgres.

## Branch model

DelveMoar uses two long-lived branches:

- **`dev`** is the integration branch and the repo default. All PRs target
  `dev`. CI runs on every PR; merges happen once review is approved and CI
  is green.
- **`main`** is the release branch. It receives merges from `dev` only at
  release moments, via a `dev` → `main` Release PR. Tags (`v0.1.0`, etc.)
  live on `main`, and the production CD workflow watches for those tags
  (see [Cutting a release](#cutting-a-release-manual)).

This split keeps `main` deployable at every commit while `dev` carries
day-to-day integration. The decision is recorded in
[ADR 0009](docs/decisions/0009-branch-model.md). Future automation of the
release ritual is tracked in
[#102](https://github.com/iangoodnight/delve-moar/issues/102).

## Branching

Each piece of work starts as a GitHub issue. Branches are named:

```
<type>/<issue-number>-<short-slug>
```

Where `<type>` matches the conventional commit type (`feat`, `fix`, `chore`,
`docs`, `refactor`). Branch off `dev` (the default branch). Examples:

- `feat/46-monster-list-page`
- `fix/103-spell-search-pagination`
- `chore/71-codeowners-and-contributing`

One issue, one branch, one PR. Keep PRs small enough to review in a sitting.

## Commits

Conventional Commits, enforced by commitlint as a `commit-msg` hook:

```
<type>(<scope>): <subject>

[optional body]

refs: #123
```

Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `build`.

Common scopes: `web`, `api`, `cli`, `data`, `infra`, `repo`, `deps`.

The subject is imperative, lowercase, no trailing period. The body explains
**why** more than what.

End every commit with a `refs: #<issue>` trailer naming the issue the work
belongs to. It links the commit to its issue without closing it, so each
commit on a multi-commit branch still points back. Reserve the closing
keyword for the PR: put `Closes #<issue>` in the PR description (not the
commit body) so GitHub auto-closes the issue when the PR merges to `dev`
(the default branch). Commitlint does not enforce the trailer today (no
`references-empty` rule); add one only if drift becomes a problem.

## Pull requests

1. Push your branch and open a PR against `dev` (the default base).
2. The PR template fills in automatically. Walk every checkbox honestly.
3. CODEOWNERS auto-requests reviewers for the paths you touched.
4. CI runs lint, tests, and the type-generation diff check on every push.
5. Merge once checks are green and review is approved. **Squash merge by
   default for feature/fix PRs into `dev`.** See
   [Cutting a release](#cutting-a-release-manual) for the different rule
   on `dev → main` release PRs.

If your PR changes the API:

- Run `task gen:types` and commit the regenerated files in the same PR.
- The `gen-types-check` CI job will fail otherwise.

If your PR changes the DB schema:

- Add the Alembic migration in the same PR.
- Mention any data backfill or downtime risk in the PR body.

## Changelog

DelveMoar keeps a single root [`CHANGELOG.md`](CHANGELOG.md) in the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. See
[ADR 0006](docs/decisions/0006-changelog-convention.md) for the
reasoning.

### Per-PR

If your PR makes a user-visible change, add a line under the
appropriate sub-section of `[Unreleased]` (`Added`, `Changed`,
`Deprecated`, `Removed`, `Fixed`, `Security`) on your branch, in the
same PR as the change.

Write entries in user-facing language, not as commit subjects.

- Good: `Added monster detail page with statblock and attribution footer.`
- Bad: `feat(web): add monster detail page`

When in doubt: would a non-contributor reading the release notes know
what changed? If yes, it deserves an entry.

PRs that do not warrant an entry (internal refactors, tooling, CI,
docs-only) can skip it. The PR template has a checkbox to confirm
either case.

### Cutting a release (manual)

When a phase milestone closes, one contributor cuts the release. The
release lives at the `dev` → `main` boundary: `main` is the deployable
branch, so the version-bump + changelog dating happens on `dev`, and
the tag goes on `main` after the release PR merges.

1. **On `dev`, in a single PR:**
   1. Bump [`VERSION`](VERSION) to the new version (e.g. `0.0.0` to
      `0.1.0`).
   2. In `CHANGELOG.md`, rename `[Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`.
   3. Insert a fresh empty `[Unreleased]` block at the top with the six
      sub-sections.
   4. In [`SECURITY.md`](SECURITY.md), bump the supported-versions table
      so the new version is the latest supported and the prior release
      drops to unsupported.
   5. Merge the version-bump PR into `dev`.
2. **Open a `dev` → `main` Release PR** titled `Release vX.Y.Z`. The
   body is the new `[X.Y.Z]` section of the changelog.
3. **Merge the Release PR with "Create a merge commit" or "Rebase and
   merge" — never Squash.** Squashing the release PR collapses every
   commit on `dev` into a single new commit on `main`, with no shared
   ancestry to the original commits. The next release then sees every
   touched file as a conflict against the squashed history. Use a real
   merge or rebase so `main` keeps the lineage.

   If `dev` and `main` have already diverged from a prior squash (you
   will see conflicts on `VERSION`, `CHANGELOG.md`, etc.), branch from
   `main` to `release/vX.Y.Z`, merge `dev` into it (resolving conflicts
   in `dev`'s favor), and open the Release PR from that branch instead.
   The `Main branch guard` workflow accepts `dev` or `release/*` heads.
4. **Tag the merge commit on `main`:**
   ```bash
   git checkout main && git pull
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```
5. **If the release runs an Alembic migration, back up production
   first.** The CD workflow runs `alembic upgrade head` before traffic
   swaps, so take a logical backup so a bad migration is recoverable:
   ```bash
   export PROD_DATABASE_URL=$(fly ssh console -a delvemoar-api -C 'printenv DATABASE_URL')
   task db:dump
   ```
   Keep the dump until the deploy is verified healthy, then delete it.
   See the
   [Postgres backup and restore runbook](docs/runbooks/postgres-backup-restore.md).
6. **Create a GitHub Release** pointing at the tag, using the new
   `[X.Y.Z]` section as the body. The production CD workflow
   fires on the tag and deploys the API to Fly.io; Vercel deploys the
   web automatically on the `main` push. See
   [`docs/deploy.md`](docs/deploy.md) for the full deploy and rollback
   runbook.

Future automation of this ritual is tracked in
[#102](https://github.com/iangoodnight/delve-moar/issues/102).

Per-app versions (`apps/api/pyproject.toml`, `apps/web/package.json`,
the CLI's git tags) are not bumped by this ritual; they move with the
app's own release cadence. Today no app has a release cadence
independent of the monorepo, so per-app bumps are typically deferred.

## OpenAPI is the source of truth

The web TypeScript types in `packages/api-types/` and the Go client in
`apps/cli/internal/apiclient/` are generated from the API's `openapi.json`,
not hand-written. If you find yourself editing those files, regenerate them
with `task gen:types` instead.

## Web architectural boundaries

`apps/web` follows a [bulletproof-react](https://github.com/alan2207/bulletproof-react)
features layout. Cross-feature imports are blocked by ESLint
(`apps/web/eslint.config.js`). If you are tempted to import from a sibling
feature, the right move is usually to lift shared logic into `src/lib/` or
`src/components/` rather than punching through the boundary.

## Issues and labels

- New work: open an issue using one of the templates in
  `.github/ISSUE_TEMPLATE/`.
- Area labels: `area:web`, `area:api`, `area:cli`, `area:data`, `area:infra`,
  `area:chore`, `area:docs`.
- Phase labels: `phase:1a`, `phase:1b`, `phase:backlog`.

## Reporting security issues

Please do not open a public issue for security vulnerabilities. See
[`SECURITY.md`](SECURITY.md) for the disclosure process.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
