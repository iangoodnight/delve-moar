# Staging environment runbook

How to stand up and operate the staging environment, a parallel copy of
production that deploys from `dev`. Staging exists to rehearse schema migrations
and exercise the auth flows against a production-like target before anything
reaches prod (ADR [0015](../decisions/0015-staging-environment.md),
[#169](https://github.com/iangoodnight/delve-moar/issues/169)).

The workflow and the staging Fly config ship in the repo; everything below is
one-time operator setup that cannot live in the repo (accounts, secrets, DNS).
It mirrors the production bring-up in the [deploy runbook](../deploy.md).

## Topology

Staging is the prod stack a second time, on its own subdomain:

| Piece          | Production                                | Staging                                                   |
| -------------- | ----------------------------------------- | --------------------------------------------------------- |
| Web            | `delvemoar.com` (Vercel, `main`)          | `staging.delvemoar.com` (Vercel, `dev`)                   |
| API            | `api.delvemoar.com` (Fly `delvemoar-api`) | `api.staging.delvemoar.com` (Fly `delvemoar-api-staging`) |
| Postgres       | Fly `delvemoar-db`                        | Fly `delvemoar-db-staging` (separate cluster)             |
| Cookie domain  | `.delvemoar.com`                          | `.staging.delvemoar.com`                                  |
| Deploy trigger | GitHub Release                            | manual `workflow_dispatch` (then `push: dev`)             |

The API lives under `api.staging.delvemoar.com`, not the bare `*.fly.dev` host,
so that the session cookie domain (`.staging.delvemoar.com`) covers both the web
and API subdomains, the same way prod does. Staging must never point at prod's
database or send real email (see [Notes](#notes)).

## One-time setup

### 1. Provision the Fly app and IPs

The prod Fly app is Terraform-managed, but the Terraform Cloud workspace
(`delvemoar-fly`) is pinned to the single prod app, and the Postgres cluster is
already provisioned with `flyctl` rather than Terraform. The simplest path that
matches that split is to create the staging app with `flyctl` too:

```sh
fly apps create delvemoar-api-staging --org personal
fly ips allocate-v4 -a delvemoar-api-staging
fly ips allocate-v6 -a delvemoar-api-staging
```

To keep staging in IaC instead, run the `infra/terraform/fly` module in a second
Terraform Cloud workspace (for example `delvemoar-fly-staging`) with
`-var app_name=delvemoar-api-staging`; do not reuse the prod workspace, or its
state will fight over the app name.

### 2. Create and attach the staging Postgres

A separate cluster, never the prod one:

```sh
fly postgres create \
  --name delvemoar-db-staging --region iad \
  --initial-cluster-size 1 \
  --vm-size shared-cpu-1x --volume-size 1
fly postgres attach delvemoar-db-staging --app delvemoar-api-staging
```

`attach` sets the `DATABASE_URL` secret on the staging app. Confirm it points at
`delvemoar-db-staging` and nothing else does.

### 3. Custom domains and TLS

- **API:** issue a cert and point DNS at the staging app.

  ```sh
  fly certs add api.staging.delvemoar.com -a delvemoar-api-staging
  ```

  Then add the A / AAAA records (or a CNAME to `delvemoar-api-staging.fly.dev`)
  that `fly certs show` prints, and wait for the cert to validate.

- **Web:** in the Vercel project, add `staging.delvemoar.com` and assign it to
  the `dev` branch, then add the CNAME Vercel shows. This turns the existing
  `dev` branch deployment into the staging site.

### 4. Set the staging Fly secrets

These make staging differ from prod (see the
[reference table](#configuration-reference)). The console mailer is the default,
so leaving the SMTP variables unset keeps staging from emailing anyone:

```sh
fly secrets set -a delvemoar-api-staging \
  ENV=staging \
  SESSION_COOKIE_DOMAIN=.staging.delvemoar.com \
  CORS_ALLOWED_ORIGINS=https://staging.delvemoar.com \
  FRONTEND_BASE_URL=https://staging.delvemoar.com \
  SENTRY_ENVIRONMENT=staging
```

`DATABASE_URL` is already set by the Postgres attach. Sessions are opaque and
server-side and CSRF is a double-submit cookie, so there is no app signing
secret to set. A staging `SENTRY_DSN` is optional; set it to a staging Sentry
project if you want staging errors tracked separately.

### 5. Add the GitHub `staging` environment

The workflow (`.github/workflows/deploy-staging.yml`) runs in the `staging`
GitHub environment. Create it under Settings > Environments and add a
`FLY_API_TOKEN` secret scoped to it (a token that can deploy the staging app;
`fly tokens create deploy -a delvemoar-api-staging`).

### 6. Configure Vercel for staging

In the Vercel project, scoped to the `dev` / Preview environment:

- Set `VITE_APP_API_URL=https://api.staging.delvemoar.com`.
- Leave `VITE_APP_ANALYTICS_DOMAIN` unset (analytics stay off on staging).
- Enable Deployment Protection (password or Vercel authentication) so staging is
  not publicly reachable or crawlable.

## Deploying

Staging deploys manually for now. In the GitHub Actions tab, run the **Deploy
(staging)** workflow against `dev` ("Run workflow"). It builds the image, runs
`alembic upgrade head` against the staging database in an ephemeral machine
(aborting the deploy on a migration failure), then `flyctl deploy`, exactly like
prod. The web side redeploys itself from `dev` through Vercel, so the workflow
covers the API only.

Once staging has proven itself, switch the workflow's trigger from
`workflow_dispatch` to `push: [dev]` (the comment at the top of
`deploy-staging.yml` shows the change) so every merge to `dev` deploys staging
automatically.

## Configuration reference

| Where                         | Variable                | Value                               | Notes                                 |
| ----------------------------- | ----------------------- | ----------------------------------- | ------------------------------------- |
| Fly (`delvemoar-api-staging`) | `ENV`                   | `staging`                           | drives cookie-secure + Sentry env     |
| Fly                           | `DATABASE_URL`          | staging cluster                     | set by `fly postgres attach`          |
| Fly                           | `SESSION_COOKIE_DOMAIN` | `.staging.delvemoar.com`            | shares the cookie across web + API    |
| Fly                           | `CORS_ALLOWED_ORIGINS`  | `https://staging.delvemoar.com`     | the staging web origin                |
| Fly                           | `FRONTEND_BASE_URL`     | `https://staging.delvemoar.com`     | used in email links                   |
| Fly                           | `SENTRY_ENVIRONMENT`    | `staging`                           | optional; falls back to `ENV`         |
| Fly                           | SMTP vars               | unset                               | unset = console mailer, no real email |
| GitHub env `staging`          | `FLY_API_TOKEN`         | staging deploy token                | used by the workflow                  |
| Vercel (dev/Preview)          | `VITE_APP_API_URL`      | `https://api.staging.delvemoar.com` | the staging API                       |

## Verification checklist

Run after the first staging deploy.

- [ ] **API up.** `curl https://api.staging.delvemoar.com/health` returns 200.
- [ ] **Migrations applied.** The deploy's "Run database migrations" step
      succeeded, and the staging DB is at head
      (`fly ssh console -a delvemoar-api-staging -C "uv run alembic current"`).
- [ ] **Web up and protected.** `https://staging.delvemoar.com` loads behind the
      deployment-protection gate and reaches the staging API (no CORS errors in
      the console).
- [ ] **Auth end to end.** Sign up on staging, then read the verification link
      from the app logs (`fly logs -a delvemoar-api-staging`) rather than an
      inbox (console mailer), and confirm the flow completes.
- [ ] **Cookie isolation.** The session cookie is scoped to
      `.staging.delvemoar.com`, so a staging login does not affect prod.
- [ ] **noindex.** Staging serves `noindex, nofollow`, same as prod.
- [ ] **Data isolation.** The staging app's `DATABASE_URL` points at
      `delvemoar-db-staging`, never `delvemoar-db`.

## Notes

- **No real email.** Staging uses the console mailer (the default), so
  verification, reset, and invite links print to the logs. Never wire real SMTP
  to staging; if a full click-through is needed, point it at a mail-catcher
  (Mailpit), not a live provider.
- **Isolation is load-bearing.** The separate Postgres cluster and the console
  mailer are the two things that make it safe to rehearse destructive migrations
  and auth flows on staging. Keep them separate.
- **Cost.** Staging runs `min_machines_running = 0`
  (`apps/api/fly.staging.toml`), so the API machine stops when idle and costs
  little; the second Postgres is the main standing cost.
- **Teardown.** To retire staging: `fly apps destroy delvemoar-api-staging` and
  `fly apps destroy delvemoar-db-staging`, remove the Vercel domain and the
  GitHub `staging` environment, and delete the DNS records.
