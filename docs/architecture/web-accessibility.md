# Web accessibility strategy

Accessibility is enforced at four layers: static analysis during authoring,
runtime checks during development, assertions in unit tests, and visual
inspection in Storybook. Each layer catches different classes of issues.

## The four layers

### 1. Static analysis -- eslint-plugin-jsx-a11y

`eslint-plugin-jsx-a11y` runs on every `*.tsx` file at `strict` level. It
flags missing `alt` attributes, invalid `aria-*` usage, inaccessible
interactive elements, and other WCAG violations that can be detected
statically from JSX.

Runs via `pnpm lint` and blocks CI on failure.

### 2. Development runtime -- @axe-core/react

During local development (`import.meta.env.DEV`), axe-core re-scans the
rendered DOM 1 second after each update and logs any violations to the
browser DevTools console. The guard is statically evaluated by Vite so the
axe code is tree-shaken out of production builds entirely.

To use: run `pnpm dev`, open the app in a browser, open DevTools console.
Violations appear as errors with a rule description and affected element.

### 3. Unit tests -- vitest-axe

`vitest-axe` exposes an `axe()` helper that wraps axe-core and a
`toHaveNoViolations()` matcher registered in `src/testing/setup.ts`.

Add an a11y assertion to any component test:

```typescript
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

Runs via `pnpm test` and blocks CI on failure.

### 4. Storybook -- @storybook/addon-a11y

The Storybook a11y addon runs axe-core inside the Storybook preview for
every story and surfaces violations in the Accessibility panel. Use this
for visual and interactive review of design-system components.

Run `pnpm storybook` and click the Accessibility tab on any story.

## Running the checks

| Command | What runs |
|---------|-----------|
| `pnpm lint` | eslint-plugin-jsx-a11y static rules |
| `pnpm test` | vitest-axe assertions |
| `pnpm dev` | @axe-core/react runtime logging (browser console) |
| `pnpm storybook` | @storybook/addon-a11y panel |

## Where the config lives

| File | Role |
|------|------|
| `apps/web/eslint.config.js` | jsx-a11y strict mode |
| `apps/web/src/main.tsx` | @axe-core/react dev-only initialization |
| `apps/web/src/testing/setup.ts` | vitest-axe matcher registration |
| `apps/web/src/testing/axe-matchers.d.ts` | TypeScript types for toHaveNoViolations |
| `apps/web/.storybook/main.ts` | @storybook/addon-a11y addon registration |
