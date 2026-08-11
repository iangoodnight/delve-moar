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
brew bundle          # installs the tools listed in Brewfile
```

`brew bundle` does **not** install Docker or Node; provision those
two separately:

- **Docker Desktop** is required for `task dev` and `task db:up`
  (both run `docker compose`). Install
  [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  and make sure it is running before either task.
- **Node.js** is pinned to the major in [`.nvmrc`](.nvmrc) (currently
  24). Use a version manager that honors `.nvmrc`
  ([fnm](https://github.com/Schniz/fnm) or
  [nvm](https://github.com/nvm-sh/nvm)) and run `fnm use` / `nvm use`
  in the repo root. The Brewfile intentionally does not manage Node,
  so a Homebrew install cannot drift from the pinned major.

Or install everything manually: Node.js 24 (`.nvmrc`), pnpm 11+,
Python 3.12 + [uv](https://docs.astral.sh/uv/), Go 1.26+, Docker +
Docker Compose, [go-task](https://taskfile.dev),
[pre-commit](https://pre-commit.com), `golangci-lint`, `shellcheck`,
`shfmt`.

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

`task test` runs every suite in parallel: `task test:api`,
`task test:web`, `task test:cli`, and `task test:shell` are the
individual tasks.

### Shell scripts

`task test:shell` runs the [bats](https://github.com/bats-core/bats-core)
suite in [`test/`](test/) against the helper scripts under `scripts/`
(starting with [`scripts/db_backup.sh`](scripts/db_backup.sh)). The
tests are hermetic — they stub `docker`, `fly`, and friends onto `PATH`,
so they need no running Postgres, Fly login, or network, and run
anywhere `bats-core` is installed (`brew bundle` provisions it). They
run in CI and on demand, but deliberately not in the git hooks, to keep
the commit loop fast.

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

## Reviewing a pull request

Reviewing is as much a part of the workflow as authoring. A reviewer
confirms the mechanics CI cannot fully judge, makes the calls tooling
does not catch, and guards what user data the change stores or
exposes. Approve and merge only when CI is green and the review is
satisfied.

### Mechanics to confirm

- **CI is green** on the latest push: lint, tests, and the
  `gen-types-check` type-generation diff job.
- **CODEOWNERS approval** is present for the paths the PR touches.
  Merge only once checks are green and the review is approved.
- **Conventional-commit title and scope.** Squash-merge feature and
  fix PRs into `dev`; a `dev` to `main` release PR uses a merge commit
  or rebase, never a squash (see
  [Cutting a release](#cutting-a-release-manual)).
- **API changes:** `task gen:types` was run and the regenerated files
  (`packages/api-types/` and the Go client in
  `apps/cli/internal/apiclient/`) are committed in the same PR, and
  the drift check passes.
- **Schema changes:** an Alembic migration is included, and any
  backfill or downtime risk is called out in the PR body.
- **Changelog:** a user-visible change has an entry under
  `[Unreleased]`, or the "no entry needed" box is honestly checked.
- **Tests:** new or changed behavior is covered by tests.

### Judgement calls CI cannot catch

Some conventions are not (fully) machine-enforced. Check these by
hand, and link the relevant record when you flag one:

- **Web architectural boundaries** beyond what ESLint enforces, per
  [web features layout](docs/architecture/web-features-layout.md).
- **Coverage qualifying criteria** for pass-through wrappers, per
  [ADR 0008](docs/decisions/0008-frontend-coverage-policy.md).
- **Typography token ordering** caveats, per
  [ADR 0007](docs/decisions/0007-web-typography-system.md).
- **Access checks go through the policy module.** The book read and
  write rules (owner-or-public reads, owner-only writes) live in
  `apps/api/app/authz.py`, per
  [ADR 0011](docs/decisions/0011-campaign-model.md); endpoints call its
  helpers (`get_readable_book`, `get_writable_book`,
  `readable_books_predicate`) and never hand-roll owner or visibility
  checks inline.

### Privacy and data-exposure review

When a PR introduces or alters what user data is stored or exposed (a
new table or field on a user-facing entity, a new response schema, or
a new public projection), run a data-minimization and exposure pass
before approving:

- Is anything collected that the feature does not need?
- Is internal identity kept separate from public presentation?
- Is PII such as email kept out of public projections?
- Is there a deletion or retention consideration to record?

Raise anything that fails these checks on the PR.

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
2. **Open a `dev` → `main` Release PR** titled `chore(release): vX.Y.Z`.
   The body is the new `[X.Y.Z]` section of the changelog. Use the
   conventional-commit form (not a bare `Release vX.Y.Z`): if the merge
   ever adopts the PR title as its subject, or the commitlint back-merge
   guard is later removed, a conventional title still passes when the
   release commit is re-linted during a back-merge.
3. **Merge the Release PR with "Create a merge commit" or "Rebase and
   merge", never Squash.** Two reasons:
   - **Ancestry.** Squashing collapses every commit on `dev` into a
     single new commit on `main` with no shared ancestry, so the next
     release sees every touched file as a conflict against the squashed
     history. A real merge or rebase keeps `main`'s lineage (and keeps
     `main` an ancestor of `dev`, per the back-merge in step 7).
   - **Commitlint.** A merge commit's `Merge ...` subject is ignored by
     commitlint, but a squash produces a normal subject that gets
     re-linted when `main` is later back-merged into `dev`. The v0.1.0 /
     v0.1.2 `Release vX.Y.Z` squashes are exactly the commits that broke
     that check.

   If `dev` and `main` have already diverged from a prior squash (you
   will see conflicts on `VERSION`, `CHANGELOG.md`, etc.), branch from
   `main` to `release/vX.Y.Z`, merge `dev` into it (resolving conflicts
   in `dev`'s favor), and open the Release PR from that branch instead.
   The `Main branch guard` workflow accepts `dev` or `release/*` heads.
   Once step 7's back-merge is part of the ritual, this divergence
   should not recur.
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

   **If this release changed the SRD seed** (`scripts/seed_srd.py`, or
   the content it derives), reseed production once the deploy is
   verified healthy. The deploy runs migrations but **not** the seed,
   so a seed change does not take effect on its own:
   ```bash
   fly ssh console -a delvemoar-api -C "sh -c 'PYTHONPATH=. uv run python scripts/seed_srd.py all'"
   ```
   The seed is idempotent; run the affected target (`monsters`,
   `spells`, `items`) or `all`.
7. **Back-merge `main` into `dev`.** Once the deploy is verified
   healthy, merge `main` back into `dev` so `main` stays an ancestor of
   `dev` and the next release is a plain `dev` → `main` PR with no
   conflicts (retiring the `release/*` workaround in step 3). Cut a
   dedicated throwaway branch from `main` for the PR head; **never open
   the back-merge PR with `main` itself as the head branch.**
   ```bash
   git checkout main && git pull
   git checkout -b chore/backmerge-vX.Y.Z
   git push -u origin chore/backmerge-vX.Y.Z
   gh pr create --base dev --head chore/backmerge-vX.Y.Z \
     --title "chore: back-merge vX.Y.Z into dev"
   ```
   Merge it as a **merge commit** (same reasons as step 3). Two hazards
   this avoids:
   - **`main` deletion.** The repo's "automatically delete head
     branches" setting deletes the PR head on merge. With `main` as the
     head it deletes `main` (it did during v0.1.3; `main` had to be
     restored by hand). The throwaway branch is what gets deleted
     instead. Confirm `main`'s branch protection restricts deletions as
     a backstop.
   - **Commitlint.** The dedicated-branch back-merge is not covered by
     the `head == main` skip in
     [`commitlint.yml`](.github/workflows/commitlint.yml), but it stays
     green anyway: after the first reconciliation `main` and `dev`
     share history, so the only new first-parent commit is the release
     merge (a `Merge ...` subject commitlint ignores).

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

### Endpoint docstrings render in Swagger

A FastAPI route handler's docstring becomes the endpoint *description* in
`openapi.json` and the Swagger UI, where it is the public API
documentation. Swagger collapses single line breaks, so the Google-style
`Args:`/`Returns:`/`Raises:` sections we use elsewhere render as an
unreadable run-on. Keep route-handler docstrings to a short prose
description (one line, or a summary plus a paragraph) and put the detail
into FastAPI's native, properly-rendered tools: `summary=`,
`Query(description=...)`, `Path(...)`, Pydantic `Field(description=...)`,
and the `responses=` map. Internal helper functions (those not exposed as
endpoints) keep full Google-style docstrings. The docstring is still
required (`ruff` pydocstyle), but a one-line summary satisfies it.

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
