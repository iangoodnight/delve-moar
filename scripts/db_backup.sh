#!/usr/bin/env bash
# Logical backup/restore helpers for the production Postgres cluster.
#
# pg_dump/pg_restore are not on the host PATH; both subcommands run them
# inside the local postgres:17 container (PG client >= prod server). The
# dump tunnels to prod through `fly proxy`; the restore only ever targets
# the LOCAL container, so a fat-fingered restore can never reach prod.
#
# See docs/runbooks/postgres-backup-restore.md for the full procedure.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PG_CONTAINER="${PG_CONTAINER:-infra-postgres-1}"
PROXY_PORT="${PROXY_PORT:-5433}"
FLY_PG_APP="${FLY_PG_APP:-delvemoar-db}"
BACKUP_DIR="${REPO_ROOT}/backups"

die() {
  echo "✗ $*" >&2
  exit 1
}

require_container() {
  docker inspect "${PG_CONTAINER}" >/dev/null 2>&1 \
    || die "container '${PG_CONTAINER}' not running. Start it with 'task db:up'."
}

# Wait for fly proxy to start accepting connections on the local port.
wait_for_port() {
  local attempt=0
  until (echo >"/dev/tcp/127.0.0.1/${PROXY_PORT}") 2>/dev/null; do
    attempt=$((attempt + 1))
    [[ ${attempt} -ge 30 ]] && die "fly proxy never opened port ${PROXY_PORT}."
    sleep 1
  done
}

# Print a Postgres URL's user, password, and database on three lines. Strips
# the scheme and any ?query (the proxy is plaintext). No external commands, so
# it stays unit-testable (test/db_backup.bats).
parse_pg_url() {
  local raw="$1"
  local url="${raw%%\?*}"
  local creds_host="${url#*://}"
  local creds="${creds_host%%@*}"
  printf '%s\n%s\n%s\n' "${creds%%:*}" "${creds#*:}" "${creds_host##*/}"
}

dump() {
  require_container
  [[ -n "${PROD_DATABASE_URL:-}" ]] || die \
    "PROD_DATABASE_URL is unset. In your own shell, run (do not paste the value anywhere):
    export PROD_DATABASE_URL=\$(fly ssh console -a delvemoar-api -C 'printenv DATABASE_URL')"

  local user pass db
  {
    read -r user
    read -r pass
    read -r db
  } < <(parse_pg_url "${PROD_DATABASE_URL}")

  mkdir -p "${BACKUP_DIR}"
  local stamp
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  local out="${BACKUP_DIR}/${FLY_PG_APP}-${stamp}.dump"

  echo "→ Opening fly proxy ${PROXY_PORT} -> ${FLY_PG_APP}:5432..."
  fly proxy "${PROXY_PORT}:5432" -a "${FLY_PG_APP}" >/dev/null 2>&1 &
  local proxy_pid=$!
  # shellcheck disable=SC2064
  trap "kill ${proxy_pid} 2>/dev/null || true" EXIT
  wait_for_port

  echo "→ Dumping '${db}' as '${user}' -> ${out}"
  docker exec -e PGPASSWORD="${pass}" "${PG_CONTAINER}" \
    pg_dump -Fc --no-owner --no-privileges \
    -h host.docker.internal -p "${PROXY_PORT}" \
    -U "${user}" -d "${db}" >"${out}"

  echo "✓ Backup written: ${out} ($(du -h "${out}" | cut -f1))"
}

restore() {
  require_container
  local dumpfile="${1:-}"
  local target="${2:-delve_moar_restore}"
  [[ -n "${dumpfile}" ]] || die "usage: db_backup.sh restore <dumpfile> [target_db]"
  [[ -f "${dumpfile}" ]] || die "dump file not found: ${dumpfile}"

  echo "→ Recreating local database '${target}' in '${PG_CONTAINER}'..."
  docker exec "${PG_CONTAINER}" psql -U dm -d postgres -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS ${target} WITH (FORCE);" \
    -c "CREATE DATABASE ${target} OWNER dm;"

  echo "→ Restoring ${dumpfile} -> ${target}..."
  docker exec -i "${PG_CONTAINER}" \
    pg_restore --no-owner --no-privileges --exit-on-error \
    -U dm -d "${target}" <"${dumpfile}"

  echo "✓ Restored into local '${target}'. Verify with:"
  echo "    docker exec ${PG_CONTAINER} psql -U dm -d ${target} -c '\\dt'"
}

main() {
  local cmd="${1:-}"
  shift || true
  case "${cmd}" in
    dump) dump "$@" ;;
    restore) restore "$@" ;;
    *) die "usage: db_backup.sh {dump|restore} [args]" ;;
  esac
}

# Only dispatch when executed directly, so tests can source this file and
# exercise the functions in isolation (test/db_backup.bats).
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
