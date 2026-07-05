#!/usr/bin/env bash
# Lint or format only the staged web files pre-commit hands us.
#
# pre-commit runs from the repo root and passes repo-root-relative paths
# (apps/web/src/foo.tsx). The only flat eslint config lives at apps/web, so
# strip the prefix and run the tool from there for correct config + tsconfig
# resolution.
set -euo pipefail

tool="$1"
shift

paths=()
for f in "$@"; do
  paths+=("${f#apps/web/}")
done

cd apps/web

case "$tool" in
  eslint)
    exec pnpm exec eslint --fix --no-warn-ignored "${paths[@]}"
    ;;
  prettier)
    exec pnpm exec prettier --write --ignore-unknown "${paths[@]}"
    ;;
  *)
    echo "precommit-web.sh: unknown tool '${tool}'" >&2
    exit 1
    ;;
esac
