# 0004. Versioning: per-app semver plus monorepo `0.x.y` at phase milestones

- Status: proposed
- Date: 2026-04-25

## Context

DelveMoar is three apps in one monorepo:

- `apps/api` (Python), versioned in `pyproject.toml`
- `apps/web` (TypeScript), versioned in `package.json`
- `apps/cli` (Go), versioned via git tags

Each app has its own release surface. The API and web app are deployed
together today, but the CLI is a downloadable binary with its own
release cadence (potentially). The repo as a whole also has a meaningful
"version" in the sense of "what does the product look like at this
point in time", which corresponds roughly to phase milestones.

We need a versioning model that:

- Lets each app increment independently when only that app changes.
- Gives the project as a whole a coarse-grained version that maps to
  user-visible phases (Phase 0, Phase 1a, Phase 1b, etc.).
- Does not require running a release tool we do not need yet.

## Decision

**Per-app semver, plus a top-level monorepo `0.x.y`.**

- Each app maintains its own [semver](https://semver.org/) version in
  its native manifest:
  - `apps/api/pyproject.toml` `[project] version`
  - `apps/web/package.json` `version`
  - `apps/cli`: git tags of the form `cli/vX.Y.Z`
- The repo as a whole carries a top-level `0.x.y` version that bumps
  at phase milestones. Phase 1a ships as `0.1.0`, Phase 1b as `0.2.0`,
  and so on. The `1.0.0` release is when the product is feature-complete
  enough for a public stable claim.
- Per-app changelogs only emerge if independent release cadences
  emerge. Most likely candidate: the CLI binary. Today, a single
  `CHANGELOG.md` at the repo root (PR 7 of the docs initiative) covers
  the monorepo `0.x.y` line.

The exact location of the top-level `0.x.y` value is open. Three
candidates:

- Root `package.json` `version` field
- A dedicated `VERSION` file at the root
- Git tag only (no file in tree)

This will be settled in the CHANGELOG PR. See the open question in
`planning/open-questions.md`.

## Considered alternatives

- **Single shared version across all apps.** Works for true monorepos
  where every app is always released together (e.g. Babel). Breaks down
  the moment one app needs a patch release while others are mid-flight.
- **Calver (`YYYY.MM.PATCH`).** Honest about "what does the project
  look like right now", and avoids semver bikeshedding. Loses the
  ability to communicate API stability via the major version, which
  matters for the CLI as a downloadable binary and for the API as a
  versioned URL prefix.
- **No top-level version, only per-app versions.** Simple. Loses the
  ability to talk about "the product at Phase 1b" as a thing that has
  a version. Phase milestones become an internal-only concept.
- **Per-app changelogs from day one.** Future-proof. Premature: today
  every change ships in a single commit train, and a single changelog
  is faster to write and read.

## Consequences

**Easier:**

- Per-app semver is what `pyproject.toml`, `package.json`, and Go
  module convention all expect. We are not fighting any tool.
- The top-level `0.x.y` gives roadmap conversations a versioned
  vocabulary ("this lands in 0.2.0") without forcing every PR to bump
  every app.
- A future Renovate/Dependabot setup that updates `apps/api` deps does
  not need to coordinate with `apps/web` deps.

**Harder:**

- Three places to bump versions when there is a coordinated release.
  Mitigated by: today, no app is being released to a registry, so
  bumps are mostly internal accounting.
- The relationship between the monorepo `0.x.y` and the per-app
  versions has to be explained to readers (likely in the CHANGELOG
  PR).
- Phase milestones are coarser than what semver would otherwise allow.
  A `0.1.5` -> `0.2.0` jump is not strictly a breaking change in semver
  terms, but it is when read as "Phase 1b shipped".

**New constraints:**

- The monorepo `0.x.y` reaches `1.0.0` only when the product is
  feature-stable enough for an unqualified public release. Specific
  criteria for that flip will be decided in a future ADR.
- Per-app changelogs require their own ADR if they ever appear.

## Status note

This ADR is `proposed` rather than `accepted` because PR 7 of the
"Documentation and Contributor Experience" milestone (CHANGELOG) is
where the versioning model is locked in alongside the changelog
convention. When PR 7 lands, this ADR's status flips to `accepted`,
and the open question about where the top-level `0.x.y` lives is
resolved (or this ADR is superseded by a different model).

## Links

- Open question: `planning/open-questions.md`, "Monorepo version
  location"
- [semver.org](https://semver.org/)
- [calver.org](https://calver.org/) (the alternative considered)
- Will be settled by: PR 7 of milestone #3 (CHANGELOG)
