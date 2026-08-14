# 0007. Web typography system: token layering, scoped Radix overrides, design-system contract

- Status: proposed
- Date: 2026-05-04

## Context

ADR [0002](0002-web-features-layout.md) settled the web app's architectural
shape (bulletproof-react features layout with enforced boundaries). Issue #88
landed the typography foundation in Phase 0: four-role type system (brand,
heading, body, mono), self-hosted via `@fontsource`, fonts loaded conditionally
based on `VITE_APP_FONT_SOURCE`. ADR 0002 deferred the component-level shape of
typography, and #88 deliberately stopped at tokens plus a design-system
specimen.

While building out issue #45 (navigation shell and route scaffolding), three
problems surfaced when the typography wrappers under
`src/components/ui/typography/` collided with the design-system stories under
`src/features/design-system/stories/typography/`:

1. **The design doc and the wrappers had drifted.** The H1-H4 wrappers were
   passing Radix size tokens (`size="8"`, `"4"`, `"3"`, `"2"`) that resolved to
   35/18/16/14px. The design-system stories specified 48/36/28/22px. The H1 was
   undersized for a primary heading and H2/H3/H4 collapsed into body-text size,
   breaking visual hierarchy.

2. **Radix Themes scopes its typography tokens to `.radix-themes`, not
   `:root`.** Naively overriding `--default-font-family`,
   `--heading-font-family`, `--font-size-N`, etc. on `:root` did not reach
   inside `<Theme>` because `.radix-themes` is a closer ancestor in the
   inheritance chain. Every text node inside the theme inherited Radix's
   system-font stack.

3. **CSS source order was load-bearing.** Class selectors like `.h1` and Radix's
   `.rt-Heading:where(.rt-r-size-8)` are both 0-1-0 specificity, so whichever
   stylesheet loaded later won. Vite's CSS extraction does not reliably preserve
   the order of static and dynamic imports across builds, so any approach that
   depended on "our CSS comes after Radix" was brittle.

We also added a CSP requirement (no inline `style={...}` in component code)
during the same arc, eliminating inline-style-based fixes.

## Decision

**Layered token definitions, scoped Radix overrides, compound-selector component
rules. A single `index.css` aggregator imports everything in a fixed order.
Design-system specimens consume the actual components.**

### Stylesheet structure

```
src/styles/
├── index.css              ← aggregator, the only file imported by main.tsx and preview.tsx
├── reset.css              ← Josh Comeau-style reset
├── base.css               ← html { font-size: 62.5% }  (1rem = 10px convention)
├── tokens.css             ← project tokens on :root
├── typography.css         ← element + utility class defaults (h1 / .h1, p / .paragraph, etc.)
├── radix-overrides.css    ← .radix-themes token overrides + .rt-Heading.hN compound rules
├── fonts.local.css        ← @fontsource imports (default)
└── fonts.google.css       ← Google Fonts CDN imports (opt-in)
```

`index.css` orders the imports `reset` -> `base` -> `tokens` -> `typography` ->
`radix-overrides`. `main.tsx` and `.storybook/preview.tsx` each do a single
`import '@/styles/index.css'`. The font CSS still loads asynchronously based on
`env.FONT_SOURCE`.

### Token layering

- **`:root`** holds project tokens that are not shared with Radix:
  `--font-brand`, `--font-heading`, `--font-body`, `--font-mono`,
  `--line-height-body`, `--line-height-heading`, `--line-height-mono`. These are
  app-wide vocabulary.

- **`.radix-themes`** (in `radix-overrides.css`) overrides Radix's own aliases
  so they read from project tokens: `--default-font-family: var(--font-body)`,
  `--heading-font-family: var(--font-heading)`,
  `--code-font-family: var(--font-mono)`, etc. Setting these on `.radix-themes`
  itself, not `:root`, is what makes them propagate inside the theme — direct
  application beats inheritance from a more distant ancestor.

- The heading scale (`--heading-size-h1`..`-h4`) is also defined on
  `.radix-themes` with `calc(48px * var(--scaling))` form so it picks up any
  future `<Theme scaling="...">` change.

### Component-level overrides

Compound selectors (`.rt-Heading.h1`, `.rt-Text.paragraph`) achieve 0-2-0
specificity, beating Radix's `.rt-Heading:where(.rt-r-size-N)` (0-1-0 because
`:where()` contributes zero) regardless of source order:

```css
.rt-Heading.h1 {
  font-size: var(--heading-size-h1);
  font-weight: 700;
  line-height: var(--line-height-heading);
}
```

This is the pattern any future wrapper that locks design-scale values should
follow.

### Convenience wrappers

The wrappers in `src/components/ui/typography/` are thin: they merge a utility
class onto a Radix primitive and pass through `{...rest}`.

| Wrapper     | Wraps             | Locked behavior                                                                |
| ----------- | ----------------- | ------------------------------------------------------------------------------ |
| `H1`        | `Heading as="h1"` | 48px / 700 / 1.2 line-height via `.rt-Heading.h1`                              |
| `H2`        | `Heading as="h2"` | 36px / 600 / 1.2 line-height via `.rt-Heading.h2`                              |
| `H3`        | `Heading as="h3"` | 28px / 500 / 1.2 line-height via `.rt-Heading.h3`                              |
| `H4`        | `Heading as="h4"` | 22px / 500 / 1.2 line-height via `.rt-Heading.h4`                              |
| `Paragraph` | `Text as="p"`     | 16px (size 3) / 1.6 line-height via `.rt-Text.paragraph`                       |
| `Label`     | `Text as="label"` | size 4 / weight medium / heading font, defaults to `<label>`, `as` overridable |

`Em`, `Strong`, `Code`, `Kbd`, `Quote`, `Blockquote`, `Link`, `Heading`, `Text`
are direct re-exports from Radix Themes, no wrapping.

### Design-system contract

Stories under `src/features/design-system/stories/typography/` consume the
actual components:

```tsx
import { H1, Paragraph, Code, Em, ... } from '@/components/ui/typography';
```

A story cannot drift from production rendering because it renders the same
components a page would. The only intentional exceptions are font-specimen
stories (alphabet showcase, letterform disambiguation) that need to display the
literal typeface and use `var(--font-*)` directly.

Storybook specimens use **px values, not rem**. Because `base.css` sets
`html { font-size: 62.5% }`, `1rem` is `10px` everywhere; rem-based specimens
render at 5/8 their intended size. Px is the unambiguous unit for stories.

## Considered alternatives

- **Override Radix tokens on `:root`.** First attempt. Did not work because
  `.radix-themes` is a closer ancestor and wins inheritance. Direct application
  to `.radix-themes` is the correction.
- **Globally redefine `--font-size-N` on `.radix-themes`.** Works for font-size
  at heading levels but pollutes Radix's whole size scale: any other component
  using `size="8"` (Card title, Badge, etc.) would inherit the design's heading
  H1 size. The compound selector approach is scoped to `.rt-Heading`
  specifically.
- **Compound selectors only, no CSS variable overrides.** Sufficient for
  font-size and weight on headings, but does not solve the font-family problem
  (Radix reads `var(--default-font-family)` from the theme element). Both layers
  are needed.
- **Inline `style={...}` on wrappers.** Forbidden by the CSP requirement
  introduced during the same arc. Style-prop overrides also fragment
  customization across components and stories instead of centralizing it in CSS.
- **Use Radix's `<Theme scaling="105%">` to bump heading sizes.** Scales every
  Radix component proportionally, including buttons, padding, and the rest of
  the spacing system. We want headings to be larger than Radix's defaults, not
  the entire UI.
- **Per-component CSS modules** (`heading.module.css`, `paragraph.module.css`).
  Considered for the wrappers themselves. Rejected because the locked styles
  also apply to bare `<h1>` elements (e.g. in MDX content), which a CSS module
  can't reach. The global typography rules cover both surfaces.
- **Re-export everything from Radix without wrappers.** Lighter, but loses the
  project's heading scale enforcement: any developer could pass
  `<Heading size="9">` and produce off-scale headings. The wrappers exist to
  prevent that.
- **Maintain a separate design system in its own package.** Heavier than the
  product currently warrants. Phase 1a needs a working typography system; it
  does not need a publishable design library. Revisit if a sibling app ever
  needs to consume the same typography.

## Consequences

**Easier:**

- One stylesheet entry point. `main.tsx` and Storybook preview both do
  `import '@/styles/index.css'`. Adding a new global CSS file means adding one
  `@import` to the aggregator.
- Cascade-safe overrides. The `.rt-Heading.hN` and `.radix-themes` patterns win
  regardless of stylesheet load order, so Vite's bundling decisions cannot break
  typography between dev and prod.
- Stories cannot drift from production. The HeadingScale specimen renders the
  same `<H1>` the home page renders.
- Adding a new locked heading wrapper (e.g. `Display` for a 64px hero heading)
  follows a well-trodden recipe: add a class rule to `typography.css`, add a
  compound `.rt-Heading.display` rule to `radix-overrides.css`, add the wrapper
  to `heading.tsx`.
- Wrappers are CSP-friendly. No inline styles, all customization via className.

**Harder:**

- Token definitions span two files. `:root` for project tokens, `.radix-themes`
  for Radix-side aliases. A contributor adding a new font role has to think
  about both.
- The `.rt-Heading.hN` pattern is non-obvious for first-time readers. The
  Components/Typography overview MDX explains it; new contributors should read
  it before extending the typography system.
- Storybook specimens that show literal typefaces intentionally bypass the
  components. Readers may briefly wonder why `BrandSpecimen` uses
  `var(--font-brand)` directly when other specimens use `<H1>`. The answer is
  "we are showing the typeface, not a component using the typeface" and is
  documented in the story comments.
- Loading order between Radix's CSS and ours is fixed in `index.css` but not
  enforced anywhere else. A contributor who imports a stylesheet directly in a
  component file (instead of adding it to `index.css`) could reintroduce
  ordering issues. Code review must catch.

**New constraints:**

- New typography wrappers must merge a stable utility class onto a Radix
  primitive (using the `classNames` util at `src/utils/style/class-names.ts`)
  and add a corresponding rule in `typography.css` and, if needed,
  `radix-overrides.css`.
- New project font roles need entries in both `:root` (`--font-*`) and
  `.radix-themes` (the Radix-side alias) if they should affect Radix components.
- Storybook specimen styles use px, not rem, when an exact pixel size is the
  design intent.
- Storybook preview.tsx and `main.tsx` both import `index.css` and only
  `index.css`. Piecewise CSS imports in either file are a regression.
- The architectural boundary `styles` is now a top-level shared layer (added to
  `eslint.config.js`). New CSS files live under `src/styles/` and are
  addressable as `@/styles/<name>.css`.

## Links

- `apps/web/src/styles/` (the stylesheet structure described above)
- `apps/web/src/components/ui/typography/` (the wrappers)
- `apps/web/src/features/design-system/stories/typography/` (the specimens)
- `apps/web/eslint.config.js` (the `styles` boundary type)
- ADR [0002](0002-web-features-layout.md) (architectural boundaries that this
  ADR composes with)
- Issue #88 (Phase 0 typography system foundations: fonts, roles, base tokens)
- Issue #45 (the in-flight branch where this decision was forced)
- [Radix Themes typography reference](https://www.radix-ui.com/themes/docs/components/text)
