# Glossary

DelveMoar mixes D&D terminology with software conventions specific to this
repo. This page disambiguates both.

## D&D terms

### CR (Challenge Rating)

A 5e number describing how dangerous a monster is to a balanced party of
four adventurers of a given level. CR 1/4 is a goblin; CR 24 is an
ancient red dragon. Used by the (future) encounter builder to compute
XP budgets.

### DM (Dungeon Master)

The player who runs the game. The primary user of DelveMoar. Sometimes
called a GM (game master) in non-D&D systems.

### Encounter

A single combat or social engagement during a session. The (future)
encounter builder lets a DM assemble monsters from the catalog plus
homebrew, weighted against party level.

### Homebrew

Custom content created by a DM, as opposed to material published in
official sourcebooks. DelveMoar's product thesis is "homebrew-first":
authoring custom monsters, spells, and items is a first-class workflow,
not an afterthought to consuming SRD content.

### NPC (Non-Player Character)

Any character in the game world that is not controlled by a player. May
or may not have a statblock. Not yet modeled in DelveMoar.

### OGL (Open Game License) and ORC (Open RPG Creative)

Two licensing frameworks under which D&D-adjacent content has been
published. DelveMoar seeds from the
[5e SRD](https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf)
under CC-BY-4.0. We do not redistribute non-SRD content.

### Session

One sitting at the table (real or virtual), typically a few hours.
Distinct from a software session (a user being logged in), which
DelveMoar now supports.

### SRD (Systems Reference Document)

The subset of D&D rules and content released under an open license. The
5e SRD covers a baseline of monsters, spells, items, classes, and rules.
DelveMoar's catalog is seeded entirely from the SRD.

### Statblock

The structured representation of a monster: name, size, type, AC, HP, saves,
skills, abilities, actions, and so on. The web app's monster detail page is
a rendered statblock.

### TTRPG (Tabletop Role-Playing Game)

The genre. D&D 5e is the system DelveMoar targets first.

### TUI (Text User Interface)

A terminal application with structured screens, as opposed to a CLI that
prints lines. The `dm tui` subcommand uses
[Bubble Tea](https://github.com/charmbracelet/bubbletea) to provide one.

### VTT (Virtual Tabletop)

Software that simulates the physical D&D table (maps, tokens, dice).
Examples: Roll20, Foundry. DelveMoar is not a VTT. It is a content and
encounter authoring tool that complements one.

## Project terms

### area label

GitHub label that scopes an issue or PR to part of the codebase.
Conventional values: `area:web`, `area:api`, `area:cli`, `area:data`,
`area:infra`, `area:chore`, `area:docs`. Used for triage and CODEOWNERS
context.

### bulletproof-react features layout

The directory shape used by `apps/web/src/`, named after the
[bulletproof-react](https://github.com/alan2207/bulletproof-react) reference
project. Layered: app, pages, features, components, hooks, lib, utils,
config, types, assets. Cross-feature imports are blocked. See
[architecture/web-features-layout.md](architecture/web-features-layout.md).

### campaign

The container for a DM's homebrew content. Anchors multi-tenancy: a DM's
homebrew monsters and spells live inside a campaign. The `campaigns`
table exists from Phase 0 but is not yet surfaced in the UI; campaigns
are still to come.

### catalog

The user-visible browse-and-search surface for SRD content (and, later,
homebrew). The catalog covers monsters, spells, and items.

### codegen / generated client

Code emitted by `scripts/gen_types.sh`:
`packages/api-types/src/index.ts` (TypeScript) and
`apps/cli/internal/apiclient/client.gen.go` (Go). Never hand-edited.
See [architecture/openapi-pipeline.md](architecture/openapi-pipeline.md).

### feature (web sense)

A vertical slice of the web app under `apps/web/src/features/<name>/`.
Self-contained: its own components, hooks, types, and stories. May not
import from sibling features. Today the only feature is `design-system`.

### gen:types

The Task command (`task gen:types`) that runs `scripts/gen_types.sh`.
Regenerates the TypeScript and Go clients from the live OpenAPI schema.

### milestone

GitHub milestone, used for grouping issues that ship together. Phase
milestones (e.g. "Phase 1a, SRD Catalog") group product work; horizontal
milestones (e.g. "Documentation and Contributor Experience") group
cross-cutting work.

### monorepo root

The top of the repo (`/`). Holds Taskfile, root-level configs (commitlint,
pre-commit, prettier, tsconfig.base.json), and per-area subdirectories
(`apps/`, `packages/`, `infra/`, `scripts/`, `docs/`, `planning/`).

### phase

A coarse-grained slice of the roadmap. Phase 0 (foundation, done), Phase
1a (read-only SRD catalog, shipped), Phase 1b (accounts, content
collections, and homebrew, in progress). Phases own milestones;
milestones own issues.

### planning workspace

The local-only `planning/` directory. Holds working memory: roadmap notes,
open questions, session logs. Gitignored. See [README.md](README.md) in
this directory for the docs/planning/README split.

### SRD seed

The seeding scripts under `apps/api/scripts/seed_srd.py`. Pulls from
[dnd5eapi.co](https://www.dnd5eapi.co) and writes into the local DB.
Run via `task seed:srd` and friends.
