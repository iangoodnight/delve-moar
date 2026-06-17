# Deployment runbook

DelveMoar runs on two platforms:

| Layer | Platform | URL |
|---|---|---|
| Web (SPA) | Vercel (Hobby) | `https://delvemoar.com` |
| API | Fly.io (`delvemoar-api`) | `https://api.delvemoar.com` |
| Postgres | Fly Postgres (`delvemoar-db`) | private network only |

## How production deploys work

### Web (Vercel)

Vercel's GitHub integration watches `main`. Every push to `main`
triggers a production deploy automatically. Preview deploys run on
every PR branch and on `dev`. No GitHub Actions step is needed for the
web side.

### API (Fly.io)

The CD workflow (`.github/workflows/deploy.yml`) fires when a GitHub
Release is published on `main`. Steps in order:

1. Build the Docker image from `apps/api/Dockerfile`, tagged with the
   git SHA (`registry.fly.io/delvemoar-api:<sha>`). Never `latest`.
2. Push the image to the Fly registry.
3. Run `alembic upgrade head` in an ephemeral Fly machine using the
   new image. If migrations fail the workflow exits non-zero and the
   deploy is aborted before traffic swaps over.
4. Deploy via `flyctl deploy --image <sha>`.

The CD workflow requires one secret in the `production` GitHub
environment: `FLY_API_TOKEN`.

## Release ritual

See [CONTRIBUTING.md](../CONTRIBUTING.md#cutting-a-release-manual) for
the full step-by-step. In brief:

1. Bump `VERSION` + date the changelog on `dev` in a PR.
2. Open a `dev` -> `main` Release PR.
3. Merge.
4. Tag the merge commit: `git tag vX.Y.Z && git push origin vX.Y.Z`.
5. Create a GitHub Release pointing at the tag. This triggers the CD
   workflow.

## Rollback

### Web rollback

In the Vercel dashboard, open the project, find the previous
deployment, and click "Promote to Production". Instant, no rebuild.

Alternatively via CLI:

```bash
vercel rollback --scope delvemoar
```

### API rollback

Re-deploy a previous image SHA. The prior SHA is visible in the
GitHub release history or the Fly deployment log.

```bash
flyctl deploy \
  --config apps/api/fly.toml \
  --image registry.fly.io/delvemoar-api:<previous-sha> \
  --ha=false
```

If the rollback requires reversing a migration, run a down migration
manually:

```bash
fly ssh console --app delvemoar-api \
  -C "uv run alembic downgrade -1"
```

## Backup and restore

Database recovery (daily volume snapshots, on-demand logical dumps,
and the tested restore procedure) lives in its own runbook:
[Postgres backup and restore](runbooks/postgres-backup-restore.md).
Take a logical backup before any release that runs a migration; the
[release checklist](../CONTRIBUTING.md#cutting-a-release-manual) calls
this out.

## Infrastructure provisioning (first-time setup)

These steps are one-time. The repo ships with the IaC config; apply it
once to stand up the production infrastructure.

### Prerequisites

- `flyctl` installed and authenticated (`fly auth login`)
- `terraform` >= 1.5 installed
- A [Terraform Cloud](https://app.terraform.io) free account, org
  named `delvemoar`, workspace named `delvemoar-fly`
- `TF_TOKEN_app_terraform_io` set in the shell (or in GitHub Actions
  secrets for CI)

### Fly app and Postgres

```bash
# Create the API app (Terraform will reference this name)
fly apps create delvemoar-api

# Create the Postgres cluster (managed outside Terraform to keep
# credentials out of state)
fly postgres create \
  --name delvemoar-db \
  --region iad \
  --initial-cluster-size 1 \
  --vm-size shared-cpu-1x \
  --volume-size 1

# Attach the cluster -- this sets DATABASE_URL as a Fly secret on the app
fly postgres attach delvemoar-db --app delvemoar-api
```

### Terraform apply

```bash
cd infra/terraform/fly
terraform init
terraform apply
```

This provisions the Fly app record and dedicated IPv4/IPv6 addresses.
Use the output `api_ipv4` and `api_ipv6` values when configuring DNS.

### Vercel project

1. Go to <https://vercel.com/new> and import the GitHub repo.
2. Set **Root Directory** to `apps/web`.
3. Vercel auto-detects Vite; confirm framework is "Vite".
4. Add environment variables (`VITE_API_URL=https://api.delvemoar.com`,
   `VITE_APP_TITLE=DelveMoar`).
5. Deploy. Note the `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` for CI
   if you ever want to trigger Vercel deploys from Actions.

### DNS

| Record | Type | Value |
|---|---|---|
| `delvemoar.com` | A | Vercel's IP (shown in Vercel > Domains) |
| `delvemoar.com` | AAAA | Vercel's IPv6 |
| `www.delvemoar.com` | CNAME | `cname.vercel-dns.com` |
| `api.delvemoar.com` | A | `api_ipv4` from Terraform output |
| `api.delvemoar.com` | AAAA | `api_ipv6` from Terraform output |

Vercel handles the `www` -> apex redirect automatically once both
domains are added to the project.

### GitHub Actions secrets

Add these in **Settings > Environments > production**:

| Secret | Value |
|---|---|
| `FLY_API_TOKEN` | Output of `fly tokens create deploy -a delvemoar-api` |

And in **Settings > Secrets and variables > Actions** (repo-level):

| Secret | Value |
|---|---|
| `TF_TOKEN_app_terraform_io` | Terraform Cloud user token |

## Observability

Quick log and health surfaces:

- **Fly logs**: `fly logs -a delvemoar-api`
- **Fly dashboard**: <https://fly.io/apps/delvemoar-api>
- **Vercel logs**: Vercel dashboard > project > Deployments > Functions
- **Health check**: `curl https://api.delvemoar.com/health`

For error tracking, uptime checks, Postgres metrics, and alerting (Sentry
plus Fly Grafana), and the production secrets that turn them on, see the
[monitoring and alerting runbook](runbooks/monitoring.md).
