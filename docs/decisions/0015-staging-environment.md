# 0015. Staging environment: a parallel Fly + Vercel stack deployed from `dev`

- Status: accepted
- Date: 2026-08-25

## Context

ADR [0009](0009-branch-model.md) adopted `dev` as the integration branch and
`main` as the release branch, and said in passing that "a staging environment,
when added, deploys from `dev` (separate decision, separate issue)." It also
rejected a third `staging` branch, committing instead to "staging on `dev` via a
`dev`-targeted deploy environment." This ADR is that separate decision: the
concrete topology of staging.

Phase 1b is the moment it earns its place. The auth core and the campaign and
homebrew schema migrations all reach production for the first time in the run-up
to `0.2.0`. Rehearsing those migrations, and exercising the auth flows (cookies,
email verification, password reset) against a production-like target, before any
of it touches prod, is the driver
([#169](https://github.com/iangoodnight/delve-moar/issues/169)).

The production stack is already parameterized enough that a parallel staging
stack is mostly configuration, not new architecture:

- **API**: Fly app `delvemoar-api`, region `iad`. The Fly app and its IPs are
  Terraform-managed and parameterized by `var.app_name`; the Postgres cluster is
  flyctl-managed (a deliberate split, documented in `infra/terraform/fly`). The
  deploy workflow fires on `release: published`, builds an image, runs
  `alembic upgrade head` in an ephemeral machine, then `flyctl deploy`.
- **Web**: Vercel, which deploys `main` to production and already builds a
  branch deployment for `dev`.
- **Config** is environment-driven: cookie domain, CORS origins, frontend base
  URL, SMTP, and Sentry environment all come from settings, so a second
  deployment differs from prod only in its values.

## Decision

**We add a staging environment that mirrors production as a parallel stack,
deployed from `dev`.**

- **API.** A second Fly app, `delvemoar-api-staging`, built from the same
  Dockerfile and image. It gets its own `apps/api/fly.staging.toml`, identical
  to `fly.toml` except `min_machines_running = 0`: staging tolerates cold
  starts, so its machine stops fully when idle (prod keeps one warm for uptime).
  The app and its IPs are provisioned through the existing Terraform, with
  `app_name = "delvemoar-api-staging"`; Postgres stays flyctl-managed, mirroring
  the prod split.
- **Database.** A **separate** Fly Postgres cluster, `delvemoar-db-staging`,
  single node and smallest volume, attached only to the staging app. Physical
  isolation from prod is non-negotiable: the whole point is rehearsing
  migrations with zero chance of touching prod data.
- **Web.** Vercel's existing `dev` branch deployment, promoted to staging with a
  stable `staging.delvemoar.com` domain, staging-scoped env (`VITE_APP_API_URL`
  -> the staging API, analytics off), and Vercel deployment protection
  (password) so it is neither publicly reachable nor crawlable.
- **Trigger, phased.** Start with a **manual** `workflow_dispatch` deploy
  (`.github/workflows/deploy-staging.yml`), so staging deploys when we choose
  while its secrets and environment are still settling. Once it is proven, the
  same workflow flips to `push: [dev]` for auto-deploy on every merge. Web
  auto-deploys from `dev` through Vercel's native integration, so the workflow
  covers the API only, exactly as the production `deploy.yml` does.
- **Config isolation.** Staging carries its own Fly secrets, distinct from prod:
  `ENV=staging`, its own `DATABASE_URL`,
  `SESSION_COOKIE_DOMAIN=.staging.delvemoar.com` (so a staging session cookie
  can never be confused with a prod one), `CORS_ALLOWED_ORIGINS` and
  `FRONTEND_BASE_URL` pointing at the staging web origin, and
  `SENTRY_ENVIRONMENT=staging`.
- **Email.** Staging uses the **console mailer**, not real SMTP. Verification,
  reset, and invite links print to the app logs instead of emailing real
  addresses, so a stray signup on staging never sends mail from the domain to a
  real person. A mail-catcher (Mailpit) is the upgrade if a full click-through
  is ever needed; real SMTP is never wired to staging.
- **noindex** stays on, as in prod's soft launch; deployment protection is the
  stronger guard.

## Considered alternatives

- **Shared Postgres cluster, separate database.** Attach the one `delvemoar-db`
  cluster to the staging app with its own database name. Cheaper, no second
  cluster. Rejected: a bad staging migration or a load spike then shares an
  instance with production, which defeats the "rehearse safely" goal. A tiny
  second cluster is worth the isolation.
- **Ephemeral, on-demand staging.** Provision staging per test run and tear it
  down after. Cheapest at rest. Rejected for now: more machinery than a small
  always-idle app, which already costs near nothing with
  `min_machines_running = 0`, and a stable URL is convenient for ad hoc checks.
  Revisit if cost becomes real.
- **A third `staging` branch (GitFlow).** Rejected already in ADR 0009 and
  restated here: staging tracks `dev` through a deploy target, not a long-lived
  branch.
- **Local migration rehearsal only.** The
  [postgres-backup-restore runbook](../runbooks/postgres-backup-restore.md)
  ([#166](https://github.com/iangoodnight/delve-moar/issues/166)) already
  restores a prod dump locally for `alembic upgrade head` drills. Genuinely
  useful and kept as the lighter drill, but it is not a production-like URL for
  exercising auth end to end (real cookies, HTTPS, domains), so it complements
  staging rather than replacing it.
- **Vercel preview URL with no stable domain.** Use the auto `-git-dev-` preview
  URL as-is. Works on day one with zero config. Fine as the very first step
  before DNS is set, but not the durable answer: a stable `staging.` domain
  makes cookie-domain isolation and bookmarking clean.

## Consequences

**Easier:**

- Migrations and auth flows get rehearsed against a production-like target
  before every `0.2.0`-bound change, off prod. "Is this migration safe?" gets a
  real answer before the Release PR, not during it.
- The staging stack is configuration, not new architecture: same image, same
  Terraform module (a different `app_name`), same Vercel project (a different
  branch and env set).

**Harder:**

- A second set of secrets and a second Postgres to keep in step as config
  evolves. Drift between prod and staging config becomes a maintenance surface;
  the workflow and a setup runbook pin the shape.
- Recurring cost: a second, small Postgres plus Fly and Vercel usage. Kept low
  by `min_machines_running = 0` on the staging API and the smallest DB volume.
- One-time operator setup is real and cannot live in the repo: create the Fly
  app and Postgres cluster, set the staging secrets, add the GitHub `staging`
  environment and its `FLY_API_TOKEN`, configure the Vercel domain, env, and
  protection, and point `staging.delvemoar.com` DNS. The workflow and this ADR
  are the code; those steps are done by hand, mirroring the prod bring-up.

**New constraints:**

- Staging must never point at prod's database or send real email. The separate
  cluster and the console mailer are load-bearing, not incidental.
- Session cookies stay domain-scoped so staging and prod auth cannot cross. Any
  change to the cookie-domain strategy has to preserve that separation.

## Links

- [#169](https://github.com/iangoodnight/delve-moar/issues/169), the staging
  environment issue this ADR decides
- ADR [0009](0009-branch-model.md), the branch model that deferred this to "a
  separate decision, separate issue" and rejected a third branch
- ADR [0010](0010-authentication.md), the auth flows staging exists to rehearse
- The [postgres-backup-restore runbook](../runbooks/postgres-backup-restore.md),
  the lighter local migration-drill alternative
- The production [`deploy.yml`](../../.github/workflows/deploy.yml) this staging
  workflow parallels
