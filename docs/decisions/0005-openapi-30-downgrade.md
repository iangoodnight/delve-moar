# 0005. Serve OpenAPI 3.0.3 from a 3.1 source until oapi-codegen catches up

- Status: accepted
- Date: 2026-04-25

## Context

ADR [0001](0001-openapi-as-source-of-truth.md) makes `openapi.json` the contract
between the API and its two clients. The clients use different generators:

- The web app uses [`openapi-typescript`](https://openapi-ts.dev/), which
  supports both OpenAPI 3.0 and 3.1.
- The CLI uses [`oapi-codegen`](https://github.com/oapi-codegen/oapi-codegen),
  which today supports only OpenAPI 3.0.x. Tracked upstream in
  [oapi-codegen #373](https://github.com/oapi-codegen/oapi-codegen/issues/373).

FastAPI plus Pydantic v2 emit OpenAPI 3.1 by default, and the upgrade brought
genuinely useful changes (proper nullability, `examples` arrays, JSON Schema
2020-12). We do not want to give up any of that.

We need both clients to consume the same schema, and one of them does not yet
speak the version we emit.

## Decision

**Override `app.openapi()` to downgrade the served schema from 3.1 to 3.0.3 at
serve time.**

- The downgrade helper lives in `apps/api/app/openapi.py`.
- It is wired up in `apps/api/app/main.py` after the FastAPI instance is
  created, by reassigning `app.openapi`.
- The downgrade is applied at the served `openapi.json` endpoint, so every
  consumer (Swagger UI, ReDoc, both code generators) sees the same downgraded
  schema.
- The internal Pydantic schemas remain expressed at their full 3.1 fidelity. The
  downgrade is purely a serialization step.

The arrangement is explicitly temporary. When `oapi-codegen` ships 3.1 support
(or we replace it), we delete the helper and the override and serve native 3.1.
A comment in `app/main.py` flags the upstream issue so a future contributor can
make the call.

## Considered alternatives

- **Pin Pydantic or FastAPI to a version that emits 3.0.** Loses the 3.1
  features we want, plus it pins us behind upstream security and bug fixes.
  Rejected.
- **Switch to a different Go client generator (`ogen`, `swagger-codegen`).**
  `ogen` looked promising but has its own generator-specific quirks and a
  different ergonomic profile from what `oapi-codegen` produces. Switching would
  solve this problem and introduce its own. Reconsider if `oapi-codegen` 3.1
  support stalls for a long time.
- **Hand-write the Go client.** Violates ADR
  [0001](0001-openapi-as-source-of-truth.md). Rejected.
- **Two parallel schemas (a 3.1 endpoint for the web app, a 3.0 endpoint for the
  CLI).** Doubles the surface area of the contract, and any drift between the
  two becomes a new failure mode. Rejected.
- **Live with the limitation by writing only 3.0-compatible schemas.** Possible
  but quietly poisons every future schema decision: every contributor would need
  to know which 3.1 features to avoid. Not worth the cognitive tax.

## Consequences

**Easier:**

- Both client generators consume the same schema and produce code that matches
  the API exactly.
- Pydantic schemas can use any 3.1-compatible feature without worrying about the
  downgrade.
- The workaround is localized: one helper, one assignment. No contributor
  working on routers or schemas needs to know about it.

**Harder:**

- The downgrade helper itself is a translation layer that must be maintained as
  long as the workaround is in place. Edge cases in 3.1 features that the helper
  does not yet handle would surface as generator failures, not as obvious bugs.
- The served `openapi.json` is not what FastAPI's docs claim it is. Anyone
  debugging the served schema needs to know about the override.

**New constraints:**

- Anyone touching the OpenAPI emission (e.g. adding a custom serializer) needs
  to verify the downgrade still produces valid 3.0.3.
- Removing the workaround is itself a change worth recording: when
  `oapi-codegen` ships 3.1 support, the removal happens in a single PR and
  supersedes (or is referenced by) this ADR.

## Links

- Upstream:
  [oapi-codegen #373](https://github.com/oapi-codegen/oapi-codegen/issues/373)
- Code: `apps/api/app/openapi.py` (the helper)
- Code: `apps/api/app/main.py` (the override at the bottom of the file)
- Doc:
  [`docs/architecture/openapi-pipeline.md`](../architecture/openapi-pipeline.md#the-openapi-31-to-303-downgrade)
- Related: ADR [0001](0001-openapi-as-source-of-truth.md), the source of the
  constraint
