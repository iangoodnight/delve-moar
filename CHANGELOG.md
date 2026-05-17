# Changelog

All notable changes to DelveMoar are recorded in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
at the per-app level. The top-level monorepo version (in [`VERSION`](VERSION))
bumps at phase milestones; see [ADR 0004](docs/decisions/0004-versioning-model.md).

For the per-PR convention and the manual release ritual, see the
[Changelog section in `CONTRIBUTING.md`](CONTRIBUTING.md#changelog).

## [Unreleased]

### Added

- web: `@axe-core/react` for development-time accessibility logging in the browser console (#106)
- web: `vitest-axe` with `toHaveNoViolations` assertions in unit tests; first assertion in `home-page.test.tsx` (#106)
- web: Monster list page at `/monsters` with search, type / CR filters, and infinite scroll. URL-driven filter state for deep-linkable views.
- web: Monster detail page at `/monsters/:slug` with the full SRD stat block (identity, combat, ability scores, traits, actions, special abilities, optional reactions and legendary actions), a content-source-driven attribution footer, a layout-mirroring loading skeleton, and 404 / generic error states.
- web: Spell list page at `/spells` with search, school / level filters, and infinite scroll. URL-driven filter state for deep-linkable views. (#48)
- web: Spell detail page at `/spells/:slug` rendering casting time, range, components (V/S/M with material parenthetical), duration (with concentration prefix when applicable), optional ritual flag and caster classes, multi-paragraph description, optional "At Higher Levels" section, attribution footer, layout-mirroring loading skeleton, and 404 / generic error states. (#48)
- web: Item list page at `/items` with search, category, and rarity filters, and infinite scroll. The rarity filter automatically clears (and disables) when a mundane-only category is picked, so the list does not silently render empty. (#49)
- web: Item detail page at `/items/:slug` rendering both mundane equipment (cost, weight, weapon / armor stats, properties) and magic items (rarity badge, attunement, description paragraphs). Properties block uses the same `figure` + responsive 3-column grid pattern as the monster combat block. Same attribution footer, loading skeleton, and 404 / generic error treatment as the spell page. (#49)

### Changed

### Deprecated

### Removed

### Fixed

- web: Monster CR min / max filter inputs now clamp to a valid range; setting one bound past the other auto-bumps the other to match, rather than yielding an empty resultset with no explanation. (#48)
- web: Monster action paragraphs no longer carry the hanging indent below the `sm` breakpoint, recovering reading width on narrow viewports. (#48)

### Security
