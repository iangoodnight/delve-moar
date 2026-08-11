# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Dev image for the web app: the Vite dev server with hot-reload, mirroring
# the API service's --reload posture.
#
# Built from the REPO ROOT (see the web service's build.context in
# infra/docker-compose.yml), not apps/web: the web app is a pnpm workspace
# member, so installing @delve-moar/api-types needs the root lockfile,
# pnpm-workspace.yaml, and packages/.
#
# This is intentionally a dev image. A production/static build (nginx-served,
# runtime-configurable API URL) is tracked separately in #359.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS base

WORKDIR /repo

# pnpm via corepack, pinned by the root package.json "packageManager" field.
RUN corepack enable
ENV CI=1

# ---------------------------------------------------------------------------
# Dependencies — manifests + lockfile only, so this layer rebuilds only when
# the lockfile changes. packages/* is just api-types, so these three manifests
# cover every workspace member and --frozen-lockfile is satisfied.
# ---------------------------------------------------------------------------
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/api-types/package.json packages/api-types/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Source. @delve-moar/api-types is consumed as TypeScript source (its exports
# point at ./src, no build step), so copying packages/ is enough. In compose
# dev mode apps/web/src is volume-mounted over this COPY for hot-reload.
# ---------------------------------------------------------------------------
COPY packages/ packages/
COPY apps/web/ apps/web/

WORKDIR /repo/apps/web
EXPOSE 5173

# Run vite directly (not `pnpm run dev`, which leaks the `--` arg separator
# into vite). --host binds 0.0.0.0 so the server is reachable through the
# mapped port.
CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0"]
