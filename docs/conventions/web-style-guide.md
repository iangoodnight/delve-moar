# Web style guide

Conventions for `apps/web` and any TypeScript package it consumes (TypeScript,
React, CSS). These are the defaults; when a default makes the code worse,
deviate and note why in a comment so the next reader sees it was deliberate.

Most rules here are enforced by ESLint or the TypeScript compiler and cite the
rule inline; the [Enforcement](#enforcement) section maps each one to where it
is caught. Architectural boundaries live in
[web-features-layout.md](../architecture/web-features-layout.md); markdown
conventions in [markdown-style-guide.md](markdown-style-guide.md).

## Functional style

- `const` by default; `let` only for a genuine accumulator; never `var`.
- Prefer pure functions and immutable updates (spread for shallow copies; avoid
  in-place `push`/`splice`/`Object.assign` on shared values).
- Reach for array methods (`map`/`filter`/`reduce`/`flatMap`/`some`/ `every`)
  before loops. `for`/`while` only where the shape genuinely doesn't fit:
  `for await`, generator traversal, or a state machine.
- Don't contort to avoid a `let`. One mutable local in a small helper beats a
  six-line `reduce`.

## Naming

- Files and folders are kebab-case (`check-file`; `__tests__` is the one
  exception). Test files mirror the source: `foo.test.ts` in a sibling
  `__tests__/`.
- Values and functions `camelCase`; types, interfaces, and components
  `PascalCase`; module-scope config constants `UPPER_SNAKE_CASE`.
- Booleans read as predicates: `is`/`has`/`should`/`can` (`isDarkMode`,
  `hasBinding`).
- Event handlers: `handleX` for the implementation, `onX` for the prop
  (`<Button onClick={handleClick}>`).
- Generic type params: `TPascalCase` when descriptive (`TSchema`, `TOutput`); a
  bare letter is fine when there's one obvious param.
- Props types are `<Component>Props`; options bags are `<Function>Options` when
  shared, plain `Options` when local.
- Prefer `T | undefined` over `T | null` for "missing"; reserve `null` for a
  deliberately-empty meaning.
- No hand-written `enum` (`no-restricted-syntax`). Use `as const` for unions and
  lookup tables: no runtime emit, and real string-literal types that line up
  with API data.

  ```ts
  const STATUSES = ["idle", "loading", "error"] as const;
  type Status = (typeof STATUSES)[number];
  ```

- Verb prefixes carry intent: `getX` is a pure read; use `fetchX`/`loadX` for
  anything with a side effect or an await. Avoid vague `doX`/`processX`.

## Types

- `interface` for object shapes (props especially); `type` for unions,
  intersections, mapped/conditional, and utility-wrapped shapes.
- No `any` (`no-explicit-any`). `unknown` when you'll narrow, `never` for the
  unreachable branch.
- `import type` for type-only imports, inlined (`consistent-type-imports`).
- Readonly at the boundaries: wrap component props in `Readonly<>` at the
  destructure site (even when the fields are already `readonly`), mark object
  fields `readonly`, and type array params/returns `readonly T[]` where mutation
  isn't part of the contract. Apply going forward; don't sweep old code just to
  add modifiers.
- With `exactOptionalPropertyTypes`, an optional a caller may set to `undefined`
  is typed `T | undefined`, not bare `T`
  (`features/monsters/api/get-monsters.ts` is the worked example).

### Function signatures

- Two positional args is the sweet spot. Reach for an options object before a
  third: `f(x, { threshold, includeHidden })`.
- A single options object counts as one arg; use it when there's no obvious
  primary input.
- Never a positional boolean: `f(x, true)` is opaque at the call site.
- Past two positionals is fine only when the name binds each slot
  (`clamp(value, min, max)`) or the last arg is genuinely an options bag.

## Comments

Default off. Write one only when the _why_ is non-obvious:

- a hidden constraint (an external system, a race, a runtime quirk);
- an invariant the type system can't express;
- a workaround for an identified bug (link the issue);
- behavior that would surprise a reader who doesn't know the history.

If none apply, the name should carry it. When a comment earns its place, keep it
a short lowercase fragment on one line above the code (`// gates auth`), not a
`/** ... */` wall. Explain why, never what.

- Delete outdated comments on sight; one that contradicts the code is worse than
  none. Fix the code, not the comment.
- No commented-out code; git history is the record.
- `TODO(#123): ...` references an issue. A bare `TODO` isn't allowed.
- JSDoc only where it earns its keep: a one-line summary on a widely imported
  `lib/` export or hook, for IDE hover. The type already carries the arg and
  return info; don't restate it.

## React

- Function declarations at module scope, not arrow consts
  (`no-restricted-syntax`); arrows inside bodies and as handlers are fine (the
  compiler memoizes them).
- Props are `Readonly<...>`-wrapped; children are `Readonly<ReactNode>`.
- Name the gather `...props` when spreading a component's own props onto an
  element; `...rest` everywhere else.
- Reach for the established primitives before a new one: `Column`/`Row` from
  `components/ui/layout`, typography from `components/ui/typography`, Radix
  Themes for the rest (via the `components/ui/*` barrels, not `@radix-ui`
  directly).
- Local-first: a constant, helper, or component starts in its owning feature.
  Lift to `components/ui`, `hooks`, `utils`, or `constants` only on the third
  real cross-feature use, not the first speculative one.

### React Compiler traps

The compiler and StrictMode are on. Three failure modes they introduce:

- react-hook-form `formState` is a render-time proxy; reading `formState.errors`
  in a memoized parent render-prop goes stale and errors never show. Subscribe
  inside the field (`useController`) instead.
- Don't call `setState` synchronously in `useEffect` (flagged as a cascade). To
  sync state to a derived value, use the previous-render compare-and-gate
  pattern; `features/monsters/components/monster-filters.tsx` is the worked
  example.
- Don't reassign a variable declared outside a component or hook from inside
  one. In tests, render an inspector component and assert via `getByTestId`.

## Async & data

- REST goes through TanStack Query (`useQuery`/`useMutation`); a direct `axios`
  call in a component usually means the data layer was skipped.
- Surface state from the hook (`isPending`, `error`, `data`); don't shadow it
  with component state.
- `react-error-boundary` wraps the app (`app/provider.tsx`); boundaries fall
  back to a real UI, not a blank page. Don't `try/catch` for control flow.
- No silent catches: a swallowed error gets logged or surfaces through the
  `lib/notifications` notify seam. Bare `catch {}` is out.
- A floating promise is a lint error (`no-floating-promises`); mark a
  deliberately un-awaited one with `void`
  (`void queryClient.invalidateQueries(...)`).

## Imports

- `simple-import-sort` owns order: externals, then `@/`, then `../`, then `./`,
  auto-fixed on save. Don't reorder by hand.
- `import type`, inlined, for type-only imports.
- Named exports by default. Defaults only where a framework demands one: route
  modules (`lazy()`) and Storybook `meta`.
- A barrel (`index.ts`) exists to serve a real boundary (a feature's public
  surface, a `ui/*` layer), not as a generic shorthand. Deep-import past a
  barrel only to break a cycle.

## CSS & styling

- No inline `style={...}` (CSP). Component-scoped rules go in
  `<component>.module.css`; element and utility defaults in the global
  stylesheet.
- CSS-module class keys are kebab-case, accessed by bracket notation
  (`styles['book-card']`) under `noPropertyAccessFromIndexSignature`.
- Nest state and descendant rules (`&:hover`, `& .child`) inside the block they
  belong to; it reads top-down as one component.
- Reach for a Radix Themes prop before a CSS module
  (`<Grid columns=... gap="3">` ships with the system).
- Override a Radix token by setting the custom property on the wrapper class
  (`.rt-Heading { --font-size-8: ... }`), not on `:root`.
- Use the transition tokens (`--transition-fast`/`-medium`/`-slow`), not ad-hoc
  durations.
- Merge, don't overwrite, an incoming `className`:
  `classNames('h1', className)`.
- Display-only casing goes in CSS (`text-transform: capitalize`), not JSX.

## Values

- No magic numbers: hoist an unexplained literal to a named const at the right
  scope. Exempt: `0`/`1`/`-1` in obvious arithmetic, index and loop bounds,
  one-liner conversions.
- Numeric separators on literals of four or more digits
  (`unicorn/numeric-separators-style`): `1_000`, not `1000`.

## Tests

- Vitest. `foo.test.ts` in a sibling `__tests__/`. Coverage thresholds live in
  `vite.config.ts` (see ADR 0008), not here.
- Every page render and every interactive component gets a `vitest-axe`
  `toHaveNoViolations` check; pure presentational primitives don't need one.
- Mock the network with `axios-mock-adapter` against the real `apiClient` (keeps
  interceptors and `ApiError` wrapping honest); don't
  `vi.mock('@/lib/api-client')`.
- Fresh `QueryClient` per render with `retry: false`, or
  `createTestQueryClient()` from `testing/setup`.
- RTL query by role: `getBy*` when it must exist, `queryBy*` only to assert
  absence, `findBy*` for what appears after load. Prefer
  `getByRole`/`getByLabelText` over `getByTestId`.
- Don't mutate outer-scope variables from a test component (the compiler rule
  holds in tests too); render an inspector and assert via `getByTestId`.

## Storybook

- `<component>.stories.tsx` next to the component. `export default meta`
  (Storybook expects it); named exports for the stories.
- `satisfies Meta<typeof Component>` on the meta so stories get narrow arg
  types.
- Building a shared primitive in Storybook first is encouraged; keep fixtures
  and wrappers colocated with the story.

## Enforcement

Caught before the diff lands:

- **Pre-commit** (lint-staged): Prettier formats; ESLint auto-fixes.
- **tsc** (`tsc -b`) with `strict`, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`,
  `verbatimModuleSyntax`.
- **CI** on every PR: lint (no `--fix`), type-check, tests, coverage.

| Rule                           | Enforced by                        |
| ------------------------------ | ---------------------------------- |
| kebab files and folders        | `check-file`                       |
| import order                   | `simple-import-sort`               |
| `import type`, inlined         | `consistent-type-imports`          |
| module-level function decls    | `no-restricted-syntax`             |
| no `enum`                      | `no-restricted-syntax`             |
| no `any`                       | `no-explicit-any` (strict preset)  |
| floating promises (use `void`) | `no-floating-promises` (strict)    |
| accessibility                  | `jsx-a11y` (strict)                |
| hooks rules, compiler          | `react-hooks`, `react-compiler`    |
| sorted JSX props               | `jsx-sort-props`                   |
| feature boundaries             | `boundaries/dependencies`          |
| Radix/sonner via barrels       | `no-restricted-imports`            |
| numeric separators             | `unicorn/numeric-separators-style` |
| cyclomatic complexity <= 15    | `complexity`                       |

Review-enforced (no rule): boolean/handler/generic naming, reduce-before-
introducing, `Readonly<>` on props, the React Compiler traps, no inline styles.

Planned: RTL query preferences (`eslint-plugin-testing-library`), magic numbers
(`@typescript-eslint/no-magic-numbers`).
