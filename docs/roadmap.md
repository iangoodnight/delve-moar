# Roadmap

DelveMoar ships in phases. Each phase is a coherent slice of the product
and corresponds to a GitHub milestone. This page is the durable summary;
the milestones themselves track per-PR scope.

The product thesis is **homebrew-first DM tools**. Phases work outward
from that: get the SRD baseline catalog working, then layer on
homebrew authoring, then campaign-scoped content and the encounter
builder.

## Phase 0: Foundation (done)

Repo skeleton, tooling, CI. No product features.

Scope:

- Three-app monorepo (`apps/api`, `apps/web`, `apps/cli`) plus shared
  TypeScript packages.
- OpenAPI codegen pipeline (`scripts/gen_types.sh`) wiring FastAPI to
  both the web TS types and the Go HTTP client.
- Docker Compose for local dev (Postgres + API + web).
- Lint, test, and gen-types-check enforced in CI.
- Pre-commit and pre-push hooks for the three languages plus shell
  scripts.

Milestone: [Phase 0 - Foundation](https://github.com/iangoodnight/delve-moar/milestone/1).

What is true at the end of Phase 0: a contributor can clone the repo,
run `task dev`, and have the full stack running locally. CI catches
schema drift between the API and its two clients before review.

## Phase 1a: SRD Catalog, read-only (done — v0.1.0)

Monsters, spells, and items seeded from the 5e SRD. Browse and search
via web. No auth required.

Scope:

- Seed scripts that load the SRD into Postgres.
- Read-only API endpoints with cursor pagination per the
  [White House API standards](https://github.com/WhiteHouse/api-standards).
- Web pages: monster list with infinite scroll and search, monster
  detail with statblock, spell list and detail, item list and detail.
- Production deploy: Vercel (web) + Fly.io (API + Postgres), CD on
  GitHub Release, noindex while product matures.

Milestone: [Phase 1a - SRD Catalog (read-only)](https://github.com/iangoodnight/delve-moar/milestone/2).

What is true at the end of Phase 1a: anyone can browse the full 5e SRD
through the web app. The full stack (seed to API to codegen to web) is
proven on real content. The site is publicly hostable (Vercel + Fly.io)
with noindex / nofollow while the product matures. No accounts, no
edits, no campaign scoping.

## Phase 1b: Homebrew authoring (current, partially defined)

The point at which the homebrew-first thesis starts to land in the
product.

Likely scope:

- User accounts and sessions.
- Per-user homebrew monsters, spells, items.
- Edit and clone-from-SRD flows.
- Visibility model: private by default, shareable later.

Open questions still being worked out: auth provider choice and the
campaign model. Tracked locally in the planning workspace; will land in
ADRs as they get decided.

What will be true at the end of Phase 1b: a logged-in DM can create
their own homebrew content, modify clones of SRD entries, and keep
their work private to their account.

## Phase 2 and beyond (direction of travel)

Not committed. The order below is current best guess, and any of these
could be re-prioritized once Phase 1 lands and we see how the product
is actually used.

- **Campaign-scoped content.** The `campaigns` table from Phase 0
  anticipates this. A DM picks a campaign and sees only that
  campaign's homebrew plus the SRD baseline.
- **Encounter builder.** Build encounters from SRD plus homebrew,
  calculate XP budgets, run initiative.
- **Sharing and forking.** Public homebrew gallery, fork-to-modify.
- **Player-facing read views.** A DM shares a campaign with players.
  Players see only what the DM publishes.
- **Mobile-friendly TUI surfaces.** The CLI already uses Bubble Tea.
  Could expand to an encounter run UI.

When a phase opens, the first issue in that phase is usually "flesh
out the roadmap for this phase and partially define the next one".

## Where this lives

- This file: the settled, reviewed roadmap. Links into milestones for
  per-PR scope.
- GitHub milestones: per-PR tracking inside a phase.
- GitHub issues: individual units of work, one issue per PR.

For the difference between this file, the local `planning/` workspace,
and `README.md`, see [`docs/README.md`](README.md#planning-vs-docs-vs-readme).
