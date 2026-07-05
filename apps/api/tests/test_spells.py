"""Tests for spell schemas and list/detail API endpoints.

Schema tests exercise Pydantic validation and serialization in isolation
(no HTTP, no DB). Route tests use a mocked AsyncSession injected via
FastAPI's dependency_overrides so they run without a live database.
"""

import uuid
from collections.abc import AsyncGenerator
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.db import get_session
from app.main import app
from app.schemas.spells import SpellDetail, SpellSummary
from tests.conftest import (
    MINIMAL_SPELL_CONTENT_FIXTURE,
    SRD_CONTENT_SOURCE_FIXTURE,
)

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _make_spell(**overrides: Any) -> SimpleNamespace:
    """Return a SimpleNamespace that mirrors a Spell ORM row.

    Uses SimpleNamespace so that Pydantic's from_attributes mode can read
    fields via getattr without needing a live SQLAlchemy session.
    """
    defaults: dict[str, Any] = {
        "id": uuid.uuid4(),
        "slug": "fireball",
        "source_namespace": "srd-5.1",
        "name": "Fireball",
        "level": 3,
        "school": "evocation",
        "content": {**MINIMAL_SPELL_CONTENT_FIXTURE, "index": "fireball"},
        "content_source": SRD_CONTENT_SOURCE_FIXTURE,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# ---------------------------------------------------------------------------
# SpellSummary schema tests
# ---------------------------------------------------------------------------


class TestSpellSummarySchema:
    """Unit tests for SpellSummary Pydantic schema."""

    def test_level_zero_displays_as_cantrip(self) -> None:
        """Level 0 displays as 'Cantrip'."""
        m = SpellSummary.model_validate(_make_spell(level=0))
        assert m.level == "Cantrip"

    def test_level_one_displays_as_1st(self) -> None:
        """Level 1 displays as '1st'."""
        m = SpellSummary.model_validate(_make_spell(level=1))
        assert m.level == "1st"

    def test_level_two_displays_as_2nd(self) -> None:
        """Level 2 displays as '2nd'."""
        m = SpellSummary.model_validate(_make_spell(level=2))
        assert m.level == "2nd"

    def test_level_three_displays_as_3rd(self) -> None:
        """Level 3 displays as '3rd'."""
        m = SpellSummary.model_validate(_make_spell(level=3))
        assert m.level == "3rd"

    def test_level_four_displays_as_4th(self) -> None:
        """Level 4 displays as '4th'."""
        m = SpellSummary.model_validate(_make_spell(level=4))
        assert m.level == "4th"

    def test_level_nine_displays_as_9th(self) -> None:
        """Level 9 (highest SRD spell level) displays as '9th'."""
        m = SpellSummary.model_validate(_make_spell(level=9))
        assert m.level == "9th"

    def test_level_none_displays_as_unknown(self) -> None:
        """None level displays as 'Unknown'."""
        m = SpellSummary.model_validate(_make_spell(level=None))
        assert m.level == "Unknown"

    def test_ordinal_suffix_11_is_th_not_st(self) -> None:
        """Level 11 uses 'th', not 'st' (irregular ordinal)."""
        m = SpellSummary.model_validate(_make_spell(level=11))
        assert m.level == "11th"

    def test_ordinal_suffix_12_is_th_not_nd(self) -> None:
        """Level 12 uses 'th', not 'nd' (irregular ordinal)."""
        m = SpellSummary.model_validate(_make_spell(level=12))
        assert m.level == "12th"

    def test_ordinal_suffix_13_is_th_not_rd(self) -> None:
        """Level 13 uses 'th', not 'rd' (irregular ordinal)."""
        m = SpellSummary.model_validate(_make_spell(level=13))
        assert m.level == "13th"

    def test_invalid_level_raises(self) -> None:
        """A non-integer, non-None level raises a ValidationError."""
        with pytest.raises(ValidationError, match="Invalid spell level"):
            SpellSummary.model_validate(_make_spell(level="bad"))

    def test_camel_case_output(self) -> None:
        """model_dump(by_alias=True) produces camelCase keys."""
        m = SpellSummary.model_validate(_make_spell())
        dumped = m.model_dump(by_alias=True)
        assert "slug" in dumped
        assert "name" in dumped
        assert "level" in dumped
        assert "school" in dumped

    def test_school_accepts_none(self) -> None:
        """school is nullable."""
        m = SpellSummary.model_validate(_make_spell(school=None))
        assert m.school is None


# ---------------------------------------------------------------------------
# SpellDetail schema tests
# ---------------------------------------------------------------------------


class TestSpellDetailSchema:
    """Unit tests for SpellDetail Pydantic schema."""

    def test_exposes_content_blob(self) -> None:
        """SpellDetail validates content into the typed model."""
        m = SpellDetail.model_validate(_make_spell())
        assert m.content.name == "Fireball"
        assert m.content.level == 3
        # Unknown SRD fields (e.g. `index`) pass through via extra='allow'.
        assert getattr(m.content, "index", None) == "fireball"

    def test_exposes_content_source(self) -> None:
        """SpellDetail includes content_source attribution metadata."""
        m = SpellDetail.model_validate(_make_spell())
        assert m.content_source.model_dump() == SRD_CONTENT_SOURCE_FIXTURE

    def test_content_source_serializes_to_camel_case(self) -> None:
        """content_source appears as contentSource in JSON output."""
        m = SpellDetail.model_validate(_make_spell())
        dumped = m.model_dump(by_alias=True)
        assert "contentSource" in dumped
        assert "content_source" not in dumped

    def test_inherits_all_summary_fields(self) -> None:
        """SpellDetail is a strict superset of SpellSummary fields."""
        m = SpellDetail.model_validate(_make_spell())
        assert m.slug == "fireball"
        assert m.name == "Fireball"
        assert m.level == "3rd"
        assert m.school == "evocation"


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
async def spells_client(
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
    spells: list[Any],
    total: int,
) -> None:
    """Configure mock_session to satisfy a list_spells query.

    list_spells calls session.scalar() once for the total count and
    session.execute() once for the page of rows.
    """
    mock_session.scalar.return_value = total
    mock_result = MagicMock()
    mock_result.scalars.return_value = spells
    mock_session.execute.return_value = mock_result


# ---------------------------------------------------------------------------
# List endpoint tests
# ---------------------------------------------------------------------------


class TestListSpellsEndpoint:
    """Integration-style tests for GET /v1/spells."""

    async def test_returns_200(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Baseline: endpoint returns HTTP 200."""
        _setup_list_session(mock_session, [], 0)
        response = await spells_client.get("/v1/spells")
        assert response.status_code == 200

    async def test_response_has_metadata_and_data_keys(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Top-level response envelope contains 'metadata' and 'data'."""
        _setup_list_session(mock_session, [], 0)
        body = (await spells_client.get("/v1/spells")).json()
        assert "metadata" in body
        assert "data" in body

    async def test_metadata_resultset_contains_pagination_fields(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """metadata.resultset exposes count, limit, and offset."""
        _setup_list_session(mock_session, [], 0)
        body = (await spells_client.get("/v1/spells")).json()
        resultset = body["metadata"]["resultset"]
        assert "count" in resultset
        assert "limit" in resultset
        assert "offset" in resultset

    async def test_count_reflects_total_not_page_size(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """metadata.resultset.count is the full total, not the page length."""
        _setup_list_session(mock_session, [_make_spell()], 99)
        body = (await spells_client.get("/v1/spells?limit=1")).json()
        assert body["metadata"]["resultset"]["count"] == 99
        assert body["metadata"]["resultset"]["limit"] == 1

    async def test_empty_resultset(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Empty results return count=0 and data=[]."""
        _setup_list_session(mock_session, [], 0)
        body = (await spells_client.get("/v1/spells")).json()
        assert body["data"] == []
        assert body["metadata"]["resultset"]["count"] == 0

    async def test_level_formatted_in_list_items(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Level field in list items is a display string, not a raw integer."""
        _setup_list_session(mock_session, [_make_spell(level=3)], 1)
        body = (await spells_client.get("/v1/spells")).json()
        assert body["data"][0]["level"] == "3rd"

    async def test_cantrip_level_formatted_in_list_items(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Level 0 displays as 'Cantrip' in list items."""
        _setup_list_session(mock_session, [_make_spell(level=0)], 1)
        body = (await spells_client.get("/v1/spells")).json()
        assert body["data"][0]["level"] == "Cantrip"

    async def test_offset_echoed_in_metadata(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Requested offset is reflected back in pagination metadata."""
        _setup_list_session(mock_session, [], 5)
        body = (await spells_client.get("/v1/spells?offset=4")).json()
        assert body["metadata"]["resultset"]["offset"] == 4

    async def test_limit_zero_returns_422(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """limit=0 is below the minimum and returns 422."""
        response = await spells_client.get("/v1/spells?limit=0")
        assert response.status_code == 422
        assert response.json()["errorCode"] == "VALIDATION_ERROR"

    async def test_limit_over_maximum_returns_422(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """limit > 100 exceeds the maximum and returns 422."""
        response = await spells_client.get("/v1/spells?limit=101")
        assert response.status_code == 422

    async def test_negative_offset_returns_422(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Negative offset fails validation and returns 422."""
        response = await spells_client.get("/v1/spells?offset=-1")
        assert response.status_code == 422

    async def test_level_min_above_9_returns_422(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """level_min > 9 exceeds the constraint and returns 422."""
        response = await spells_client.get("/v1/spells?level_min=10")
        assert response.status_code == 422

    async def test_level_max_above_9_returns_422(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """level_max > 9 exceeds the constraint and returns 422."""
        response = await spells_client.get("/v1/spells?level_max=10")
        assert response.status_code == 422

    async def test_non_numeric_level_min_returns_422(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Non-numeric level_min fails coercion and returns 422."""
        response = await spells_client.get("/v1/spells?level_min=fireball")
        assert response.status_code == 422

    async def test_422_uses_app_error_format_not_fastapi_detail(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """422 body uses ErrorResponse shape, not FastAPI's 'detail' array."""
        response = await spells_client.get("/v1/spells?limit=0")
        body = response.json()
        assert "detail" not in body
        assert "errorCode" in body
        assert "developerMessage" in body


# ---------------------------------------------------------------------------
# Detail endpoint tests
# ---------------------------------------------------------------------------


class TestGetSpellEndpoint:
    """Integration-style tests for GET /v1/spells/{slug}."""

    async def test_returns_200_for_existing_slug(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Baseline: known slug returns HTTP 200."""
        mock_session.scalar.return_value = _make_spell()
        response = await spells_client.get("/v1/spells/fireball")
        assert response.status_code == 200

    async def test_response_includes_content_fields(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Detail response includes content and contentSource (camelCase)."""
        mock_session.scalar.return_value = _make_spell()
        body = (await spells_client.get("/v1/spells/fireball")).json()
        assert "content" in body
        assert "contentSource" in body
        assert "content_source" not in body

    async def test_response_includes_all_summary_fields(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Detail response is a superset of the list item shape."""
        mock_session.scalar.return_value = _make_spell()
        body = (await spells_client.get("/v1/spells/fireball")).json()
        assert "slug" in body
        assert "name" in body
        assert "level" in body
        assert "school" in body

    async def test_level_is_formatted_in_detail(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Level is returned as a display string, not a raw integer."""
        mock_session.scalar.return_value = _make_spell(level=1)
        body = (await spells_client.get("/v1/spells/cure-wounds")).json()
        assert body["level"] == "1st"

    async def test_missing_slug_returns_404(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Unknown slug returns HTTP 404."""
        mock_session.scalar.return_value = None
        response = await spells_client.get("/v1/spells/does-not-exist")
        assert response.status_code == 404

    async def test_404_body_uses_app_error_shape(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """404 body contains all ErrorResponse fields in camelCase."""
        mock_session.scalar.return_value = None
        body = (await spells_client.get("/v1/spells/fireball")).json()
        assert body["status"] == 404
        assert body["errorCode"] == "RESOURCE_NOT_FOUND"
        assert "developerMessage" in body
        assert "userMessage" in body
        assert "moreInfo" in body

    async def test_404_identifier_includes_namespace(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """404 developerMessage includes the full namespace:slug identifier."""
        mock_session.scalar.return_value = None
        body = (await spells_client.get("/v1/spells/fireball")).json()
        assert "srd-5.1:fireball" in body["developerMessage"]

    async def test_404_does_not_use_fastapi_detail_shape(
        self, spells_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """404 response does not include FastAPI's default 'detail' key."""
        mock_session.scalar.return_value = None
        body = (await spells_client.get("/v1/spells/missing")).json()
        assert "detail" not in body
