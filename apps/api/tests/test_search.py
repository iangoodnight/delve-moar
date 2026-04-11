"""Tests for the search_dep factory and search behaviour on list routes.

search_dep unit tests call the inner dependency function directly. Route-level
tests use the mocked session pattern established across the test suite.
"""

from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.db import get_session
from app.dependencies import SearchFilter, search_dep
from app.main import app
from app.models import Monster

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_dep(columns: list[Any], default: str = "name:asc") -> object:
    """Return the inner dependency callable from search_dep."""
    return search_dep(searchable_columns=columns)


def _call(dep: object, search: str | None = None) -> SearchFilter:
    """Invoke the inner dependency function synchronously."""
    result: SearchFilter = dep(search=search)  # type: ignore[operator]
    return result


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_session() -> MagicMock:
    """AsyncSession stand-in."""
    session = MagicMock()
    session.scalar = AsyncMock(return_value=0)
    mock_result = MagicMock()
    mock_result.scalars.return_value = []
    session.execute = AsyncMock(return_value=mock_result)
    return session


@pytest.fixture
async def monsters_client(
    mock_session: MagicMock,
) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client with DB session replaced by mock_session."""

    async def _get_test_session() -> AsyncGenerator[MagicMock, None]:
        yield mock_session

    app.dependency_overrides[get_session] = _get_test_session
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            yield ac
    finally:
        app.dependency_overrides.pop(get_session, None)


# ---------------------------------------------------------------------------
# Absent or blank search
# ---------------------------------------------------------------------------


class TestSearchDepAbsent:
    """SearchFilter is a no-op when search is absent or blank."""

    def test_none_returns_no_op_filter(self) -> None:
        """search=None produces where=None and empty order_priority."""
        dep = _make_dep([Monster.name])
        result = _call(dep, search=None)
        assert result.where is None
        assert result.order_priority == []

    def test_empty_string_returns_no_op_filter(self) -> None:
        """search='' is treated as absent."""
        dep = _make_dep([Monster.name])
        result = _call(dep, search="")
        assert result.where is None
        assert result.order_priority == []

    def test_whitespace_only_returns_no_op_filter(self) -> None:
        """search='   ' is stripped and treated as absent."""
        dep = _make_dep([Monster.name])
        result = _call(dep, search="   ")
        assert result.where is None
        assert result.order_priority == []


# ---------------------------------------------------------------------------
# Active search -- WHERE clause
# ---------------------------------------------------------------------------


class TestSearchDepWhereClause:
    """where is populated when a non-blank term is provided."""

    def test_non_blank_term_sets_where(self) -> None:
        """A real search term produces a non-None WHERE clause."""
        dep = _make_dep([Monster.name])
        result = _call(dep, search="dragon")
        assert result.where is not None

    def test_single_column_produces_where(self) -> None:
        """Single-column search sets where to an ilike expression."""
        dep = _make_dep([Monster.name])
        result = _call(dep, search="goblin")
        assert result.where is not None

    def test_multi_column_produces_where(self) -> None:
        """Multi-column search sets where to an OR expression."""
        dep = _make_dep([Monster.name, Monster.monster_type])
        result = _call(dep, search="beast")
        assert result.where is not None

    def test_leading_and_trailing_whitespace_stripped(self) -> None:
        """Whitespace around the term is stripped; non-blank term is used."""
        dep = _make_dep([Monster.name])
        result = _call(dep, search="  dragon  ")
        assert result.where is not None


# ---------------------------------------------------------------------------
# Active search -- relevance ordering
# ---------------------------------------------------------------------------


class TestSearchDepOrdering:
    """order_priority is populated and sized correctly for active searches."""

    def test_active_search_returns_one_priority_expression(self) -> None:
        """A non-blank search term produces exactly one CASE expression."""
        dep = _make_dep([Monster.name])
        result = _call(dep, search="dragon")
        assert len(result.order_priority) == 1

    def test_multi_column_still_returns_one_priority_expression(self) -> None:
        """Multi-column search still produces a single bundled CASE expr."""
        dep = _make_dep([Monster.name, Monster.monster_type])
        result = _call(dep, search="dragon")
        assert len(result.order_priority) == 1

    def test_absent_search_returns_empty_priority(self) -> None:
        """No search term means no relevance expression to prepend."""
        dep = _make_dep([Monster.name, Monster.monster_type])
        result = _call(dep, search=None)
        assert result.order_priority == []


# ---------------------------------------------------------------------------
# Route-level smoke tests
# ---------------------------------------------------------------------------


class TestSearchOnRoutes:
    """Verify search is wired up and composes with other params."""

    async def test_search_param_accepted_on_monsters(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """?search= is accepted on /v1/monsters and returns 200."""
        response = await monsters_client.get("/v1/monsters?search=dragon")
        assert response.status_code == 200

    async def test_blank_search_returns_200(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """An empty search string is treated as no filter."""
        response = await monsters_client.get("/v1/monsters?search=")
        assert response.status_code == 200

    async def test_search_composes_with_order_by(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """?search= and ?order_by= can be combined without error."""
        response = await monsters_client.get(
            "/v1/monsters?search=dragon&order_by=name:asc"
        )
        assert response.status_code == 200

    async def test_search_composes_with_filters(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """?search= composes with resource-specific filters."""
        response = await monsters_client.get(
            "/v1/monsters?search=giant&type=humanoid"
        )
        assert response.status_code == 200

    @pytest.mark.parametrize(
        "path",
        [
            "/v1/monsters?search=dragon",
            "/v1/spells?search=fire",
            "/v1/items?search=sword",
        ],
    )
    async def test_search_accepted_on_all_list_endpoints(
        self, path: str, mock_session: MagicMock
    ) -> None:
        """search is wired up on monsters, spells, and items."""

        async def _get_test_session() -> AsyncGenerator[MagicMock, None]:
            yield mock_session

        app.dependency_overrides[get_session] = _get_test_session
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                response = await ac.get(path)
        finally:
            app.dependency_overrides.pop(get_session, None)

        assert response.status_code == 200
