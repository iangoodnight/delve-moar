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

- Server-side authentication for the API (ADR 0010): email/password
  signup, login, and logout under `/v1/auth`, backed by argon2id
  password hashing and opaque server-side sessions in HttpOnly cookies
  (sliding expiry, revocable, with "sign out everywhere"). Requests are
  protected by a double-submit CSRF token, and a single
  `get_current_user` seam reads identity so OAuth can be added later
  without touching handlers. A `GET /v1/auth/me` endpoint returns the
  current user.

### Changed

### Deprecated

### Removed

### Fixed

### Security

- Bump `react-router` to 7.17.0 (via `react-router-dom`), clearing three
  advisories: a turbo-stream deserialization RCE
  (GHSA-49rj-9fvp-4h2h), a DoS via the `__manifest` endpoint
  (GHSA-8x6r-g9mw-2r78), and a protocol-relative open redirect
  (GHSA-2j2x-hqr9-3h42).
- Pin the transitive `ws` under the Kubb codegen tooling to `>= 8.20.1`
  via a `pnpm.overrides` entry, clearing an uninitialized-memory
  disclosure (GHSA-58qx-3vcg-4xpx).

## [0.1.2] - 2026-05-18

The bugfix for the production deploy issues in v0.1.1 did not fully resolve
the problems with the API running on Fly.io. The site was live but the API had
crashed as a result of a missing alembic migration. This patch mounts
the alembic files into the production images. Bundled with it is a small
update to CONTRIBUTING.md capturing lessons learned from the initial two
releases.


## [0.1.1] - 2026-05-18

First working production deploy. v0.1.0 was tagged but never successfully
served traffic — several config and platform issues only surfaced once the
CD workflow tried to roll out the image on Fly.io. This patch bundles the
fixes so the deploy pipeline produces a live site.

### Fixed

- infra: fly.toml `auto_stop_machines` updated from the deprecated string
  enum (`'stop'`) to the bool flyctl 0.4.x expects. (#137)
- infra: `task fly:deploy` now builds with `--platform linux/amd64` so M1
  hosts produce an image Fly's amd64 runtime can run. (#137)
- api: `DATABASE_URL` injected by `fly postgres attach` is now coerced into
  the asyncpg dialect (`postgres://` → `postgresql+asyncpg://`) and the
  `sslmode` query parameter is renamed to asyncpg's `ssl`. The previous
  attempt to strip it left asyncpg to negotiate SSL by default, which fails
  on Fly's internal `.flycast` network. (#137, #138)
- api: `cors_allowed_origins` is now annotated with `NoDecode` so the CSV
  `BeforeValidator` receives the raw env value instead of pydantic-settings
  trying to JSON-decode it and crashing on startup. (#137)

## [0.1.0] - 2026-05-18

Phase 1a: SRD catalog, read-only. Anyone can browse the full 5e SRD through
the web app. The full stack (seed → API → codegen → web) is proven on real
content. The site is publicly hostable with noindex while the product matures.

### Added

- infra: production deploy pipeline -- Vercel (web SPA) + Fly.io (API) + Fly Postgres, with Terraform IaC under `infra/terraform/fly/` and a CD workflow that builds the API image, runs migrations, and deploys on GitHub Release publish (#126)
- web,api: belt-and-suspenders noindex -- `robots.txt` (Disallow: /), `<meta name="robots" content="noindex, nofollow">` in `index.html`, and `X-Robots-Tag: noindex, nofollow` middleware on the API (#126)
- docs: `docs/deploy.md` deployment runbook covering release ritual, rollback steps, and first-time infrastructure provisioning (#126)
- web: `@axe-core/react` for development-time accessibility logging in the browser console (#106)
- web: `vitest-axe` with `toHaveNoViolations` assertions in unit tests; first assertion in `home-page.test.tsx` (#106)
- web: Monster list page at `/monsters` with search, type / CR filters, and infinite scroll. URL-driven filter state for deep-linkable views.
- web: Monster detail page at `/monsters/:slug` with the full SRD stat block (identity, combat, ability scores, traits, actions, special abilities, optional reactions and legendary actions), a content-source-driven attribution footer, a layout-mirroring loading skeleton, and 404 / generic error states.
- web: Spell list page at `/spells` with search, school / level filters, and infinite scroll. URL-driven filter state for deep-linkable views. (#48)
- web: Spell detail page at `/spells/:slug` rendering casting time, range, components (V/S/M with material parenthetical), duration (with concentration prefix when applicable), optional ritual flag and caster classes, multi-paragraph description, optional "At Higher Levels" section, attribution footer, layout-mirroring loading skeleton, and 404 / generic error states. (#48)
- web: Item list page at `/items` with search, category, and rarity filters, and infinite scroll. The rarity filter automatically clears (and disables) when a mundane-only category is picked, so the list does not silently render empty. (#49)
- web: Item detail page at `/items/:slug` rendering both mundane equipment (cost, weight, weapon / armor stats, properties) and magic items (rarity badge, attunement, description paragraphs). Properties block uses the same `figure` + responsive 3-column grid pattern as the monster combat block. Same attribution footer, loading skeleton, and 404 / generic error treatment as the spell page. (#49)
- web: DelveMoar branded favicon set replacing the Vite default. Theme-aware SVG (light / dark variants via `prefers-color-scheme` CSS embedded in the asset), maskable Android icons for PWA install, Apple touch icon, multi-size ICO + 96×96 PNG fallback, web app manifest with `DelveMoar` / `DM` identity, and `prefers-color-scheme`-aware `theme-color` meta tags. (#123)
- api: Pydantic content schemas for monster, spell, and item content payloads, replacing the previous untyped `dict[str, Any]` fields on the detail response models. All content fields are validated at the API boundary with strict types on declared fields and `extra='allow'` for forward-compatible passthrough of unmodeled SRD additions. (#124)
- api,web: OpenAPI → Zod codegen pipeline. Kubb (`@kubb/cli` + `@kubb/plugin-zod`) generates Zod schemas alongside the existing openapi-typescript TS types, output to `packages/api-types/src/zod/`. Available to FE consumers as `@delve-moar/api-types/zod`. (#124)

### Changed

- api: Detail endpoint JSON responses now use camelCase for all nested `content` and `contentSource` fields (e.g. `licenseUrl`, `weaponCategory`, `armorClass.dexBonus`, `castingTime`, `passivePerception`). Top-level response fields were already camelCase; this extends the convention through to the nested payload. **Breaking change** for any direct API consumer: snake_case key access (`license_url`, `weapon_category`, etc.) no longer works. (#124)
- web: FE no longer performs Zod boundary parsing on detail responses; the API contract is the single source of truth via OpenAPI codegen. The four `srd-{content-source,item,monster,spell}-content.schema.ts` files are removed; consumers import TS types from `@delve-moar/api-types` directly. (#124)

### Fixed

- web: Monster CR min / max filter inputs now clamp to a valid range; setting one bound past the other auto-bumps the other to match, rather than yielding an empty resultset with no explanation. (#48)
- web: Monster action paragraphs no longer carry the hanging indent below the `sm` breakpoint, recovering reading width on narrow viewports. (#48)
