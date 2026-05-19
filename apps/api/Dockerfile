# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Base: official uv image with Python 3.12
# ---------------------------------------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base

WORKDIR /app

# Compile .pyc files at install time (faster container startup)
# copy mode: don't use hardlinks into the uv cache
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# ---------------------------------------------------------------------------
# Dependencies — separate layer so it only rebuilds when lockfile changes
# ---------------------------------------------------------------------------
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-dev --no-install-project

# ---------------------------------------------------------------------------
# Application source
# ---------------------------------------------------------------------------
# pyproject.toml is read by config.py to seed the default version string.
# The VERSION env var (set by docker-compose) takes precedence at runtime.
COPY pyproject.toml ./
COPY app/ ./app/

# alembic.ini + alembic/ are required so the CD workflow can run
# `uv run alembic upgrade head` against production from this same image.
COPY alembic.ini ./
COPY alembic/ ./alembic/

EXPOSE 8000

# In docker-compose dev mode the app/ directory is volume-mounted over this
# COPY, giving hot-reload without rebuilding the image.
CMD ["uv", "run", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", "--port", "8000"]
