# Postgres backup and restore runbook

How production Postgres is backed up, and the tested procedure for restoring it.
Phase 1b puts user-owned data (accounts, sessions, homebrew) into the cluster;
until then the only recovery path was re-running the SRD seed. Once real user
data exists, lost data is unrecoverable without a working restore. This runbook
exists so that recovery needs no tribal knowledge.

Production Postgres is a single-node **legacy Fly Postgres** cluster
(`delvemoar-db`, region `iad`, one 1 GB encrypted volume), created with
`fly postgres create` and deliberately kept out of Terraform (see
[`infra/terraform/fly/main.tf`](../../infra/terraform/fly/main.tf)).

The `fly` commands in this runbook assume an authenticated session in the
project's Fly organization; without it they cannot reach the cluster. Where a
command needs the volume ID (shown below as `<vol_id>`), get the current value
from `fly volumes list -a delvemoar-db`.

## What we rely on

Two mechanisms, in order of how recovery actually happens:

1. **Fly automatic daily volume snapshots** (primary). Fly snapshots the
   cluster's volume once a day, block-level, encrypted, retained for 5 days,
   stored in the same region. This runs with no setup and no cost. List them
   with:

   ```sh
   fly volumes snapshots list <vol_id>
   ```

   This is the default recovery source for an unplanned loss.

2. **On-demand logical `pg_dump`** (`task db:dump`). A point-in-time logical
   backup taken by hand, for example immediately before a risky migration, or to
   seed a local copy of prod for debugging. Finer-grained than the daily
   snapshot and platform-agnostic (it is a standard `pg_dump`, restorable
   anywhere, which also serves the self-hoster).

Not yet in place, tracked as follow-ups:

- Continuous WAL archiving / point-in-time recovery. The Fly Postgres image
  bundles Barman, but PITR is not configured. Without it, the worst-case
  unplanned data loss is one snapshot interval (see RPO).
- Scheduled off-Fly backups (e.g. a cron or CI job pushing dumps to object
  storage). On-demand `task db:dump` is the manual stand-in until then.

## RPO / RTO

Rough expectations at current scale (the prod logical dump is well under 1 MB,
SRD-only at the time of writing):

|                           | Daily snapshot                                                    | Pre-change `task db:dump`                  |
| ------------------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| **RPO** (max data loss)   | up to ~24h                                                        | ~0 for the planned change                  |
| **RTO** (time to restore) | ~10-20 min (provision a new cluster, verify, re-attach, redeploy) | seconds to a few minutes (logical restore) |

The snapshot RTO is an estimate, not yet timed end-to-end against a real Fly
cluster. The logical-restore RTO is measured (see the drill log below). Both
grow with data volume; revisit these numbers once real user data accumulates.

## On-demand logical backup

`task db:dump` tunnels to prod through `fly proxy` and runs `pg_dump` inside the
local `postgres:17` container (the host has no `pg_dump`; a PG 17 client safely
dumps the older prod server). Output is a custom-format dump written to the
gitignored `backups/` directory.

Prerequisites: the local Postgres container running (`task db:up`), `fly`
authenticated, and the prod connection string exported. Read it in your own
shell and do not paste the value anywhere:

```sh
export PROD_DATABASE_URL=$(fly ssh console -a delvemoar-api -C 'printenv DATABASE_URL')
task db:dump
```

> The API machine auto-stops when idle and `fly ssh` will not wake it. If you
> see "app delvemoar-api has no started VMs", hit the health endpoint first:
> `curl https://api.delvemoar.com/health`, then retry.

**The dump contains live data.** Once auth ships it includes the `users`,
`sessions`, and `email_tokens` tables: argon2id password hashes and email
addresses. The `backups/` directory is gitignored; never commit a dump, and
delete local copies when you are done.

## Recovery procedures

### A. Logical restore into a local database (drilled)

This is the verified path, used for the restore drill and for pulling a copy of
prod down for inspection. It only ever targets the local container, so it cannot
touch prod.

```sh
task db:restore -- ./backups/delvemoar-db-<timestamp>.dump delve_moar_restore
```

The script drops and recreates the named local database (`delve_moar_restore` by
default, leaving the `delve_moar` dev DB alone), then `pg_restore`s into it.
Verify:

```sh
docker exec infra-postgres-1 psql -U dm -d delve_moar_restore -c '\dt'
docker exec infra-postgres-1 psql -U dm -d delve_moar_restore \
  -tAc "select version_num from alembic_version;"
```

Drop the throwaway database when finished:

```sh
docker exec infra-postgres-1 psql -U dm -d postgres \
  -c "DROP DATABASE IF EXISTS delve_moar_restore WITH (FORCE);"
```

### B. Restore a Fly volume snapshot into a new cluster

For recovering production from a daily snapshot. This provisions a **new**
cluster from the snapshot and never mutates the live one, so it is safe to run
and inspect before any cutover.

```sh
# 1. Pick a snapshot.
fly volumes snapshots list <vol_id>

# 2. Create a new cluster seeded from it.
fly postgres create \
  --name delvemoar-db-restore \
  --region iad \
  --snapshot-id <vs_...> \
  --vm-size shared-cpu-1x \
  --volume-size 1

# 3. Connect and verify the data is intact.
fly postgres connect -a delvemoar-db-restore
```

Cutover options, in increasing order of disruption:

- **Copy data forward**: dump the restored cluster and load only the needed rows
  back into the live cluster (`fly postgres import`, or a logical
  `pg_dump`/`pg_restore`). Preferred when the live cluster is otherwise healthy.
- **Promote the restored cluster**: detach the API from the old cluster and
  `fly postgres attach delvemoar-db-restore --app delvemoar-api`, which rewrites
  `DATABASE_URL`. Then redeploy the API. Use when the live cluster is
  unrecoverable.

Tear the restore cluster down when done
(`fly apps destroy delvemoar-db-restore`) so it stops incurring cost.

### C. Restore a logical dump back into production (disaster)

Last resort, when prod data must be rebuilt from a `task db:dump` artifact. Open
a proxy to the live cluster and `pg_restore` over it. This **overwrites** data,
so confirm the target twice and prefer a fresh database or a maintenance window.

```sh
fly proxy 5433:5432 -a delvemoar-db
# In another shell, restore with a PG 17 client against 127.0.0.1:5433
# (drop/recreate or --clean as appropriate for the situation).
```

## Before a risky migration

The first auth migrations (004-006) and any later destructive change will reach
prod through the release pipeline. Before merging a Release PR that runs such a
migration, take a logical backup so the RPO for the planned change is ~0:

```sh
export PROD_DATABASE_URL=$(fly ssh console -a delvemoar-api -C 'printenv DATABASE_URL')
task db:dump
```

Keep the dump until the deploy has been verified healthy, then delete it. This
step is referenced from the release checklist in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md).

## Drill log

- **2026-06-16** — Logical backup + restore drilled end-to-end. `task db:dump`
  produced a 404 KB custom-format dump of prod (then at Alembic `003`,
  SRD-only); `task db:restore` loaded it into a local throwaway database.
  Verified: all five tables present and row counts matched the SRD seed exactly
  (334 monsters, 319 spells, 599 items), `alembic_version` intact. Dump and
  restore each completed in seconds. The snapshot-to-new-cluster path (procedure
  B) is documented from verified `flyctl` flags but has not been executed
  against a live cluster; timing its RTO is a follow-up.
