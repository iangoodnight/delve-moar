from httpx import AsyncClient


async def test_x_robots_tag_header_present(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.headers["x-robots-tag"] == "noindex, nofollow"
