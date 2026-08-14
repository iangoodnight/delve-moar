# API stability and deprecation policy

The DelveMoar API is an OpenAPI contract, and that contract is the
source of truth for the types the web app and the Go CLI are generated
from (ADR [0001](decisions/0001-openapi-as-source-of-truth.md)). Other
integrations can be built against it too: a chat bot, a virtual-tabletop
bridge, a personal script. This document states what stability those
integrators can expect, how a breaking change is signaled, and how long
a deprecated part of the contract stays before it is removed.

## Where the contract lives

- The live schema is served at `/openapi.json` and rendered at `/docs`.
- Every resource endpoint is mounted under the `/v1` URL prefix.
- `/health` sits outside `/v1` on purpose: it is infrastructure, not a
  resource, and carries no stability guarantee.

## Versioning

The major number in the `/v1` URL prefix is the API's stability
boundary. It is deliberately separate from the two other version
numbers in the repo (ADR
[0004](decisions/0004-versioning-model.md)):

- The **URL major** (`/v1`) tracks the shape of the HTTP contract.
- The **per-app version** in `apps/api/pyproject.toml` tracks the API
  service's own releases.
- The **product version** in the root `VERSION` file bumps at phase
  milestones (Phase 1b ships as `0.2.0`).

A new URL major (`/v2`) is introduced only for a wholesale, unavoidable
break in the contract. When that happens, `/v1` and `/v2` are served
side by side for a transition window so integrators can migrate without
a flag day. Adding `/v2` is a last resort, not the routine way changes
ship; almost everything reaches integrators as an additive change under
`/v1`.

### Pre-1.0 caveat

The product is pre-1.0 and under a soft launch (search engines are
asked not to index it yet). While that holds, `/v1` is stabilizing
rather than frozen: an occasional breaking change may still be needed
within `/v1` before the product reaches `1.0.0`. Every such change is
signaled the same way a post-1.0 deprecation is (see below), never
shipped silently. The firm guarantee, that a breaking change requires a
new URL major and a transition window, takes effect at the product's
`1.0.0` release.

## Breaking versus non-breaking changes

**Non-breaking (additive)** changes ship under `/v1` without notice. A
well-behaved client ignores what it does not recognize, so these do not
break one:

- A new endpoint.
- A new optional field in a response.
- A new optional query parameter or request field.
- A new allowed value for an existing enum-like field. Clients that
  hard-code the known set should treat an unfamiliar value as "other"
  rather than erroring.
- A relaxed validation rule that accepts input previously rejected.

**Breaking** changes do not ship silently under `/v1`. They go through
the deprecation process below, or, in the wholesale case, a new URL
major:

- Removing or renaming an endpoint, field, or parameter.
- Changing the type or meaning of an existing field.
- Making an optional parameter or field required.
- Tightening validation so input that used to be accepted is rejected.
- Changing a default value, a default sort order, or the shape of an
  error response.

## Deprecation process

When a part of the contract is on its way out, it is marked, announced,
and only then removed:

1. **Mark it.** The endpoint, field, or parameter is flagged
   `deprecated: true` in the OpenAPI schema, so it renders struck
   through in `/docs` and is visible to any codegen or linting an
   integrator runs against the schema.
2. **Announce it.** The deprecation is recorded under the `Deprecated`
   heading of the changelog (ADR
   [0006](decisions/0006-changelog-convention.md)), in user-facing
   language, naming the replacement.
3. **Wait.** The deprecated part keeps working for a minimum notice
   window of **90 days, and at least one product release**, whichever
   is longer, so an integrator who only checks in at release boundaries
   still sees it before it goes.
4. **Remove it.** After the window, the part is removed and the removal
   is recorded under the `Removed` heading of the changelog.

A security fix is the one case that may move faster than the standard
window. If it ever does, the changelog `Security` entry says so.

## Filter and parameter stability

The query parameters integrators lean on, the `search` term, `order_by`,
and the content filters (`book`, `include`, `scope`), follow the same
rules as everything else: new ones are additive and safe to ignore, and
an existing one is only removed or renamed through the deprecation
process above. Their documented behavior, not their current
implementation, is the contract. How a filter is computed may change as
long as the documented input and output hold.

## Tracking changes

- Watch [`CHANGELOG.md`](../CHANGELOG.md). Additive changes land under
  `Added` or `Changed`; removals are pre-announced under `Deprecated`
  and land under `Removed`.
- Diff `/openapi.json` between releases, or watch for `deprecated: true`
  markers, to catch contract changes programmatically.

## Related

- ADR [0001](decisions/0001-openapi-as-source-of-truth.md), OpenAPI as
  the source of truth.
- ADR [0004](decisions/0004-versioning-model.md), the versioning model
  (`/v1`, per-app semver, product `0.x.y`).
- ADR [0006](decisions/0006-changelog-convention.md), the changelog
  convention that carries deprecation and removal notices.
- The [OpenAPI pipeline](architecture/openapi-pipeline.md), how the
  contract becomes generated clients.
