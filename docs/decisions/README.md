# Architecture Decision Records

This directory holds DelveMoar's [Architecture Decision Records](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions),
or ADRs.

An ADR captures one architectural decision: what we chose, the context
that drove it, what we considered instead, and the consequences we
accept by choosing it. ADRs explain the **why**. The code shows the
**what**.

## When to write one

Write an ADR when a decision:

- Constrains future code (a new contributor would need to ask "why?")
- Has real alternatives that were considered and rejected
- Is hard to reverse, or the cost of reversing it is hidden

You do not need an ADR for: routine refactors, dependency bumps, bug
fixes, or stylistic preferences. If a code review comment captures it
adequately, that is fine.

## Format

We use [Nygard's classic template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions),
plus an explicit "Considered alternatives" section borrowed from
[MADR](https://adr.github.io/madr/). Copy [`template.md`](template.md)
when starting a new ADR.

```
# NNNN. Title

- Status: proposed | accepted | superseded by NNNN | deprecated
- Date: YYYY-MM-DD

## Context
## Decision
## Considered alternatives
## Consequences
## Links
```

Keep ADRs focused. One decision per file. If you find yourself
documenting two related decisions, write two ADRs and cross-link them.

## Numbering

`NNNN-kebab-case-slug.md`. Four-digit zero-padded number, descriptive
slug. Numbers are issued in chronological order and never reused, even
if an ADR is later deprecated or superseded.

When you start a new ADR, use the next available number. Do not gap.

## Lifecycle

```
proposed -> accepted -> superseded by NNNN
                    \-> deprecated
```

- **proposed**: under discussion, not yet binding. Used when an ADR is
  written before the decision is fully settled (e.g. a versioning model
  that is provisional pending a later PR). PRs that propose ADRs
  should be reviewed and merged like any other PR; the ADR moves to
  `accepted` in a follow-up PR when the decision is locked in.
- **accepted**: the decision is in force. Code in the repo should reflect
  it.
- **superseded by NNNN**: a newer ADR replaces this one. The newer ADR
  should reference the older one in its `Links` section.
- **deprecated**: the decision no longer applies, but no replacement was
  written. Used for ADRs that documented a decision tied to a phase that
  has ended.

ADRs are append-only. Do not edit a merged, accepted ADR to change its
decision. Write a new ADR that supersedes it.

You may edit a merged ADR for cosmetic fixes (typos, broken links,
status updates as part of the lifecycle above).

## Index

| # | Title | Status |
|---|-------|--------|
| [0001](0001-openapi-as-source-of-truth.md) | OpenAPI is the single source of truth for the API contract | accepted |
| [0002](0002-web-features-layout.md) | Web architecture: bulletproof-react features layout with enforced boundaries | accepted |
| [0003](0003-per-pr-session-model.md) | Per-PR session model with a local planning workspace | accepted |
| [0004](0004-versioning-model.md) | Versioning: per-app semver plus monorepo `0.x.y` at phase milestones | accepted |
| [0005](0005-openapi-30-downgrade.md) | Serve OpenAPI 3.0.3 from a 3.1 source until oapi-codegen catches up | accepted |
| [0006](0006-changelog-convention.md) | Changelog convention: Keep a Changelog, inline edits, manual release cuts | accepted |
| [0007](0007-web-typography-system.md) | Web typography system: token layering, scoped Radix overrides, design-system contract | proposed |
| [0008](0008-frontend-coverage-policy.md) | Front-end coverage policy under React Compiler | proposed |
| [0009](0009-branch-model.md) | Branch model: `dev` for integration, `main` for tagged releases | accepted |
| [0010](0010-authentication.md) | Authentication: roll our own with argon2id and server-side sessions | accepted |
| [0011](0011-campaign-model.md) | Campaign model: user-owned content, many-to-many to campaigns | accepted |
| [0012](0012-visibility-and-sharing.md) | Visibility and sharing: private by default, campaign-based sharing, link sharing as a stretch | accepted |
| [0013](0013-stateful-side-effecting-hooks.md) | Stateful, side-effecting hooks are single-consumer; URL filters are pure adapters | accepted |
| [0014](0014-book-model.md) | Book model: content collections, SRD as a system book | accepted |
