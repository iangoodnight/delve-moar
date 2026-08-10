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

## Phase 1b: Homebrew authoring and accounts (current)

The point at which the homebrew-first thesis starts to land in the
product. Phase 1a's catalog becomes something a DM can extend and share
with their players.

Scope:

- User accounts and sessions (email and password, server-side sessions).
- Per-user homebrew monsters, spells, and items, surfaced alongside the
  SRD baseline in search.
- Campaigns as an organizing layer, with membership and invites.
- Visibility model: private by default, with campaign-based sharing and
  optional view-only share links.
- An authorization layer, rate limiting, and the operational prep
  (backup and restore, monitoring, analytics, a staging environment)
  that user data requires.
- CLI parity for the new endpoints.

The architecture is settled in three ADRs: authentication
([0010](decisions/0010-authentication.md)), the campaign model
([0011](decisions/0011-campaign-model.md)), and visibility and sharing
([0012](decisions/0012-visibility-and-sharing.md)).

Milestone: [Phase 1b - Homebrew and Accounts](https://github.com/iangoodnight/delve-moar/milestone/4).

Shipped to production so far (through v0.1.4): user accounts and
sessions, email verification and password reset, account settings
(password and email changes), IP-keyed rate limiting on the auth
endpoints, and books (owned content collections layered over the SRD).
Still ahead in this phase: homebrew authoring, campaigns and the
visibility model, analytics and a staging environment, and CLI parity.

What will be true at the end of Phase 1b: a logged-in DM can create
their own homebrew content, organize it into campaigns, and share a
campaign's content with invited players, all private by default.

## Phase 2 and beyond (direction of travel)

Not committed. Campaign-scoped content and campaign-based player sharing,
once slated for here, moved forward into Phase 1b. What remains is the
more speculative, higher-effort work. The order below is current best
guess, and could be re-prioritized once Phase 1 lands and we see how the
product is actually used.

- **Encounter builder.** Build encounters from SRD plus homebrew,
  calculate XP budgets, run initiative.
- **Public sharing and forking.** A public homebrew gallery and
  fork-to-modify, gated on a moderation and safety story.
- **Account-to-account sharing.** Invites and sharing outside a single
  campaign.
- **Richer player-facing surfaces.** Beyond Phase 1b's campaign read
  access: player dashboards and notifications.
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
