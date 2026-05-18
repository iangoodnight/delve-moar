"""Tests for item schemas and list/detail API endpoints.

Schema tests exercise Pydantic validation and serialization in isolation
(no HTTP, no DB). Route tests use a mocked AsyncSession injected via
FastAPI's dependency_overrides so they run without a live database.
"""

from collections.abc import AsyncGenerator
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.db import get_session
from app.main import app
from app.schemas.items import ItemDetail, ItemSummary
from tests.conftest import SRD_CONTENT_SOURCE_FIXTURE

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _make_item(**overrides: Any) -> SimpleNamespace:
    """Return a SimpleNamespace that mirrors an Item ORM row.

    Uses SimpleNamespace so that Pydantic's from_attributes mode can read
    fields via getattr without needing a live SQLAlchemy session.
    """
    defaults: dict[str, Any] = {
        "slug": "longsword",
        "source_namespace": "srd-5.1",
        "name": "Longsword",
        "item_category": "Weapon",
        "rarity": None,
        "content": {"index": "longsword", "name": "Longsword", "cost": "15 gp"},
        "content_source": SRD_CONTENT_SOURCE_FIXTURE,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# ---------------------------------------------------------------------------
# ItemSummary schema tests
# ---------------------------------------------------------------------------


class TestItemSummarySchema:
    """Unit tests for ItemSummary Pydantic schema."""

    def test_basic_fields_are_present(self) -> None:
        """All summary fields are exposed after validation."""
        item = ItemSummary.model_validate(_make_item())
        assert item.slug == "longsword"
        assert item.name == "Longsword"
        assert item.item_category == "Weapon"
        assert item.rarity is None

    def test_item_category_accepts_none(self) -> None:
        """item_category is nullable for items without a category."""
        item = ItemSummary.model_validate(_make_item(item_category=None))
        assert item.item_category is None

    def test_rarity_accepts_string_value(self) -> None:
        """rarity can hold a non-null string value for magic items."""
        item = ItemSummary.model_validate(_make_item(rarity="Rare"))
        assert item.rarity == "Rare"

    def test_rarity_accepts_none(self) -> None:
        """rarity is nullable (mundane equipment has no rarity)."""
        item = ItemSummary.model_validate(_make_item(rarity=None))
        assert item.rarity is None

    def test_camel_case_output(self) -> None:
        """model_dump(by_alias=True) produces camelCase keys."""
        item = ItemSummary.model_validate(_make_item())
        dumped = item.model_dump(by_alias=True)
        assert "itemCategory" in dumped
        assert "item_category" not in dumped

    def test_both_nullable_fields_none(self) -> None:
        """Both item_category and rarity can be None simultaneously."""
        item = ItemSummary.model_validate(
            _make_item(item_category=None, rarity=None)
        )
        assert item.item_category is None
        assert item.rarity is None


# ---------------------------------------------------------------------------
# ItemDetail schema tests
# ---------------------------------------------------------------------------


class TestItemDetailSchema:
    """Unit tests for ItemDetail Pydantic schema."""

    def test_exposes_content_blob(self) -> None:
        """ItemDetail includes the raw content dict."""
        item = ItemDetail.model_validate(_make_item())
        assert item.content == {
            "index": "longsword",
            "name": "Longsword",
            "cost": "15 gp",
        }

    def test_exposes_content_source(self) -> None:
        """ItemDetail includes content_source attribution metadata."""
        item = ItemDetail.model_validate(_make_item())
        assert item.content_source.model_dump() == SRD_CONTENT_SOURCE_FIXTURE

    def test_content_source_serializes_to_camel_case(self) -> None:
        """content_source appears as contentSource in JSON output."""
        item = ItemDetail.model_validate(_make_item())
        dumped = item.model_dump(by_alias=True)
        assert "contentSource" in dumped
        assert "content_source" not in dumped

    def test_inherits_all_summary_fields(self) -> None:
        """ItemDetail is a strict superset of ItemSummary fields."""
        item = ItemDetail.model_validate(_make_item())
        assert item.slug == "longsword"
        assert item.name == "Longsword"
        assert item.item_category == "Weapon"
        assert item.rarity is None


# ---------------------------------------------------------------------------
# Fixtures for route tests
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_session() -> MagicMock:
    """AsyncSession stand-in with AsyncMock scalar and execute methods."""
    session = MagicMock()
    session.scalar = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.fixture
async def items_client(
    mock_session: MagicMock,
) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client wired to the real app with the DB session replaced.

    The same mock_session instance is injected into the app so tests can
    configure return values and make assertions on calls.
    """

    async def _get_test_session() -> AsyncGenerator[MagicMock, None]:
        yield mock_session

    app.dependency_overrides[get_session] = _get_test_session
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac
    finally:
        app.dependency_overrides.pop(get_session, None)


def _setup_list_session(
    mock_session: MagicMock,
    items: list[Any],
    total: int,
) -> None:
    """Configure mock_session to satisfy a list_items query.

    list_items calls session.scalar() once for the total count and
    session.execute() once for the page of rows.
    """
    mock_session.scalar.return_value = total
    mock_result = MagicMock()
    mock_result.scalars.return_value = items
    mock_session.execute.return_value = mock_result


# ---------------------------------------------------------------------------
# List endpoint tests
# ---------------------------------------------------------------------------


class TestListItemsEndpoint:
    """Integration-style tests for GET /v1/items."""

    async def test_returns_200(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Baseline: endpoint returns HTTP 200."""
        _setup_list_session(mock_session, [], 0)
        response = await items_client.get("/v1/items")
        assert response.status_code == 200

    async def test_response_has_metadata_and_data_keys(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Top-level response envelope contains 'metadata' and 'data'."""
        _setup_list_session(mock_session, [], 0)
        body = (await items_client.get("/v1/items")).json()
        assert "metadata" in body
        assert "data" in body

    async def test_metadata_resultset_contains_pagination_fields(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """metadata.resultset exposes count, limit, and offset."""
        _setup_list_session(mock_session, [], 0)
        body = (await items_client.get("/v1/items")).json()
        resultset = body["metadata"]["resultset"]
        assert "count" in resultset
        assert "limit" in resultset
        assert "offset" in resultset

    async def test_count_reflects_total_not_page_size(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """metadata.resultset.count is the full total, not the page length."""
        _setup_list_session(mock_session, [_make_item()], 99)
        body = (await items_client.get("/v1/items?limit=1")).json()
        assert body["metadata"]["resultset"]["count"] == 99
        assert body["metadata"]["resultset"]["limit"] == 1

    async def test_empty_resultset(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Empty results return count=0 and data=[]."""
        _setup_list_session(mock_session, [], 0)
        body = (await items_client.get("/v1/items")).json()
        assert body["data"] == []
        assert body["metadata"]["resultset"]["count"] == 0

    async def test_data_items_use_camel_case_keys(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Each item in the data array uses camelCase field names."""
        _setup_list_session(mock_session, [_make_item()], 1)
        body = (await items_client.get("/v1/items")).json()
        record = body["data"][0]
        assert "itemCategory" in record
        assert "item_category" not in record

    async def test_offset_echoed_in_metadata(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Requested offset is reflected back in pagination metadata."""
        _setup_list_session(mock_session, [], 10)
        body = (await items_client.get("/v1/items?offset=5")).json()
        assert body["metadata"]["resultset"]["offset"] == 5

    async def test_nullable_fields_allowed_in_list_response(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Items with null category and rarity are serialized correctly."""
        _setup_list_session(
            mock_session, [_make_item(item_category=None, rarity=None)], 1
        )
        body = (await items_client.get("/v1/items")).json()
        record = body["data"][0]
        assert record["itemCategory"] is None
        assert record["rarity"] is None

    async def test_rarity_filter_set_to_none_string_is_accepted(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """rarity=none is valid and filters for rows with null rarity."""
        _setup_list_session(mock_session, [], 0)
        response = await items_client.get("/v1/items?rarity=none")
        assert response.status_code == 200

    async def test_limit_zero_returns_422(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """limit=0 is below the minimum and returns 422."""
        response = await items_client.get("/v1/items?limit=0")
        assert response.status_code == 422
        assert response.json()["errorCode"] == "VALIDATION_ERROR"

    async def test_limit_over_maximum_returns_422(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """limit > 100 exceeds the maximum and returns 422."""
        response = await items_client.get("/v1/items?limit=101")
        assert response.status_code == 422

    async def test_negative_offset_returns_422(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Negative offset fails validation and returns 422."""
        response = await items_client.get("/v1/items?offset=-1")
        assert response.status_code == 422

    async def test_422_uses_app_error_format_not_fastapi_detail(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """422 body uses ErrorResponse shape, not FastAPI's 'detail' array."""
        response = await items_client.get("/v1/items?limit=0")
        body = response.json()
        assert "detail" not in body
        assert "errorCode" in body
        assert "developerMessage" in body


# ---------------------------------------------------------------------------
# Detail endpoint tests
# ---------------------------------------------------------------------------


class TestGetItemEndpoint:
    """Integration-style tests for GET /v1/items/{slug}."""

    async def test_returns_200_for_existing_slug(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Baseline: known slug returns HTTP 200."""
        mock_session.scalar.return_value = _make_item()
        response = await items_client.get("/v1/items/longsword")
        assert response.status_code == 200

    async def test_response_includes_content_fields(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Detail response includes content and contentSource (camelCase)."""
        mock_session.scalar.return_value = _make_item()
        body = (await items_client.get("/v1/items/longsword")).json()
        assert "content" in body
        assert "contentSource" in body
        assert "content_source" not in body

    async def test_response_includes_all_summary_fields(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Detail response is a superset of the list item shape."""
        mock_session.scalar.return_value = _make_item()
        body = (await items_client.get("/v1/items/longsword")).json()
        assert "slug" in body
        assert "name" in body
        assert "itemCategory" in body
        assert "rarity" in body

    async def test_nullable_fields_present_in_detail_response(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Detail response includes nullable fields even when null."""
        mock_session.scalar.return_value = _make_item(
            item_category=None, rarity=None
        )
        body = (await items_client.get("/v1/items/longsword")).json()
        assert body["itemCategory"] is None
        assert body["rarity"] is None

    async def test_missing_slug_returns_404(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Unknown slug returns HTTP 404."""
        mock_session.scalar.return_value = None
        response = await items_client.get("/v1/items/does-not-exist")
        assert response.status_code == 404

    async def test_404_body_uses_app_error_shape(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """404 body contains all ErrorResponse fields in camelCase."""
        mock_session.scalar.return_value = None
        body = (await items_client.get("/v1/items/flame-tongue")).json()
        assert body["status"] == 404
        assert body["errorCode"] == "RESOURCE_NOT_FOUND"
        assert "developerMessage" in body
        assert "userMessage" in body
        assert "moreInfo" in body

    async def test_404_does_not_use_fastapi_detail_shape(
        self, items_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """404 response does not include FastAPI's default 'detail' key."""
        mock_session.scalar.return_value = None
        body = (await items_client.get("/v1/items/missing")).json()
        assert "detail" not in body
