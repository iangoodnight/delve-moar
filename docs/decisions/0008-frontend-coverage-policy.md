# 0008. Front-end coverage policy under React Compiler

- Status: proposed
- Date: 2026-05-04

## Context

The web app uses [React Compiler](https://react.dev/learn/react-compiler) via
`@vitejs/plugin-react` (with `reactCompilerPreset`). The compiler transforms
every component function into a memoized form that caches props destructure,
intermediate function calls, and the final JSX element behind a per-component
`useMemoCache` array. Each cached value gets an `if ($[N] !== ...) { compute }
else { return cache }` block.

While building out unit tests on issue #45's branch, this surfaced as a hard
ceiling on coverage for thin pass-through wrappers. A typical wrapper:

```tsx
export function H1({ className, ...rest }: HeadingProps) {
  return (
    <Heading
      as="h1"
      className={classNames('h1', className)}
      {...rest}
    />
  );
}
```

After the compiler runs, this five-line function becomes ~30 lines with four
`if/else` blocks. The `else` branches (cache-hit paths) only fire when
inputs are reference-stable across renders. React's reconciler creates fresh
prop objects on every render, so cache-miss fires every time and the
cache-hit arms are unreachable from outside the component.

We measured this empirically. With three tests per wrapper (renders correctly,
accepts className, passes through props), `H1`-`H4` and `Paragraph` plateaued
at:

- statements: ~72-75%
- branches: 50%
- functions: 100%
- lines: 100%

Adding a fourth test that does `rerender(stableElement)` did not move the
needle: even a stable JSX element reference produces a new internal props
object inside React, so the cache misses again.

We also tried `'use no memo'` directives on the wrappers. The
`react-compiler/react-compiler` ESLint rule flags those as "Unused 'use no
memo' directive", contradicting the compiled output (which clearly shows the
function is being memoized). Living with the lint warning would mean a
file-level disable comment per wrapper.

The math for components with real logic is more forgiving. The compiler's
memoization scaffolding adds a roughly fixed cost (one cache-miss/hit pair
plus the per-expression caches) regardless of how many real branches the
source has. A component with 5 source-level branches lands near 92%; 10
branches lands near 95%; 20 near 98%. The asymptote is 100% but never
reaches it.

`reactCompilerPreset` is a load-bearing perf feature — opting out across the
board for coverage's sake would forfeit the memoization benefits the
compiler exists to provide.

## Decision

**Accept the React Compiler ceiling. Set thresholds that reflect the
achievable maximum, not 100%. Exclude pass-through Radix wrappers from
coverage measurement entirely.**

### Coverage thresholds

In `apps/web/vite.config.ts` (`test.coverage.thresholds`):

```ts
thresholds: {
  statements: 90,
  branches: 80,
  functions: 95,
  lines: 95,
}
```

These are calibrated to the compiler's structural overhead on a
mid-sized component. A meaningful coverage gap (a forgotten error path,
an untested branch, a useEffect with no test) drops below the threshold;
compiler scaffolding alone does not.

### Exclusions

`coverage.exclude` adds patterns for:

- `src/components/ui/typography/*.tsx` — H1-H4, Paragraph, Label
- `src/components/ui/layout/*.tsx` — Row, Column

Direct re-exports (Radix's `Heading`, `Text`, `Em`, `Container`, etc.) live
in barrel files (`*/index.ts`), already excluded by the existing
`**/index.ts` rule.

The exclude list is tight. It is for components that meet **all** of:

1. The function body is one return statement that spreads props onto a
   third-party primitive.
2. There is no conditional rendering, no derived state, no event handlers,
   no useEffect.
3. The only "logic" is className merging (covered separately by
   `class-names.test.ts`).

The moment a wrapper grows logic — a conditional class, a child guard, a
new effect — it graduates out of the exclude list and gets tests like any
other component.

### What we test on excluded wrappers

Nothing through the unit test runner. Behavior verification for these
wrappers happens through:

- Storybook stories under `Components/Typography/Showcase` (visual
  regression candidate when we add Chromatic or similar).
- Storybook addon-a11y axe runs on every story.
- Indirect coverage from any feature test that renders a page using them.

`classNames` itself is unit-tested at
`src/utils/style/__tests__/class-names.test.ts` with full coverage of the
string / array / object / falsy paths.

## Considered alternatives

- **Per-file threshold overrides.** `vite.config.ts` supports
  `thresholds[<glob>]: { statements: 72, branches: 50, ... }` per file.
  Rejected: doesn't scale. Every new wrapper would need an override, and
  the numbers drift as the compiler version changes.
- **`'use no memo'` directives on wrappers.** Opts the wrapper out of
  React Compiler so source-level coverage applies. Rejected: the
  `react-compiler/react-compiler` lint rule incorrectly flags the directive
  as unused, requiring a `// eslint-disable-next-line` per wrapper. The
  noise-to-signal ratio is wrong, and we'd be lying to the linter that the
  wrappers aren't being memoized when they are.
- **Force cache-hit branches in tests** with stable props or memoized
  parents. Rejected: brittle and non-meaningful. The cache-hit arm
  exercises framework bookkeeping, not user-visible behavior, and even
  with a stable JSX element React's internals create fresh props on each
  render.
- **`/* v8 ignore start ... stop */` blocks** around wrapper bodies.
  Rejected: the v8 ignore range is too coarse — it skips coverage for
  every statement in the block, including the source statements we'd want
  to verify in a non-compiled world. It treats the symptom (low percent)
  not the cause (compiler-injected dead branches).
- **Aspirational 100% coverage targets, no exclusions.** Rejected:
  structurally unreachable on any compiler-transformed component.
  Generates constant false alarms that desensitize reviewers to genuine
  drops.
- **Disable React Compiler globally.** Rejected: the compiler's
  memoization is a meaningful perf benefit, and the alternative (manual
  `useMemo` / `useCallback`) has its own cost. Coverage tooling should
  conform to the runtime, not the other way around.
- **Switch from v8 coverage to Istanbul.** Istanbul has different but
  comparable issues with compiled output. Different numbers, same
  fundamental problem. v8 is also faster.

## Consequences

**Easier:**

- New pass-through wrappers can ship without coverage gymnastics: add the
  file to `coverage.exclude` if it qualifies, and document why in the
  PR description (link to this ADR).
- Real components retain meaningful coverage targets. Drops below the
  threshold signal real gaps, not compiler scaffolding.
- CI failure modes are predictable. Reviewers don't have to mentally
  subtract the compiler's overhead when reading a coverage report.
- Honest thresholds. We don't pretend 100% coverage is achievable when it
  isn't.

**Harder:**

- A new contributor seeing "70% statements" on a wrapper test report may
  worry they undertested. The Components/Typography overview MDX and this
  ADR explain why; CONTRIBUTING.md should link to this ADR alongside the
  test guidance.
- The `coverage.exclude` list is honor-system. Nothing prevents a
  contributor from excluding a real component to dodge coverage
  requirements. Code review must catch this; the qualifying criteria
  above are the test.
- If we ever swap React Compiler off (or upgrade to a version with
  significantly different scaffolding overhead), the thresholds are
  artificially low and the exclude list might no longer be necessary.
  Revisit at that point — likely a superseding ADR.

**New constraints:**

- A wrapper is only allowed in `coverage.exclude` if it is genuinely a
  pass-through. Logic graduates it out. Code review enforces this
  per-PR.
- Direct library re-exports stay in barrel files. Coverage tooling already
  excludes `**/index.ts`; that exclusion is now load-bearing.
- New tests for non-wrapper components target the four-figure threshold
  (statements 90, branches 80, functions 95, lines 95). Tests don't need
  to chase 100%; meaningful coverage of source-level branches is the bar.
- The thresholds are project-wide, not per-feature. A feature with a
  particularly wrapper-heavy module pulls down the global numbers; the
  exclude list is the escape valve, not threshold relaxation.

## Links

- `apps/web/vite.config.ts` (the coverage config and exclude list)
- `apps/web/src/components/ui/typography/` (the original case study)
- `apps/web/src/utils/style/class-names.ts` and its
  [tests](../../apps/web/src/utils/style/__tests__/class-names.test.ts)
  (the one place the className-merge logic is unit-tested)
- ADR [0002](0002-web-features-layout.md) (the architectural model these
  wrappers compose into)
- ADR [0007](0007-web-typography-system.md) (the typography wrappers that
  were the immediate motivator)
- [React Compiler documentation](https://react.dev/learn/react-compiler)
- [Vitest coverage documentation](https://vitest.dev/guide/coverage)
- Issue #45 (the branch where this came to a head)
