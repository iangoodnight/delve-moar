# 0003. Per-PR session model with a local planning workspace

- Status: accepted
- Date: 2026-04-25

## Context

DelveMoar is being built with active LLM assistance. The default assumption with
LLM tools is a long-running conversation that accumulates context. That
assumption breaks down for two reasons:

- Conversations end. The next session starts cold and cannot recover what the
  previous session was thinking.
- Other contributors (human or LLM) need to be able to pick up work without
  inheriting one person's chat history.

We need a workflow that treats each piece of work as self-contained, with the
durable context for it living in the repo rather than in a chat log.

## Decision

DelveMoar uses a **per-PR session model**:

- Each piece of work starts as a GitHub issue.
- The issue gets a branch named `<type>/<issue-number>-<short-slug>`.
- The branch lands as one PR that closes the issue.
- Each conversation (LLM or otherwise) starts fresh and ends when the PR lands.
  No conversation spans multiple PRs.

Durable context is split across three places, each with a defined job:

- **`README.md`**: front door. Quick start, links into `docs/`. The audience is
  a first-time visitor.
- **`docs/`**: depth. Architecture, recipes, glossary, ADRs. Reviewed in PRs.
  The audience is contributors digging in.
- **`planning/`**: working memory. Roadmap notes, open questions, session logs.
  **Gitignored**, local-only. The audience is whoever is actively driving the
  project, including LLM sessions in this clone.

Anything in `planning/` that becomes settled graduates to `docs/` or
`README.md`. The goal is for `planning/` to stay small.

This ADR formalizes a working pattern that emerged organically during Phases 0
and 1a. Codifying it now makes it teachable to future contributors.

## Considered alternatives

- **Long-lived chat sessions across multiple PRs.** Works for one person on one
  machine. Falls apart the moment a session ends, a context limit hits, or
  another contributor needs to participate.
- **All planning in `docs/`.** Cleaner directory tree. Pollutes the reviewed
  docs with speculative material that has not earned a place. Makes `docs/`
  slower to scan and harder to trust.
- **All planning in GitHub issues, comments, and discussions.** Better for
  cross-team visibility. Worse for local LLM context: an agent has to fetch
  issue threads to know what the project is thinking, and the threading does not
  match the structure of the project.
- **Project management tool (Linear, Notion, etc.).** Adds a tool with its own
  auth, billing, and access model. The benefit at our current scale is small.
  Revisit if collaboration grows.

## Consequences

**Easier:**

- A new contributor (or LLM session) opens
  `planning/context-for-new-sessions.md` and orients quickly.
- Each PR is reviewable in isolation: scope is bounded by an issue, not by what
  came up in a chat.
- The "what is this directory for?" question has a clear answer per directory.
- LLM sessions can be ephemeral without losing institutional knowledge.

**Harder:**

- Discipline is required to keep `planning/` small. Notes that should graduate
  to `docs/` instead linger as planning files.
- `planning/` is per-clone. Two contributors on the same project have separate
  working memory unless they explicitly share files.
- Splitting work into discrete PR-sized chunks takes more upfront thought than
  "open a chat and start typing".

**New constraints:**

- `planning/` must not be committed. The current mechanism is
  `.git/info/exclude` (per-clone) plus a future `.gitignore` entry (PR 7 of the
  docs initiative).
- The PR template, CONTRIBUTING, and CODEOWNERS all assume the one-issue-one-PR
  shape.

## Links

- [`CONTRIBUTING.md`](../../CONTRIBUTING.md), the workflow that implements this
  decision
- [`docs/README.md`](../README.md#planning-vs-docs-vs-readme), the
  planning-vs-docs-vs-README split
- [`planning/README.md`](../../planning/README.md) (local-only), conventions
  inside `planning/`
- [`planning/context-for-new-sessions.md`](../../planning/context-for-new-sessions.md)
  (local-only), the launchpad for fresh sessions
