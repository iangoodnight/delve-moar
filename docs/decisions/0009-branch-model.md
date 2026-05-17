# 0009. Branch model: `dev` for integration, `main` for tagged releases

- Status: accepted
- Date: 2026-05-17

## Context

Through Phase 0 and most of Phase 1a, DelveMoar used a single-trunk
branch model: `main` was both the integration branch (where PRs landed)
and the de facto release branch (where tags would eventually live).
That model is fine for a repo with no deployment surface — every merge
is just another commit on the working trunk.

Phase 1a is closing with a production deploy
([#126](https://github.com/iangoodnight/delve-moar/issues/126)). Once
the site is publicly hosted, "merge to `main`" and "ship to production"
collapse into the same event unless we split them. Two problems with
that collapse:

- Every PR merge becomes a release whether it is ready or not. Half-
  finished work on `main` ships before review can flag it.
- The "what is in production right now?" question loses its branch-
  level answer. A reader has to find the last tag or the deploy log,
  not just read the tip of a branch.

The standard fix is a two-branch model: an integration branch that
absorbs PRs, and a release branch that only moves at explicit release
moments. The two-branch shape also fits the CD pipeline cleanly — the
deploy workflow listens for tags on the release branch, not for
arbitrary merges.

This is the right moment to commit, before the deploy ticket bakes the
single-branch assumption into the CD config.

## Decision

**We will adopt a two-branch model:**

- **`dev`** is the integration branch and the repo default. All PRs
  target `dev`. CI runs on every PR; merges happen once review is
  approved and CI is green.
- **`main`** is the release branch. It accepts only `dev` → `main`
  merges, only at release moments, and only via a Release PR titled
  `Release vX.Y.Z`. Tags (`v0.1.0`, etc.) live on `main`, and the
  production CD workflow watches for those tags.

Day-to-day:

- Branches still follow `<type>/<issue-number>-<slug>` and branch off
  `dev`.
- `Closes #N` in a PR description closes the issue on merge to `dev`,
  not at release time. An issue is "done" when the work is integrated,
  not when it is deployed.
- A staging environment, when added, deploys from `dev` (separate
  decision, separate issue).

Release ritual (manual today; see
[#102](https://github.com/iangoodnight/delve-moar/issues/102) for
future automation): version bump + changelog dating on `dev`, then a
Release PR `dev` → `main`, then tag the merge on `main`, then
`gh release create` to fire the CD workflow.

Branch protection enforces the model:

- `dev`: require PR, require status checks (`API — lint + test`,
  `Web — lint + test`, `CLI — lint + test`, `Gen types — drift check`,
  `pre-commit hooks`, `commitlint`), no force-push.
- `main`: linear history, no force-push, no direct pushes. Native
  GitHub branch protection does not have a "PR head ref must be `dev`"
  rule, so a small CI check on `main`-targeted PRs enforces it.

## Considered alternatives

- **GitHub Flow with environments.** Keep the single `main` trunk and
  gate prod deploys behind a GitHub `production` environment with
  required approvals. Simpler git topology, no second branch to
  maintain. Loses the "what is in prod right now?" branch-level signal,
  and offloads the gating to GitHub's environment UI rather than the
  branch model itself. Real option, but felt like a workaround once we
  decided we wanted a staging-on-`dev` story later.
- **Trunk-based with feature flags.** Land everything on `main` behind
  flags. Powerful at scale, overkill for the current team size and
  release cadence, and introduces a flag system as additional weight.
- **Three-branch (dev → staging → main).** The classic GitFlow shape.
  Staging gets its own long-lived branch. Premature today; staging will
  live on `dev` for now via a `dev`-targeted deploy environment.
  Cheaper to add the third branch later if needed than to maintain it
  empty in the meantime.
- **Tag-only, no release branch.** Stay on a single trunk and just
  rely on tags to define releases. Works in theory; loses the
  always-deployable promise of a dedicated release branch and makes
  "the last green commit on `main`" ambiguous between "last PR merge"
  and "last release."

## Consequences

**Easier:**

- The CD workflow has a clean trigger: any tag on `main`. No filtering,
  no commit-message parsing.
- "What is in prod right now?" has a one-line answer: the tip of
  `main`.
- Reverting a release means redeploying a prior tag — the tag is the
  release artifact identity, not a commit hash buried in a log.
- Staging-on-`dev` becomes a one-environment addition rather than a
  branch reshuffle.

**Harder:**

- Every release is now two PRs: the version bump on `dev` and the
  `dev` → `main` Release PR. The manual ritual in `CONTRIBUTING.md`
  documents this; release-please / similar
  ([#102](https://github.com/iangoodnight/delve-moar/issues/102))
  will fold it back into one when adopted.
- New contributors have to learn the two-branch convention before
  opening their first PR. Mitigated by: branch protection enforces it
  silently (a PR targeting `main` is blocked), the PR template defaults
  to `dev`, and `CONTRIBUTING.md` has a top-level "Branch model"
  section.
- The native GitHub UI default base on a new PR follows the repo's
  default branch, which is `dev` — good — but contributors creating
  branches from `main` will see drift unless we keep `main` strictly
  behind `dev` at non-release times. The release ritual restores
  parity at each release.

**New constraints:**

- `main` is append-only. No force-pushes, no rewrites. If a bad
  release needs to be undone, the fix is a new release that supersedes
  it, not a rewrite of `main`'s history.
- A "PR head ref must be `dev`" check on `main`-targeted PRs has to
  ride along until GitHub provides a native equivalent. The check is
  cheap (one job that asserts `github.head_ref == 'dev'`), but adds
  one more piece of CI surface to maintain.

## Links

- [#125](https://github.com/iangoodnight/delve-moar/issues/125) — the
  issue this ADR was written under
- [#126](https://github.com/iangoodnight/delve-moar/issues/126) — the
  production deploy pipeline that depends on this branch model
- [#102](https://github.com/iangoodnight/delve-moar/issues/102) —
  future automation of the release ritual
- ADR [0004](0004-versioning-model.md), the versioning model whose
  tags live on `main`
- ADR [0006](0006-changelog-convention.md), the changelog convention
  whose dated version headers happen at the `dev` → `main` boundary
