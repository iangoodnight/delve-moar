"""Tests for the ordering_dep factory and order_by behaviour on list routes.

ordering_dep tests call the inner dependency function directly -- no HTTP
server needed. Route-level tests use the mocked session fixture pattern
established in test_monsters.py.
"""

from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.db import get_session
from app.dependencies import ordering_dep
from app.exceptions import AppError
from app.main import app
from app.models import Monster

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_dep(columns: dict[str, Any], default: str = "name:asc") -> Any:
    """Return the inner dependency callable produced by ordering_dep."""
    return ordering_dep(columns=columns, default=default)


def _call(dep: Any, order_by: str | None = None) -> list[Any]:
    """Invoke the inner dependency function synchronously."""
    return dep(order_by=order_by)


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
# Default ordering behaviour
# ---------------------------------------------------------------------------


class TestOrderingDepDefaults:
    """Verify fallback ordering when order_by is omitted."""

    def test_single_default_column_returns_one_expression(self) -> None:
        """A single-column default produces one ordering expression."""
        dep = _make_dep({"name": Monster.name}, default="name:asc")
        result = _call(dep)
        assert len(result) == 1

    def test_multi_column_default_returns_multiple_expressions(self) -> None:
        """A two-column default produces two ordering expressions."""
        dep = _make_dep(
            {
                "challenge_rating": Monster.challenge_rating,
                "name": Monster.name,
            },
            default="challenge_rating:asc,name:asc",
        )
        result = _call(dep)
        assert len(result) == 2

    def test_default_used_when_order_by_is_none(self) -> None:
        """Passing order_by=None falls back to the factory default."""
        dep = _make_dep({"name": Monster.name}, default="name:asc")
        result = _call(dep, order_by=None)
        assert len(result) == 1

    def test_default_used_when_order_by_is_empty_string(self) -> None:
        """An empty order_by string falls back to the factory default."""
        dep = _make_dep({"name": Monster.name}, default="name:asc")
        result = _call(dep, order_by="")
        assert len(result) == 1


# ---------------------------------------------------------------------------
# Parsing the order_by string
# ---------------------------------------------------------------------------


class TestOrderingDepParsing:
    """Verify correct parsing of the order_by query string."""

    def test_single_column_asc(self) -> None:
        """'name:asc' is accepted and returns one expression."""
        dep = _make_dep({"name": Monster.name})
        result = _call(dep, order_by="name:asc")
        assert len(result) == 1

    def test_single_column_desc(self) -> None:
        """'name:desc' is accepted and returns one expression."""
        dep = _make_dep({"name": Monster.name})
        result = _call(dep, order_by="name:desc")
        assert len(result) == 1

    def test_direction_is_case_insensitive(self) -> None:
        """Direction 'ASC' and 'DESC' are treated the same as lowercase."""
        dep = _make_dep({"name": Monster.name})
        assert len(_call(dep, order_by="name:ASC")) == 1
        assert len(_call(dep, order_by="name:DESC")) == 1

    def test_omitted_direction_defaults_to_asc(self) -> None:
        """'name' without a colon is treated as 'name:asc'."""
        dep = _make_dep({"name": Monster.name})
        result = _call(dep, order_by="name")
        assert len(result) == 1

    def test_multiple_columns_comma_separated(self) -> None:
        """Two comma-separated tokens produce two expressions."""
        dep = _make_dep(
            {
                "challenge_rating": Monster.challenge_rating,
                "name": Monster.name,
            }
        )
        result = _call(dep, order_by="challenge_rating:asc,name:asc")
        assert len(result) == 2

    def test_whitespace_around_tokens_is_stripped(self) -> None:
        """Extra spaces around column names and directions are ignored."""
        dep = _make_dep({"name": Monster.name})
        result = _call(dep, order_by=" name : asc ")
        assert len(result) == 1


# ---------------------------------------------------------------------------
# Validation error cases
# ---------------------------------------------------------------------------


class TestOrderingDepValidation:
    """Verify 422 AppError is raised for invalid inputs."""

    def test_unknown_column_raises_app_error(self) -> None:
        """An unrecognised column name raises AppError with status 422."""
        dep = _make_dep({"name": Monster.name})
        with pytest.raises(AppError) as exc_info:
            _call(dep, order_by="bogus:asc")
        assert exc_info.value.status == 422
        assert exc_info.value.error_code == "VALIDATION_ERROR"

    def test_unknown_column_message_names_the_bad_column(self) -> None:
        """The developer message includes the rejected column name."""
        dep = _make_dep({"name": Monster.name})
        with pytest.raises(AppError) as exc_info:
            _call(dep, order_by="bogus:asc")
        assert "bogus" in exc_info.value.developer_message

    def test_invalid_direction_raises_app_error(self) -> None:
        """An unrecognised direction raises AppError with status 422."""
        dep = _make_dep({"name": Monster.name})
        with pytest.raises(AppError) as exc_info:
            _call(dep, order_by="name:sideways")
        assert exc_info.value.status == 422
        assert exc_info.value.error_code == "VALIDATION_ERROR"

    def test_invalid_direction_message_names_the_bad_value(self) -> None:
        """The developer message includes the rejected direction value."""
        dep = _make_dep({"name": Monster.name})
        with pytest.raises(AppError) as exc_info:
            _call(dep, order_by="name:sideways")
        assert "sideways" in exc_info.value.developer_message

    def test_second_column_invalid_still_raises(self) -> None:
        """Validation applies to every token, not just the first."""
        dep = _make_dep(
            {"challenge_rating": Monster.challenge_rating, "name": Monster.name}
        )
        with pytest.raises(AppError):
            _call(dep, order_by="name:asc,bogus:asc")


# ---------------------------------------------------------------------------
# Route-level: order_by param wired into list endpoints
# ---------------------------------------------------------------------------


class TestOrderByOnRoutes:
    """Verify order_by is accepted and invalid values return 422."""

    async def test_valid_order_by_returns_200(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """A recognised column:direction pair returns 200."""
        response = await monsters_client.get("/v1/monsters?order_by=name:asc")
        assert response.status_code == 200

    async def test_multi_column_order_by_returns_200(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Multiple comma-separated columns return 200."""
        response = await monsters_client.get(
            "/v1/monsters?order_by=challenge_rating:asc,name:desc"
        )
        assert response.status_code == 200

    async def test_omitting_order_by_returns_200(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """Omitting order_by uses the default and returns 200."""
        response = await monsters_client.get("/v1/monsters")
        assert response.status_code == 200

    async def test_unknown_column_returns_422(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """An unknown order_by column returns 422 with app error shape."""
        response = await monsters_client.get(
            "/v1/monsters?order_by=hit_points:asc"
        )
        assert response.status_code == 422
        body = response.json()
        assert body["errorCode"] == "VALIDATION_ERROR"
        assert "detail" not in body

    async def test_invalid_direction_returns_422(
        self, monsters_client: AsyncClient, mock_session: MagicMock
    ) -> None:
        """An invalid direction in order_by returns 422."""
        response = await monsters_client.get(
            "/v1/monsters?order_by=name:random"
        )
        assert response.status_code == 422
        assert response.json()["errorCode"] == "VALIDATION_ERROR"

    @pytest.mark.parametrize(
        "path",
        [
            "/v1/monsters?order_by=name:asc",
            "/v1/spells?order_by=level:desc",
            "/v1/items?order_by=rarity:asc",
        ],
    )
    async def test_order_by_accepted_on_all_list_endpoints(
        self, path: str, mock_session: MagicMock
    ) -> None:
        """order_by is wired up on monsters, spells, and items."""

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
