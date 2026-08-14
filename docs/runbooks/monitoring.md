# Monitoring and alerting runbook

How production failures get noticed without watching logs by hand, and how to
wire it up. Phase 1b puts user accounts behind the API and a real auth UI in the
browser, so a silent 500 or an outage now costs real users. This runbook is the
monitoring baseline that gates shipping auth to production (#167).

The integration code ships disabled. The API and web seams stay inert until
their Sentry DSNs are set, so nothing is emitted from local dev, CI, or tests.
Turning monitoring on in production is the secret-setting and account work
below; it does not need a code change.

## What we rely on

One vendor plus the platform we already run on:

1. **Sentry** (SaaS, free Developer plan) for error tracking on both the API and
   the web app, the uptime checks on the public endpoints, and the alert
   delivery. One account, one dashboard, one place to manage alert rules.
2. **Fly managed Grafana** (`fly-metrics.net`) for Postgres metrics
   (connections, CPU/memory, database size). This is built into the Fly
   organization with no setup. It is view-only: we read the dashboards there,
   but alert rules must live elsewhere (see below).

Email is the alert channel for now. A chat webhook can be added later in Sentry
without touching the app.

## Error tracking (Sentry)

The seams:

- API: [`app/observability.py`](../../apps/api/app/observability.py),
  initialized before the app is created in
  [`app/main.py`](../../apps/api/app/main.py). No-op until `SENTRY_DSN` is set.
- Web: [`lib/monitoring`](../../apps/web/src/lib/monitoring/monitoring.ts),
  initialized before render in [`main.tsx`](../../apps/web/src/main.tsx). No-op
  until `VITE_APP_SENTRY_DSN` is set; the app's `ErrorBoundary` reports caught
  errors through it.

Both keep PII off and tracing off (errors only) to stay within the free quota.
The web seam additionally strips query strings from event URLs and breadcrumbs,
because the verify-email and reset-password routes carry single-use tokens in
the query. See the [privacy note](#privacy) below.

### One-time setup

1. Create a Sentry account / organization (free Developer plan).
2. Create two projects: one **Python** project for the API, one **React**
   project for the web app. Each has its own DSN.
3. Set the API DSN as a Fly secret (it is redeployed automatically):

   ```sh
   fly secrets set SENTRY_DSN='https://<key>@<org>.ingest.sentry.io/<id>' \
     -a delvemoar-api
   ```

   `SENTRY_ENVIRONMENT` and `SENTRY_TRACES_SAMPLE_RATE` are optional overrides
   (environment falls back to `ENV`, tracing defaults to off).

4. Set the web DSN in the Vercel project (Settings > Environment Variables,
   Production scope): `VITE_APP_SENTRY_DSN`. A Sentry DSN is a write-only ingest
   key, not a secret, so it is safe to ship in the client bundle.
5. For readable web stack traces, add the source-map upload credentials to the
   **same Vercel project** as build-time variables (Production scope). These are
   read by `@sentry/vite-plugin` during `pnpm build`; `SENTRY_AUTH_TOKEN` is a
   real secret and must never carry the `VITE_APP_` prefix, so it never reaches
   the bundle.

   | Variable            | Purpose                               |
   | ------------------- | ------------------------------------- |
   | `SENTRY_AUTH_TOKEN` | Authorizes source-map upload (secret) |
   | `SENTRY_ORG`        | Sentry organization slug              |
   | `SENTRY_PROJECT`    | The web project slug                  |

   With no `SENTRY_AUTH_TOKEN`, the build skips source maps entirely (it never
   fails on a missing token), so local and CI builds are unaffected.

## Uptime monitoring (Sentry)

In Sentry, create two **Uptime** monitors:

| Target | URL                                | Expect |
| ------ | ---------------------------------- | ------ |
| Web    | `https://delvemoar.com`            | 200    |
| API    | `https://api.delvemoar.com/health` | 200    |

A short interval (1-5 min) is fine. The API runs with `min_machines_running = 1`
(see [`apps/api/fly.toml`](../../apps/api/fly.toml)), so a check never reads a
cold-start wake as downtime. Attach the email alert (below) to both monitors.

## Postgres metrics (Fly Grafana)

Open `fly-metrics.net` (or `fly dashboard metrics`), select the organization,
and open the Postgres dashboard for `delvemoar-db`. It shows connection counts,
CPU and memory, and database size with no setup. This managed Grafana is
**view-only**: it renders Fly's dashboards but does not let you create or save
alert rules, so storage alerting has to live outside it (options below).

The cluster is a single **1 GB** volume (see the
[backup runbook](postgres-backup-restore.md)), so the metric that matters most
is database size. At current scale this is not a near-term risk: the prod DB is
SRD-only and well under 1 MB (the backup drill dumped roughly 400 KB), and the
daily volume snapshots are the backstop. A storage alert is a future-growth
safety net, not a launch gate. Connections are worth a glance but are not close
to the limit either.

When you do want the alert, there are three options, cheapest first:

1. **Defer.** Rely on the daily snapshots plus the manual headroom below, and
   revisit if the database starts growing (homebrew content, more users).
2. **Real alerting via your own Grafana.** Because the Fly-managed Grafana
   cannot save alert rules, stand up a separate Grafana (for example the Grafana
   Cloud free tier) pointed at Fly's Prometheus endpoint
   (`https://api.fly.io/prometheus/<org-slug>`, with an
   `Authorization: Bearer <fly readonly token>` header) and configure the
   ~80%-of-1 GB alert there, routed to the same email.
3. **One-time manual headroom.** `fly volumes extend <vol_id> -s <GB>` grows the
   volume (volumes only grow; confirm the flags with
   `fly volumes extend --help`). Auto-extend is not available for this legacy
   Fly Postgres volume, so any growth is manual.

## Alerting

In Sentry, configure at least one **email** alert and confirm the delivery
address. The baseline alert rules:

- A new issue (error) is seen in either project.
- An uptime monitor goes down.
- (Optional) Postgres volume usage crosses the storage threshold. This cannot be
  an alert in the Fly-managed Grafana; see
  [Postgres metrics](#postgres-metrics-fly-grafana) for how to wire it (your own
  Grafana on Fly's Prometheus) or why it can be deferred.

Sentry's default "alert on a new issue" rule covers the first; the uptime alert
is attached to the monitors above.

## Configuration reference

| Where                    | Variable                    | Required        | Notes               |
| ------------------------ | --------------------------- | --------------- | ------------------- |
| Fly (`delvemoar-api`)    | `SENTRY_DSN`                | to enable API   | empty = disabled    |
| Fly                      | `SENTRY_ENVIRONMENT`        | no              | falls back to `ENV` |
| Fly                      | `SENTRY_TRACES_SAMPLE_RATE` | no              | default `0.0`       |
| Vercel (web, Production) | `VITE_APP_SENTRY_DSN`       | to enable web   | shipped in bundle   |
| Vercel build             | `SENTRY_AUTH_TOKEN`         | for source maps | secret; build-only  |
| Vercel build             | `SENTRY_ORG`                | for source maps | org slug            |
| Vercel build             | `SENTRY_PROJECT`            | for source maps | web project slug    |

## Verification checklist

Run after the first deploy with the DSNs set. This is what satisfies the #167
acceptance criteria.

- [ ] **API errors live.** Trigger a deliberate error against prod and confirm
      the event appears in the API project. The cleanest one-off is a captured
      message from inside the running app:

  ```sh
  curl https://api.delvemoar.com/health   # wake the machine first
  fly ssh console -a delvemoar-api \
    -C "python -c 'import sentry_sdk; sentry_sdk.capture_message(\"prod smoke\"); sentry_sdk.flush()'"
  ```

- [ ] **Web errors live.** On `https://delvemoar.com`, throw an uncaught error
      from the browser console (Sentry's global handler catches it):

  ```js
  setTimeout(() => {
    throw new Error("sentry web smoke");
  });
  ```

  Confirm it lands in the web project with a readable (un-minified) stack trace,
  which also proves the source-map upload worked.

- [ ] **Uptime live.** Confirm both monitors read "up" in Sentry.

- [ ] **Alert path verified.** Use Sentry's "send test notification" on the
      alert rule and confirm the email arrives. The error smokes above also
      exercise the new-issue rule end to end.

Remove any deliberate test errors and resolve the smoke issues in Sentry
afterward.

## Privacy

Sentry becomes a third-party processor of error data, so the seams are
deliberately conservative:

- `send_default_pii` is off in both SDKs; user identity is not attached to
  events.
- Tracing is off, so no request transactions are sent.
- The web seam strips query strings from event URLs and breadcrumbs, so the
  single-use tokens in verify-email and reset-password links never reach Sentry.
- Session Replay is not enabled.

The site runs with `noindex` and has no public audience yet; revisit the
privacy-policy wording if that changes.
