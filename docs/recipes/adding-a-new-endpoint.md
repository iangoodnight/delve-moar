# Adding a new endpoint

This walkthrough adds a new resource end-to-end: a `conditions` catalog
(blinded, charmed, frightened, etc.). We will:

1. Define the SQLAlchemy model
2. Generate and apply an Alembic migration
3. Define the Pydantic schemas
4. Write the FastAPI router
5. Mount the router under `/v1/`
6. Regenerate the OpenAPI client code
7. Consume the endpoint from the web app

By the end, `/v1/conditions` will return a paginated list of conditions,
typed end-to-end from Python to TypeScript.

The example is real but compact; in a production change you would also
write tests at each layer. Tests are mentioned where they belong but not
fully specified.

## Before you start

Make sure your environment is up:

```sh
task dev:api          # postgres + API
```

Open the existing `monsters` resource in another window. We will mirror
its shape:

- `apps/api/app/models/monster.py`
- `apps/api/app/schemas/monsters.py`
- `apps/api/app/routers/monsters.py`

Mirroring an existing resource is the fastest way to stay consistent with
the conventions already in use (pagination, error handling, response
envelope, OpenAPI tags).

## Step 1: define the model

We will add `apps/api/app/models/condition.py`.

```python
"""Condition ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class Condition(Base):
    """A 5e condition (blinded, charmed, frightened, ...)."""

    __tablename__ = "conditions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="srd")
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
```

Then export it from `apps/api/app/models/__init__.py` so Alembic's
autogenerate finds it:

```python
from app.models.condition import Condition  # noqa: F401
```

## Step 2: generate and apply a migration

```sh
cd apps/api
uv run alembic revision --autogenerate -m "add conditions table"
```

Open the generated file under `apps/api/alembic/versions/` and inspect
it. Autogenerate is good but not perfect; check that:

- The `op.create_table` matches the model
- Server defaults like `gen_random_uuid()` are present
- Indexes you intended are there (or add `op.create_index` calls if not)

Apply it:

```sh
task db:migrate
```

Roll back is `task db:rollback` if you need to iterate.

## Step 3: define the Pydantic schemas

`apps/api/app/schemas/conditions.py`:

```python
"""Pydantic schemas for the conditions API."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ConditionSummary(BaseModel):
    """Compact condition shape for list endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name: str


class ConditionDetail(ConditionSummary):
    """Full condition shape for detail endpoints."""

    description: str
    source: str
    created_at: datetime
    updated_at: datetime
```

Two shapes, one nested in the other. List endpoints use `Summary`; detail
endpoints use `Detail`. This keeps list payloads small.

## Step 4: write the router

`apps/api/app/routers/conditions.py`:

```python
"""Condition list and detail endpoints."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select

from app.db import DbSession
from app.dependencies import Pagination, SearchFilter, ordering_dep, search_dep
from app.exceptions import get_or_404
from app.models import Condition
from app.schemas.conditions import ConditionDetail, ConditionSummary
from app.schemas.errors import ErrorResponse
from app.schemas.pagination import PaginatedResultset
from app.utils import build_links, fetch_page, paginate

router = APIRouter(prefix="/conditions", tags=["Conditions"])

_CONDITION_ORDERING = ordering_dep(
    {"name": Condition.name, "slug": Condition.slug},
    default="name:asc",
)
ConditionOrdering = Annotated[list[Any], Depends(_CONDITION_ORDERING)]

_CONDITION_SEARCH = search_dep([Condition.name, Condition.slug])
ConditionSearch = Annotated[SearchFilter, Depends(_CONDITION_SEARCH)]


@router.get(
    "",
    response_model=PaginatedResultset[ConditionSummary],
    summary="List conditions",
    responses={
        status.HTTP_422_UNPROCESSABLE_CONTENT: {
            "model": ErrorResponse,
            "description": "Validation error",
        },
    },
)
async def list_conditions(
    request: Request,
    session: DbSession,
    params: Pagination,
    ordering: ConditionOrdering,
    search: ConditionSearch,
) -> PaginatedResultset[ConditionSummary]:
    """Return a paginated list of conditions."""
    stmt = select(Condition)
    stmt = search.apply(stmt)
    stmt = stmt.order_by(*ordering)

    items, total = await fetch_page(session, stmt, params)
    return paginate(
        items=items,
        total=total,
        params=params,
        item_schema=ConditionSummary,
        links=build_links(request, params, total),
    )


@router.get(
    "/{condition_id}",
    response_model=ConditionDetail,
    summary="Get a condition",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "Not found",
        },
    },
)
async def get_condition(
    condition_id: UUID,
    session: DbSession,
) -> ConditionDetail:
    """Return one condition by id."""
    condition = await get_or_404(session, Condition, condition_id)
    return ConditionDetail.model_validate(condition)
```

The pagination, ordering, and search helpers (`Pagination`,
`ordering_dep`, `search_dep`, `fetch_page`, `paginate`, `build_links`)
already exist; they handle the White House API standards envelope. The
`get_or_404` helper raises a typed `HTTPException` that the global
exception handlers turn into a `404` `ErrorResponse`.

## Step 5: mount the router under `/v1/`

In `apps/api/app/main.py`, import the router and include it:

```python
from app.routers import conditions, health, items, monsters, spells

# ...

app.include_router(conditions.router, prefix=V1_PREFIX)
```

That is the only change in `main.py`.

## Step 6: regenerate the OpenAPI client

From the repo root:

```sh
task gen:types
```

The script will start the API, fetch `/openapi.json`, regenerate
`packages/api-types/src/index.ts` and
`apps/cli/internal/apiclient/client.gen.go`, and stop the API again.

Inspect `git status`. Two files should diff:

```
modified:   packages/api-types/src/index.ts
modified:   apps/cli/internal/apiclient/client.gen.go
```

(Also possibly `apps/cli/go.mod` and `go.sum` if a new oapi-codegen
runtime import was needed.) Commit them.

For the full pipeline, see
[architecture/openapi-pipeline.md](../architecture/openapi-pipeline.md).

## Step 7: consume from the web app

The web app uses [TanStack Query](https://tanstack.com/query) over a
typed wrapper around the generated client. A typical pattern:

Inside a feature, e.g. `apps/web/src/features/conditions/`:

```ts
// api/get-conditions.ts
import { useQuery } from '@tanstack/react-query'

import type { components } from '@delve-moar/api-types'

import { apiClient } from '@/lib/api-client'

type ConditionSummary = components['schemas']['ConditionSummary']
type ConditionListResponse = components['schemas']['PaginatedResultset_ConditionSummary_']

export function useConditions(page = 1) {
  return useQuery({
    queryKey: ['conditions', { page }],
    queryFn: async (): Promise<ConditionListResponse> => {
      const res = await apiClient.get('/v1/conditions', { params: { page } })
      return res.data
    },
  })
}
```

And a page component, e.g.
`apps/web/src/pages/conditions-list-page.tsx`:

```tsx
import { useConditions } from '@/features/conditions/api/get-conditions'

export function ConditionsListPage() {
  const { data, isLoading, isError } = useConditions()

  if (isLoading) return <p>Loading...</p>
  if (isError || !data) return <p>Failed to load conditions.</p>

  return (
    <ul>
      {data.data.map((condition) => (
        <li key={condition.id}>{condition.name}</li>
      ))}
    </ul>
  )
}
```

Two things to notice:

- The component imports from `@/features/conditions/...` and from
  `@/lib/...`, but never from another feature. That is the bulletproof
  boundary in action; see
  [architecture/web-features-layout.md](../architecture/web-features-layout.md).
- Types come from the generated `@delve-moar/api-types` package, not
  from hand-written interfaces. If the API shape changes and you forget
  to regenerate, TypeScript will tell you on the next build.

## What we did not cover

For brevity, the walkthrough left out these layers. In a real PR you
would address each:

- **API tests.** A `tests/test_conditions.py` exercising the list and
  detail endpoints, with at least one fixture row.
- **Seed script.** Most likely a new function in
  `apps/api/scripts/seed_srd.py` to populate from
  [dnd5eapi.co](https://www.dnd5eapi.co), wired into `task seed:srd`.
- **Web tests.** A `__tests__/conditions-list-page.test.tsx` using
  Testing Library.
- **CLI.** If conditions should be browsable from the CLI too, add a
  `conditions` subcommand under `apps/cli/cmd/` that uses the regenerated
  Go client.
- **Routing.** Add the page to `apps/web/src/app/router.tsx` and link it
  from the navigation shell.

## Where to look next

- [Architecture overview](../architecture/README.md)
- [OpenAPI pipeline](../architecture/openapi-pipeline.md), the codegen step in detail
- [Web features layout](../architecture/web-features-layout.md)
- [Local development](local-development.md), commands you ran above
- An existing resource (`monsters`, `spells`, `items`) for a fully
  fleshed-out example with tests
