"""Tests for monster schemas and list/detail API endpoints.

Schema tests exercise Pydantic validation and serialization in isolation
(no HTTP, no DB). Route tests use a mocked AsyncSession injected via
FastAPI's dependency_overrides so they run without a live database.
"""

from collections.abc import AsyncGenerator
from decimal import Decimal
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.db import get_session
from app.main import app
from app.schemas.monsters import MonsterDetail, MonsterSummary

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _make_monster(**overrides: Any) -> SimpleNamespace:
    """Return a SimpleNamespace that mirrors a Monster ORM row.

    Uses SimpleNamespace so that Pydantic's from_attributes mode can read
    fields via getattr without needing a live SQLAlchemy session.
    """
    defaults: dict[str, Any] = {
        "slug": "goblin",
        "source_namespace": "srd-5.1",
        "name": "Goblin",
        "monster_type": "humanoid",
        "challenge_rating": Decimal("0.25"),
        "content": {"index": "goblin", "name": "Goblin", "size": "Small"},
        "content_source": {"type": "srd", "license": "CC BY 4.0"},
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# ---------------------------------------------------------------------------
# MonsterSummary schema tests
# ---------------------------------------------------------------------------


class TestMonsterSummarySchema:
    """Unit tests for MonsterSummary Pydantic schema."""

    def test_cr_one_half_formats_as_fraction(self) -> None:
        """CR 0.5 displays as '1/2'."""
        m = MonsterSummary.model_validate(
            _make_monster(challenge_rating=Decimal("0.5"))
        )
        assert m.challenge_rating == "1/2"

    def test_cr_one_quarter_formats_as_fraction(self) -> None:
        """CR 0.25 displays as '1/4'."""
        m = MonsterSummary.model_validate(
            _make_monster(challenge_rating=Decimal("0.25"))
        )
        assert m.challenge_rating == "1/4"

    def test_cr_one_eighth_formats_as_fraction(self) -> None:
        """CR 0.125 displays as '1/8'."""
        m = MonsterSummary.model_validate(
            _make_monster(challenge_rating=Decimal("0.125"))
        )
        assert m.challenge_rating == "1/8"

    def test_cr_integer_strips_decimal_point(self) -> None:
        """CR 5.0 displays as '5', not '5.0'."""
        m = MonsterSummary.model_validate(
            _make_monster(challenge_rating=Decimal("5"))
        )
        assert m.challenge_rating == "5"

    def test_cr_zero_displays_as_zero(self) -> None:
        """CR 0 (e.g. Awakened Shrub) displays as '0', not '0.0'."""
        m = MonsterSummary.model_validate(
            _make_monster(challenge_rating=Decimal("0"))
        )
        assert m.challenge_rating == "0"

    def test_cr_none_displays_as_unknown(self) -> None:
        """None CR displays as 'Unknown' (homebrew may omit it)."""
        m = MonsterSummary.model_validate(_make_monster(challenge_rating=None))
        assert m.challenge_rating == "Unknown"

    def test_cr_non_standard_decimal_preserved(self) -> None:
        """CR 2.5 (not a standard SRD fraction) displays as '2.5'."""
        m = MonsterSummary.model_validate(
            _make_monster(challenge_rating=Decimal("2.5"))
        )
        assert m.challenge_rating == "2.5"

    def test_camel_case_output(self) -> None:
        """model_dump(by_alias=True) produces camelCase keys."""
        m = MonsterSummary.model_validate(_make_monster())
        dumped = m.model_dump(by_alias=True)
        assert "challengeRating" in dumped
        assert "monsterType" in dumped
        assert "challenge_rating" not in dumped
        assert "monster_type" not in dumped

    def test_monster_type_accepts_none(self) -> None:
        """monster_type is nullable (homebrew content may omit it)."""
        m = MonsterSummary.model_validate(_make_monster(monster_type=None))
        assert m.monster_type is None


# ---------------------------------------------------------------------------
# MonsterDetail schema tests
# ---------------------------------------------------------------------------


class TestMonsterDetailSchema:
    """Unit tests for MonsterDetail Pydantic schema."""

    def test_exposes_content_blob(self) -> None:
        """MonsterDetail includes the raw content dict."""
        m = MonsterDetail.model_validate(_make_monster())
        assert m.content == {
            "index": "goblin",
            "name": "Goblin",
            "size": "Small",
        }

    def test_exposes_content_source(self) -> None:
        """MonsterDetail includes content_source attribution metadata."""
        m = MonsterDetail.model_validate(_make_monster())
        assert m.content_source == {"type": "srd", "license": "CC BY 4.0"}

    def test_content_source_serializes_to_camel_case(self) -> None:
        """content_source appears as contentSource in JSON output."""
        m = MonsterDetail.model_validate(_make_monster())
        dumped = m.model_dump(by_alias=True)
        assert "contentSource" in dumped
        assert "content_source" not in dumped

    def test_inherits_all_summary_fields(self) -> None:
        """MonsterDetail is a strict superset of MonsterSummary fields."""
        m = MonsterDetail.model_validate(_make_monster())
        assert m.slug == "goblin"
        assert m.name == "Goblin"
        assert m.challenge_rating == "1/4"
        assert m.monster_type == "humanoid"


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
async def monsters_client(
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
    monsters: list[Any],
    total: int,
) -> None:
    """Configure mock_session to satisfy a list_monsters query.

    list_monsters calls session.scalar() once for the total count and
    session.execute() once for the page of rows.
    """
    mock_session.scalar.return_value = total
    mock_result = MagicMock()
    mock_result.scalars.return_value = monsters
    mock_session.execute.return_value = mock_result


# ---------------------------------------------------------------------------
# List endpoint tests
# ---------------------------------------------------------------------------


class TestListMonstersEndpoint:
    """Integration-style tests for GET /v1/monsters."""

    async def test_returns_200(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Baseline: endpoint returns HTTP 200."""
        _setup_list_session(mock_session, [], 0)
        response = await monsters_client.get("/v1/monsters")
        assert response.status_code == 200

    async def test_response_has_metadata_and_data_keys(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Top-level response envelope contains 'metadata' and 'data'."""
        _setup_list_session(mock_session, [], 0)
        body = (await monsters_client.get("/v1/monsters")).json()
        assert "metadata" in body
        assert "data" in body

    async def test_metadata_resultset_contains_pagination_fields(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """metadata.resultset exposes count, limit, and offset."""
        _setup_list_session(mock_session, [], 0)
        body = (await monsters_client.get("/v1/monsters")).json()
        resultset = body["metadata"]["resultset"]
        assert "count" in resultset
        assert "limit" in resultset
        assert "offset" in resultset

    async def test_count_reflects_total_not_page_size(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """metadata.resultset.count is the full total, not the page length."""
        _setup_list_session(mock_session, [_make_monster()], 42)
        body = (await monsters_client.get("/v1/monsters?limit=1")).json()
        assert body["metadata"]["resultset"]["count"] == 42
        assert body["metadata"]["resultset"]["limit"] == 1

    async def test_empty_resultset(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Empty results return count=0 and data=[]."""
        _setup_list_session(mock_session, [], 0)
        body = (await monsters_client.get("/v1/monsters")).json()
        assert body["data"] == []
        assert body["metadata"]["resultset"]["count"] == 0

    async def test_data_items_use_camel_case_keys(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Each item in the data array uses camelCase field names."""
        _setup_list_session(mock_session, [_make_monster()], 1)
        body = (await monsters_client.get("/v1/monsters")).json()
        item = body["data"][0]
        assert "challengeRating" in item
        assert "monsterType" in item
        assert "challenge_rating" not in item
        assert "monster_type" not in item

    async def test_offset_echoed_in_metadata(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Requested offset is reflected back in pagination metadata."""
        _setup_list_session(mock_session, [], 5)
        body = (await monsters_client.get("/v1/monsters?offset=3")).json()
        assert body["metadata"]["resultset"]["offset"] == 3

    async def test_limit_zero_returns_422(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """limit=0 is below the minimum and returns 422."""
        response = await monsters_client.get("/v1/monsters?limit=0")
        assert response.status_code == 422
        assert response.json()["errorCode"] == "VALIDATION_ERROR"

    async def test_limit_over_maximum_returns_422(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """limit > 100 exceeds the maximum and returns 422."""
        response = await monsters_client.get("/v1/monsters?limit=101")
        assert response.status_code == 422

    async def test_negative_offset_returns_422(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Negative offset fails validation and returns 422."""
        response = await monsters_client.get("/v1/monsters?offset=-1")
        assert response.status_code == 422

    async def test_non_numeric_cr_min_returns_422(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Non-numeric cr_min fails coercion and returns 422."""
        response = await monsters_client.get("/v1/monsters?cr_min=dragon")
        assert response.status_code == 422

    async def test_422_uses_app_error_format_not_fastapi_detail(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """422 body uses ErrorResponse shape, not FastAPI's 'detail' array."""
        response = await monsters_client.get("/v1/monsters?limit=0")
        body = response.json()
        assert "detail" not in body
        assert "errorCode" in body
        assert "developerMessage" in body


# ---------------------------------------------------------------------------
# Detail endpoint tests
# ---------------------------------------------------------------------------


class TestGetMonsterEndpoint:
    """Integration-style tests for GET /v1/monsters/{slug}."""

    async def test_returns_200_for_existing_slug(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Baseline: known slug returns HTTP 200."""
        mock_session.scalar.return_value = _make_monster()
        response = await monsters_client.get("/v1/monsters/goblin")
        assert response.status_code == 200

    async def test_response_includes_content_fields(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Detail response includes content and contentSource (camelCase)."""
        mock_session.scalar.return_value = _make_monster()
        body = (await monsters_client.get("/v1/monsters/goblin")).json()
        assert "content" in body
        assert "contentSource" in body
        assert "content_source" not in body

    async def test_response_includes_all_summary_fields(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Detail response is a superset of the list item shape."""
        mock_session.scalar.return_value = _make_monster()
        body = (await monsters_client.get("/v1/monsters/goblin")).json()
        assert "slug" in body
        assert "name" in body
        assert "challengeRating" in body
        assert "monsterType" in body

    async def test_challenge_rating_is_formatted_in_detail(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """challengeRating is a display string, not a raw decimal."""
        mock_session.scalar.return_value = _make_monster(
            challenge_rating=Decimal("0.5")
        )
        body = (await monsters_client.get("/v1/monsters/something")).json()
        assert body["challengeRating"] == "1/2"

    async def test_missing_slug_returns_404(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Unknown slug returns HTTP 404."""
        mock_session.scalar.return_value = None
        response = await monsters_client.get("/v1/monsters/does-not-exist")
        assert response.status_code == 404

    async def test_404_body_uses_app_error_shape(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """404 body contains all ErrorResponse fields in camelCase."""
        mock_session.scalar.return_value = None
        body = (await monsters_client.get("/v1/monsters/tarrasque")).json()
        assert body["status"] == 404
        assert body["errorCode"] == "RESOURCE_NOT_FOUND"
        assert "developerMessage" in body
        assert "userMessage" in body
        assert "moreInfo" in body

    async def test_404_does_not_use_fastapi_detail_shape(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """404 response does not include FastAPI's default 'detail' key."""
        mock_session.scalar.return_value = None
        body = (await monsters_client.get("/v1/monsters/missing")).json()
        assert "detail" not in body
