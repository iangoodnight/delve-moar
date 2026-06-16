# Documentation

This directory is the durable, contributor-facing documentation for DelveMoar.
Everything in here is reviewed in pull requests and lives with the code.

For the difference between `docs/` and the local `planning/` workspace, and for
what belongs in the top-level `README.md`, see the
[planning vs docs vs README](#planning-vs-docs-vs-readme) note below.

## Contents

### Architecture

How the system fits together. Read this before making structural changes.

- [Three-app overview](architecture/README.md), how the API, web, and CLI relate
- [OpenAPI pipeline](architecture/openapi-pipeline.md), the shared contract and codegen flow
- [Web features layout](architecture/web-features-layout.md), bulletproof-react boundaries enforced by ESLint
- [Web accessibility strategy](architecture/web-accessibility.md), the four-layer a11y approach

### Recipes

Walkthroughs for common contributor tasks.

- [Local development](recipes/local-development.md), commands and gotchas (reference style)
- [Adding a new endpoint](recipes/adding-a-new-endpoint.md), end-to-end walkthrough (tutorial style)
- [Deployment runbook](deploy.md), release ritual, rollback, and first-time infrastructure setup

### Runbooks

Operational procedures for production.

- [Postgres backup and restore](runbooks/postgres-backup-restore.md), backup mechanisms, RPO/RTO, and the tested restore procedure

### Decisions

- [Architecture Decision Records](decisions/README.md), the durable
  record of why the project is shaped the way it is

### Roadmap

- [Roadmap](roadmap.md), what is shipping by phase

### Reference

- [Glossary](glossary.md), D&D terms and project terms

## Planning vs docs vs README

Three places hold project knowledge. Each has a job:

- **`README.md`** at the repo root, the front door. Quick start, project
  description, links into `docs/`. The audience is anyone landing on the
  GitHub page for the first time.
- **`docs/`** (this directory), depth. Architecture, recipes, glossary,
  decisions. Reviewed and versioned. The audience is contributors who have
  decided to dig in.
- **`planning/`** (gitignored, local-only), working memory. Roadmap notes,
  open questions, session logs. Not reviewed, not shared. The audience is
  whoever is actively driving the project, including LLM sessions.

Anything in `planning/` that becomes settled should graduate to either
`docs/` or `README.md`. The goal is for `planning/` to stay small.

Diagrams in this directory use [Mermaid](https://mermaid.js.org/), which
renders natively on GitHub.
