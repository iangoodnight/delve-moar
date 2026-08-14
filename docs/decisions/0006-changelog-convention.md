# 0006. Changelog convention: Keep a Changelog, inline edits, manual release cuts

- Status: accepted
- Date: 2026-04-26

## Context

ADR [0004](0004-versioning-model.md) settled the **shape** of the versioning
model (per-app semver in each app's manifest, plus a top-level monorepo `0.x.y`
that bumps at phase milestones) but explicitly deferred the **mechanism** to a
later PR:

- Where does the top-level version number live in the tree?
- How does a contributor record what changed in their PR?
- How do we cut an actual release?

Two open questions in `planning/open-questions.md` (Monorepo version location,
Per-PR changelog enforcement) tracked the gaps. This ADR closes them.

The repo has one regular contributor today, conventional commits are already
enforced via commitlint, and release frequency is expected to match phase
milestones (a few times a year). Whatever we adopt must match that scale: light
enough that solo work is not friction, structured enough that a future second
contributor inherits a clear convention.

## Decision

**Single root `CHANGELOG.md` in
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format,
contributor-edited inline per PR, with a manual release ritual.**

### Format

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions.
Sub-sections under each version: `Added`, `Changed`, `Deprecated`, `Removed`,
`Fixed`, `Security`. The most recent unreleased work lives under a
`[Unreleased]` heading at the top.

### Per-PR mechanism

Contributors edit `CHANGELOG.md` directly on their branch, adding one or more
lines under the appropriate sub-section of `[Unreleased]`. The edit ships in the
same PR as the change. No separate fragment files, no aggregator script.

Entries are user-facing language, not commit messages. "Added monster detail
page with statblock and attribution footer" is the right shape; "feat(web): add
monster detail page" is not.

### Enforcement

A checkbox in the PR template prompts the contributor to confirm a changelog
entry was added (or that the PR does not warrant one). No CI lint check.
Reviewer-enforced.

### Top-level monorepo version location

A dedicated `VERSION` file at the repo root, single line, plain text.

Chosen over the alternatives because the repo is tri-lingual (Python,
TypeScript, Go) and a `VERSION` file is the only option that does not co-locate
the monorepo version with one specific language's manifest. Each app already
carries its own per-app version in its native manifest; the root `VERSION` is
explicitly the "what does the product look like right now" version, not any
single app's.

### Release-cutting ritual (manual)

When a phase milestone closes, one contributor cuts the release in a single PR:

1. Bump `VERSION` to the new version (e.g. `0.0.0` -> `0.1.0`).
2. In `CHANGELOG.md`, rename `[Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`.
3. Insert a fresh empty `[Unreleased]` block at the top.
4. After merge, tag the merge commit `vX.Y.Z` and push the tag.
5. Create a GitHub Release pointing at the tag, with the changelog section as
   the body.

The ritual is documented in `CONTRIBUTING.md` so it is discoverable without
reading this ADR.

## Considered alternatives

- **Changeset fragments (towncrier, changesets-style).** Each PR drops a small
  file in `changelog.d/`, a release script aggregates them at cut-time. Avoids
  merge conflicts on `[Unreleased]`. Rejected because at one regular contributor
  and a few PRs a week, conflicts are not the problem the tooling solves, and
  the tooling itself is friction.
- **Auto-generated changelog from Conventional Commits** (e.g.
  `conventional-changelog`). Free given commitlint is already in place. Rejected
  because commit subjects are written for code review, not for user-facing
  release notes; aggregating them produces a changelog that reads like a git
  log. Human curation is the point of the file.
- **Strict CI check that every PR touches `CHANGELOG.md`.** Considered with a
  `no-changelog` opt-out label. Rejected for now: chore PRs, internal refactors,
  and tooling work outnumber user-visible PRs at this scale, so the check would
  be off more than it is on. Revisit if contributors start forgetting changelog
  entries.
- **Automated release tooling (release-please, changesets release flow).** Bot
  opens a release PR when there is unreleased work, drives the tag and GitHub
  Release on merge. Right tool when release frequency is high or contributors
  are many. Today neither is true. Tracked as a separate backlog issue for when
  we outgrow the manual ritual.
- **Top-level version in root `package.json` `version` field.** Convenient if
  anything in the JS toolchain ever reads it. Rejected because the root
  `package.json` is workspace metadata (`"private": true`) and using its
  `version` field would conflate "the monorepo version" with "the workspace root
  package version", which has no meaning.
- **Top-level version in git tag only, no file in tree.** Cleanest. Rejected
  because a contributor cannot answer "what version is this checkout?" without
  shelling out to `git describe`, and any future build step that injects the
  version would have to do the same.
- **Per-app changelogs from day one.** Future-proof. Rejected per ADR 0004's
  reasoning: today every change ships in a single commit train, a single
  changelog is faster to write and read, and the model can graduate to per-app
  changelogs if independent release cadences emerge.

## Consequences

**Easier:**

- A contributor who has used any project that follows Keep a Changelog
  recognizes the file shape immediately.
- The release ritual is five steps in `CONTRIBUTING.md`. No tooling to set up,
  no bot to install or configure.
- `VERSION` is a one-line file any tool can read; future build pipelines that
  want to inject the version (the API's `/health`, the CLI's `dm version`) can
  do so trivially.
- The convention scales down to "one person making one decision a week" without
  ceremony.

**Harder:**

- Two contributors editing `[Unreleased]` on different branches will conflict.
  At current scale this is theoretical; if it becomes real, the
  changeset-fragment alternative is the escape valve.
- The release ritual is manual, so it is a place where mistakes happen quietly:
  a forgotten tag, a stale `VERSION`, a changelog header that drifts from the
  tag. Mitigated by documenting the ritual as a numbered list in
  `CONTRIBUTING.md`.
- The PR template checkbox is honor-system. A contributor can tick it without
  actually adding an entry.

**New constraints:**

- Changelog entries are user-facing language, not commit subjects. This is
  documented in `CONTRIBUTING.md` but requires a small habit shift.
- Adding a new sub-section beyond the Keep a Changelog six requires thinking
  about whether it really earns its keep, since the whole point of the
  convention is that readers know the shape.
- Removing `VERSION` later (e.g. moving to git-tag-only) would be a breaking
  change for anything that reads it. Worth a superseding ADR if it ever happens.

## Links

- [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)
- [`CHANGELOG.md`](../../CHANGELOG.md), the file this convention governs
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md#changelog), where the per-PR process
  and release ritual live for contributors
- [`VERSION`](../../VERSION), the top-level monorepo version
- ADR [0004](0004-versioning-model.md), which established the versioning model
  that this ADR implements
- Backlog: automate release cuts (release-please or similar)
