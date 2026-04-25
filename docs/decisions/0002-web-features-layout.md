# 0002. Web architecture: bulletproof-react features layout with enforced boundaries

- Status: accepted
- Date: 2026-04-25

## Context

A growing single-page app has a predictable failure mode: cross-cutting
imports build up, two features become coupled by accident, and refactors
to one feature break unrelated parts of the app. By the time the team
notices, the cost of unwinding the coupling is large.

The DelveMoar web app starts small (one feature today, many planned)
and is being built on the assumption that we want to be able to add,
remove, and rework features in isolation. We need a directory shape and
an enforcement mechanism that prevents accidental cross-coupling from
day one.

## Decision

`apps/web/src/` follows a [bulletproof-react](https://github.com/alan2207/bulletproof-react)
features layout. Each feature is a vertical slice that owns its own
components, hooks, and types. Shared code lives in dedicated layers
underneath. Architectural boundaries between layers are enforced by
[`eslint-plugin-boundaries`](https://github.com/javierbrea/eslint-plugin-boundaries)
in `apps/web/eslint.config.js`. Boundary violations fail `pnpm lint`
and CI.

Layer hierarchy (each layer may only import from layers below it):

```
app, pages          # route-level composition
  features          # vertical slices; cross-feature imports blocked
    components
      hooks
        lib, utils, config, types, assets
```

The cross-feature block is the rule that matters most. A file under
`src/features/monsters/` may not import from `src/features/spells/`. If
two features need to share something, it lifts to `components/`,
`hooks/`, or `lib/`.

Files are kebab-case. Folders under `src/**` are kebab-case, with one
exception (`__tests__/`). Test files (`**/*.test.{ts,tsx}`) are exempt
from boundary rules so tests can reach into the code they test.

## Considered alternatives

- **Flat structure** (`components/`, `hooks/`, `pages/` with no
  features layer). Simpler at small scale. Becomes a tangled mess at
  medium scale because shared and feature-specific code mix.
- **Domain-driven slices without ESLint enforcement.** The directory
  layout alone is a convention, not a rule. Conventions decay without
  enforcement. The whole point of choosing this layout is to make
  cross-feature coupling cause a build error, not a code-review
  argument.
- **A heavier framework (Next.js, Remix) that imposes its own layout.**
  Both bring routing, server-side rendering, and a build pipeline that
  the project does not need today. Vite plus React Router plus a
  features layout gives us the same isolation without the framework
  surface area.
- **Module federation or workspaces per feature.** Overkill for a
  single team and a single deployable.

## Consequences

**Easier:**

- New features start in `src/features/<name>/` and stay there until
  something genuinely needs to be shared.
- Refactoring or deleting a feature is a directory-level operation.
  Other features cannot have crept in.
- The decision tree for "where does this code go?" is mechanical, not
  taste-driven. See [the layout doc](../architecture/web-features-layout.md).

**Harder:**

- ESLint configuration in `eslint.config.js` is non-trivial. New layers
  require config changes plus an entry in this ADR's hierarchy.
- The "lift to a shared layer" move sometimes happens prematurely
  because the boundary forces the decision now rather than later. The
  cost is occasional indirection where a direct import would have been
  fine.
- TypeScript path resolution and ESLint's boundary resolution must
  agree. Misalignment between `tsconfig.json` and the ESLint
  `boundaries/elements` patterns produces confusing errors.

**New constraints:**

- New top-level subdirectories under `src/` either fit an existing
  layer or require a config change. They cannot just appear.
- File and folder naming rules are enforced by
  `eslint-plugin-check-file`. Renames have to go through ESLint.
- Tests are exempt from boundary rules. Test code in production builds
  is excluded by Vite, but contributors should not import from
  `src/testing/` outside of tests.

## Links

- Layout doc: [`docs/architecture/web-features-layout.md`](../architecture/web-features-layout.md)
- ESLint config: `apps/web/eslint.config.js` (the source of truth)
- Reference project: [bulletproof-react](https://github.com/alan2207/bulletproof-react)
- Plugin: [`eslint-plugin-boundaries`](https://github.com/javierbrea/eslint-plugin-boundaries)
