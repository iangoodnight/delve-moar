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

### Changed

### Deprecated

### Removed

### Fixed

### Security
