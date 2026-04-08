#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# gen_types.sh — OpenAPI type generation pipeline
#
# Spins up the FastAPI dev server, fetches /openapi.json, and generates:
#   • TypeScript types  → packages/api-types/src/index.ts    (openapi-typescript)
#   • Go HTTP client    → apps/cli/internal/apiclient/client.gen.go (oapi-codegen)
#
# Prerequisites:
#   uv           python package manager  https://docs.astral.sh/uv/
#   pnpm         node package manager    https://pnpm.io/
#   oapi-codegen go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest
#
# Run from repo root:
#   bash scripts/gen_types.sh
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

API_PORT=8000
API_URL="http://localhost:${API_PORT}"
API_PID=""

# Always stop the background server on exit, even if the script fails.
cleanup() {
  if [[ -n "${API_PID}" ]]; then
    echo "→ Stopping API server (PID ${API_PID})..."
    kill "${API_PID}" 2>/dev/null || true
    wait "${API_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ── 1. Start the API server in the background ─────────────────────────────
echo "→ Starting API server on port ${API_PORT}..."
(cd "${REPO_ROOT}/apps/api" && exec uv run uvicorn app.main:app \
  --port "${API_PORT}" \
  --log-level warning) &
API_PID=$!

# ── 2. Wait for the health endpoint to respond ────────────────────────────
echo "→ Waiting for API to become healthy..."
MAX_ATTEMPTS=30
attempt=0
until curl -sf "${API_URL}/health" > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [[ ${attempt} -ge ${MAX_ATTEMPTS} ]]; then
    echo "✗ API did not start after ${MAX_ATTEMPTS}s — check apps/api for errors." >&2
    exit 1
  fi
  sleep 1
done
echo "✓ API is healthy."

# ── 3. Generate TypeScript types for apps/web ─────────────────────────────
echo "→ Generating TypeScript types → packages/api-types/src/index.ts"
pnpm dlx openapi-typescript "${API_URL}/openapi.json" \
  --output "${REPO_ROOT}/packages/api-types/src/index.ts"
echo "✓ TypeScript types generated."

# ── 4. Generate Go HTTP client for apps/cli ───────────────────────────────
echo "→ Generating Go API client → apps/cli/internal/apiclient/client.gen.go"
(cd "${REPO_ROOT}/apps/cli" && oapi-codegen \
  -config .oapi-codegen.yaml \
  "${API_URL}/openapi.json")
echo "✓ Go client generated."

echo ""
echo "All done. Review then commit the generated files:"
echo "  packages/api-types/src/index.ts"
echo "  apps/cli/internal/apiclient/client.gen.go"
