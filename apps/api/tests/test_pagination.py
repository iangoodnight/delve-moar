"""Tests for pagination utilities: build_links and paginate.

build_links is tested in isolation using a minimal Starlette Request built
from a fabricated ASGI scope -- no HTTP server, no DB, no FastAPI app.
"""

from urllib.parse import parse_qs, urlparse

import pytest
from starlette.requests import Request

from app.utils import build_links

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_request(path: str, params: dict[str, str]) -> Request:
    """Build a minimal Starlette Request for build_links testing.

    Constructs an ASGI HTTP scope with the given path and query parameters.
    No connection is established -- the object is used only to read URL
    components.

    Args:
        path: The URL path (e.g. '/v1/monsters').
        params: Query parameters as a flat string-to-string dict.

    Returns:
        A Starlette ``Request`` instance with the given path and params.
    """
    from urllib.parse import urlencode

    qs = urlencode(params).encode()
    scope = {
        "type": "http",
        "method": "GET",
        "path": path,
        "query_string": qs,
        "headers": [],
    }
    return Request(scope)


def _parse_qs(url: str) -> dict[str, str]:
    """Return query params from a URL as a flat string-to-string dict."""
    return {k: v[0] for k, v in parse_qs(urlparse(url).query).items()}


# ---------------------------------------------------------------------------
# build_links: boundary conditions
# ---------------------------------------------------------------------------


class TestBuildLinksNull:
    """Ensure prev/next are null at the correct page boundaries."""

    def test_prev_is_null_on_first_page(self) -> None:
        """prev is null when offset == 0 (no earlier page exists)."""
        request = _make_request("/v1/monsters", {"limit": "20"})
        links = build_links(request, count=100, offset=0, limit=20)
        assert links.prev is None

    def test_next_is_null_on_last_page(self) -> None:
        """next is null when offset + limit >= count."""
        request = _make_request("/v1/monsters", {"limit": "20"})
        links = build_links(request, count=40, offset=20, limit=20)
        assert links.next is None

    def test_next_is_null_when_page_overshoots_count(self) -> None:
        """next is null even if the page extends past the last record."""
        request = _make_request("/v1/monsters", {"limit": "20"})
        links = build_links(request, count=35, offset=20, limit=20)
        assert links.next is None

    def test_both_null_on_single_page_resultset(self) -> None:
        """Both links are null when the entire resultset fits one page."""
        request = _make_request("/v1/monsters", {"limit": "20"})
        links = build_links(request, count=5, offset=0, limit=20)
        assert links.prev is None
        assert links.next is None

    def test_both_null_on_empty_resultset(self) -> None:
        """Both links are null when there are no results at all."""
        request = _make_request("/v1/monsters", {})
        links = build_links(request, count=0, offset=0, limit=20)
        assert links.prev is None
        assert links.next is None


# ---------------------------------------------------------------------------
# build_links: non-null values
# ---------------------------------------------------------------------------


class TestBuildLinksValues:
    """Verify offset arithmetic and URL construction for non-null links."""

    def test_next_is_non_null_on_first_of_many_pages(self) -> None:
        """next is non-null when there are more records after this page."""
        request = _make_request("/v1/monsters", {"limit": "20"})
        links = build_links(request, count=100, offset=0, limit=20)
        assert links.next is not None

    def test_prev_is_non_null_on_second_page(self) -> None:
        """prev is non-null when the client is not on the first page."""
        request = _make_request("/v1/monsters", {"limit": "20", "offset": "20"})
        links = build_links(request, count=100, offset=20, limit=20)
        assert links.prev is not None

    def test_both_non_null_on_middle_page(self) -> None:
        """Both links are non-null for a page in the middle of the set."""
        request = _make_request("/v1/monsters", {"limit": "20", "offset": "20"})
        links = build_links(request, count=100, offset=20, limit=20)
        assert links.prev is not None
        assert links.next is not None

    def test_next_offset_advances_by_limit(self) -> None:
        """next URL offset = current offset + limit."""
        request = _make_request("/v1/monsters", {"limit": "20", "offset": "20"})
        links = build_links(request, count=100, offset=20, limit=20)
        assert links.next is not None
        assert _parse_qs(links.next)["offset"] == "40"

    def test_prev_offset_retreats_by_limit(self) -> None:
        """prev URL offset = current offset - limit."""
        request = _make_request("/v1/monsters", {"limit": "20", "offset": "40"})
        links = build_links(request, count=100, offset=40, limit=20)
        assert links.prev is not None
        assert _parse_qs(links.prev)["offset"] == "20"

    def test_prev_offset_clamps_to_zero(self) -> None:
        """prev offset is max(0, offset - limit), never negative."""
        request = _make_request("/v1/monsters", {"limit": "20", "offset": "10"})
        links = build_links(request, count=100, offset=10, limit=20)
        assert links.prev is not None
        assert _parse_qs(links.prev)["offset"] == "0"

    def test_links_use_public_url_as_base(self) -> None:
        """Links are absolute URLs, not relative paths."""
        request = _make_request("/v1/monsters", {"limit": "20"})
        links = build_links(request, count=100, offset=0, limit=20)
        assert links.next is not None
        assert links.next.startswith("http")

    def test_links_include_the_request_path(self) -> None:
        """The resource path from the request is preserved in both links."""
        request = _make_request("/v1/spells", {"limit": "10"})
        links = build_links(request, count=50, offset=10, limit=10)
        assert links.next is not None
        assert links.prev is not None
        assert "/v1/spells" in links.next
        assert "/v1/spells" in links.prev


# ---------------------------------------------------------------------------
# build_links: query param preservation
# ---------------------------------------------------------------------------


class TestBuildLinksQueryParams:
    """All query params except offset must survive unchanged in both links."""

    def test_filter_params_preserved_in_next(self) -> None:
        """Filter parameters are carried through to the next link."""
        request = _make_request(
            "/v1/monsters",
            {"limit": "20", "offset": "0", "type": "undead", "cr_min": "1"},
        )
        links = build_links(request, count=100, offset=0, limit=20)
        assert links.next is not None
        qs = _parse_qs(links.next)
        assert qs["type"] == "undead"
        assert qs["cr_min"] == "1"

    def test_filter_params_preserved_in_prev(self) -> None:
        """Filter parameters are carried through to the prev link."""
        request = _make_request(
            "/v1/monsters",
            {"limit": "20", "offset": "40", "type": "undead"},
        )
        links = build_links(request, count=100, offset=40, limit=20)
        assert links.prev is not None
        qs = _parse_qs(links.prev)
        assert qs["type"] == "undead"

    def test_limit_preserved_in_links(self) -> None:
        """The limit param is preserved unchanged in both links."""
        request = _make_request("/v1/monsters", {"limit": "5", "offset": "5"})
        links = build_links(request, count=50, offset=5, limit=5)
        assert links.next is not None
        assert links.prev is not None
        assert _parse_qs(links.next)["limit"] == "5"
        assert _parse_qs(links.prev)["limit"] == "5"

    def test_search_param_preserved_in_links(self) -> None:
        """A search term is carried through to both links."""
        request = _make_request(
            "/v1/monsters",
            {"search": "dragon", "limit": "10", "offset": "10"},
        )
        links = build_links(request, count=50, offset=10, limit=10)
        assert links.next is not None
        assert links.prev is not None
        assert _parse_qs(links.next)["search"] == "dragon"
        assert _parse_qs(links.prev)["search"] == "dragon"

    def test_only_offset_changes_between_links(self) -> None:
        """prev and next differ only in their offset value."""
        request = _make_request(
            "/v1/monsters",
            {"limit": "10", "offset": "10", "type": "beast"},
        )
        links = build_links(request, count=50, offset=10, limit=10)
        assert links.prev is not None
        assert links.next is not None
        prev_qs = _parse_qs(links.prev)
        next_qs = _parse_qs(links.next)
        # Strip offset to compare everything else
        prev_qs.pop("offset")
        next_qs.pop("offset")
        assert prev_qs == next_qs


# ---------------------------------------------------------------------------
# Route-level: links appear in list responses
# ---------------------------------------------------------------------------


class TestLinksInRouteResponse:
    """Smoke-test that metadata.links is present in all list endpoints."""

    @pytest.mark.parametrize(
        "path", ["/v1/monsters", "/v1/spells", "/v1/items"]
    )
    async def test_list_response_contains_links_key(self, path: str) -> None:
        """metadata.links with prev/next keys is present in list responses."""
        from collections.abc import AsyncGenerator
        from unittest.mock import AsyncMock, MagicMock

        from httpx import ASGITransport, AsyncClient

        from app.db import get_session
        from app.main import app

        mock_session = MagicMock()
        mock_session.scalar = AsyncMock(return_value=0)
        mock_result = MagicMock()
        mock_result.scalars.return_value = []
        mock_session.execute = AsyncMock(return_value=mock_result)

        async def _get_test_session() -> AsyncGenerator[MagicMock, None]:
            yield mock_session

        app.dependency_overrides[get_session] = _get_test_session
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                body = (await ac.get(path)).json()
        finally:
            app.dependency_overrides.pop(get_session, None)

        assert "links" in body["metadata"]
        assert "prev" in body["metadata"]["links"]
        assert "next" in body["metadata"]["links"]
