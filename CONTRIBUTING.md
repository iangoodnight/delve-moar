# Contributing to DelveMoar

Thanks for your interest. This document is the workflow guide. For what the
project is and how the apps fit together, see the [README](README.md).

DelveMoar is a small project today, but the conventions here are written as if
many people might land in the repo. Following them keeps the bar consistent.

## Style

When writing code, docs, commit messages, and PR descriptions:

- Plain ASCII. No em-dashes, no unicode beyond standard punctuation.
- Prefer commas, parens, or sentence breaks over em-dashes.
- Keep the tone friendly to readers who are wary of LLM-generated artifacts.

## Local setup

You will need:

- Node.js 24 (see `.nvmrc`)
- pnpm 9 or later
- Python 3.12 with [uv](https://docs.astral.sh/uv/)
- Go 1.23 or later
- [go-task](https://taskfile.dev) (`brew install go-task`)
- Docker and Docker Compose
- [pre-commit](https://pre-commit.com)
- `golangci-lint`, `shellcheck`, `shfmt`

Once those are installed, from the repo root:

```bash
task setup       # installs git hooks, pnpm deps, oapi-codegen
cp .env.example .env
task dev         # docker compose up: postgres, api, web
```

Common workflows:

```bash
task lint        # all three apps + shell scripts in parallel
task test        # all three apps in parallel
task gen:types   # regenerate api-types and Go client from the live OpenAPI spec
task db:migrate  # apply pending Alembic migrations
```

A full task list: `task --list`.

## Branching

Each piece of work starts as a GitHub issue. Branches are named:

```
<type>/<issue-number>-<short-slug>
```

Where `<type>` matches the conventional commit type (`feat`, `fix`, `chore`,
`docs`, `refactor`). Examples:

- `feat/46-monster-list-page`
- `fix/103-spell-search-pagination`
- `chore/71-codeowners-and-contributing`

One issue, one branch, one PR. Keep PRs small enough to review in a sitting.

## Commits

Conventional Commits, enforced by commitlint as a `commit-msg` hook:

```
<type>(<scope>): <subject>

[optional body]

[optional footer, e.g. Closes #123]
```

Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `build`.

Common scopes: `web`, `api`, `cli`, `data`, `infra`, `repo`, `deps`.

The subject is imperative, lowercase, no trailing period. The body explains
**why** more than what. If the PR closes an issue, put `Closes #N` in the
footer of the PR description (not the commit body), so GitHub auto-closes on
merge to `main`.

## Pull requests

1. Push your branch and open a PR against `main`.
2. The PR template fills in automatically. Walk every checkbox honestly.
3. CODEOWNERS auto-requests reviewers for the paths you touched.
4. CI runs lint, tests, and the type-generation diff check on every push.
5. Merge once checks are green and review is approved. Squash merge by default.

If your PR changes the API:

- Run `task gen:types` and commit the regenerated files in the same PR.
- The `gen-types-check` CI job will fail otherwise.

If your PR changes the DB schema:

- Add the Alembic migration in the same PR.
- Mention any data backfill or downtime risk in the PR body.

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
