#!/usr/bin/env bats
#
# Unit tests for scripts/db_backup.sh.
#
# Hermetic: `docker` and `fly` are stubbed onto PATH and log their
# arguments, so nothing touches a real container, Fly, or the network. The
# script is sourced (its dispatch is guarded by BASH_SOURCE == $0) so the
# functions can be exercised directly.

setup() {
  PROJECT_ROOT="$(cd "$(dirname "${BATS_TEST_FILENAME}")/.." && pwd)"
  SCRIPT="${PROJECT_ROOT}/scripts/db_backup.sh"

  STUB_BIN="${BATS_TEST_TMPDIR}/bin"
  mkdir -p "${STUB_BIN}"
  export DOCKER_LOG="${BATS_TEST_TMPDIR}/docker.log"
  export FLY_LOG="${BATS_TEST_TMPDIR}/fly.log"
  : >"${DOCKER_LOG}"
  : >"${FLY_LOG}"

  # `docker inspect` succeeds (so require_container passes) unless a test sets
  # DOCKER_INSPECT_FAIL; every call is logged for assertions.
  cat >"${STUB_BIN}/docker" <<'STUB'
#!/usr/bin/env bash
echo "docker $*" >>"${DOCKER_LOG}"
if [[ "${1:-}" == "inspect" && -n "${DOCKER_INSPECT_FAIL:-}" ]]; then
  exit 1
fi
exit 0
STUB

  # Any `fly` call is logged; the restore path must never reach it.
  cat >"${STUB_BIN}/fly" <<'STUB'
#!/usr/bin/env bash
echo "fly $*" >>"${FLY_LOG}"
exit 0
STUB

  chmod +x "${STUB_BIN}/docker" "${STUB_BIN}/fly"
  PATH="${STUB_BIN}:${PATH}"

  # SCRIPT is resolved at runtime; shellcheck cannot follow it statically.
  # shellcheck disable=SC1090,SC1091
  source "${SCRIPT}"
}

# ── parse_pg_url ─────────────────────────────────────────────────────────────

@test "parse_pg_url strips the scheme and ?query and extracts user/pass/db" {
  run parse_pg_url \
    "postgresql+asyncpg://alice:s3cret@db.example:5432/mydb?sslmode=disable"
  [ "${status}" -eq 0 ]
  [ "${lines[0]}" = "alice" ]
  [ "${lines[1]}" = "s3cret" ]
  [ "${lines[2]}" = "mydb" ]
}

@test "parse_pg_url handles the Fly flycast connection shape" {
  run parse_pg_url \
    "postgres://delvemoar_api:pw123@delvemoar-db.flycast:5432/delvemoar_api"
  [ "${status}" -eq 0 ]
  [ "${lines[0]}" = "delvemoar_api" ]
  [ "${lines[1]}" = "pw123" ]
  [ "${lines[2]}" = "delvemoar_api" ]
}

@test "parse_pg_url works without a query string" {
  run parse_pg_url "postgresql://u:p@host:5432/d"
  [ "${status}" -eq 0 ]
  [ "${lines[0]}" = "u" ]
  [ "${lines[1]}" = "p" ]
  [ "${lines[2]}" = "d" ]
}

# ── dump guards ──────────────────────────────────────────────────────────────

@test "dump refuses when PROD_DATABASE_URL is unset" {
  unset PROD_DATABASE_URL
  run dump
  [ "${status}" -ne 0 ]
  [[ "${output}" == *"PROD_DATABASE_URL is unset"* ]]
  # It must die before opening a proxy.
  [ ! -s "${FLY_LOG}" ]
}

@test "dump fails fast when the local container is not running" {
  export DOCKER_INSPECT_FAIL=1
  export PROD_DATABASE_URL="postgres://u:p@h:5432/d"
  run dump
  [ "${status}" -ne 0 ]
  [[ "${output}" == *"not running"* ]]
}

# ── restore: local-only and arg guards ──────────────────────────────────────

@test "restore requires a dump file argument" {
  run restore
  [ "${status}" -ne 0 ]
  [[ "${output}" == *"usage: db_backup.sh restore"* ]]
}

@test "restore rejects a missing dump file" {
  run restore "${BATS_TEST_TMPDIR}/does-not-exist.dump"
  [ "${status}" -ne 0 ]
  [[ "${output}" == *"dump file not found"* ]]
}

@test "restore only ever targets the local container, never Fly" {
  local dumpfile="${BATS_TEST_TMPDIR}/sample.dump"
  echo "fake dump" >"${dumpfile}"

  run restore "${dumpfile}" my_restore_db
  [ "${status}" -eq 0 ]

  # Both the recreate and the pg_restore run inside the local container.
  grep -q "exec infra-postgres-1 psql" "${DOCKER_LOG}"
  grep -q "pg_restore" "${DOCKER_LOG}"
  grep -q "my_restore_db" "${DOCKER_LOG}"
  # And nothing ever reaches Fly / a remote host.
  [ ! -s "${FLY_LOG}" ]
}
