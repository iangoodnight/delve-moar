# Brewfile — install required developer tools with `brew bundle`.
#
# Developer setup (all contributors):
#   brew bundle --file Brewfile
#   task setup:dev
#
# Maintainer setup (adds Fly.io + Terraform):
#   brew bundle --file Brewfile
#   task setup:maintainer

# ── Task runner ───────────────────────────────────────────────────────────────
brew "go-task"

# ── Languages + package managers ─────────────────────────────────────────────
brew "go"
brew "uv"     # Python package manager (replaces pip/venv/pyenv for this project)
brew "pnpm"

# ── Shell tooling ─────────────────────────────────────────────────────────────
brew "shfmt"       # shell formatter (pre-commit + CI)
brew "shellcheck"  # shell linter (pre-commit + CI)

# ── Go tooling ────────────────────────────────────────────────────────────────
brew "golangci-lint"  # Go linter (pre-commit + CI)

# ── Git + GitHub ──────────────────────────────────────────────────────────────
brew "gh"          # GitHub CLI (PR and release workflows)
brew "pre-commit"  # git hook manager

# ── Infrastructure (maintainers) ──────────────────────────────────────────────
tap "superfly/tap"
tap "hashicorp/tap"

brew "superfly/tap/flyctl"       # Fly.io CLI
brew "hashicorp/tap/terraform"   # Terraform IaC
