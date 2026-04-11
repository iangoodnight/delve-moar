"""OpenAPI schema compatibility helpers."""

from typing import Any


def _downgrade_nullable(obj: Any) -> Any:
    """Recursively rewrite 3.1 nullable anyOf schemas to 3.0 nullable: true.

    Pydantic v2 represents ``T | None`` fields as::

        anyOf: [{...T schema...}, {type: "null"}]

    OpenAPI 3.0 clients (including oapi-codegen) expect::

        {...T schema..., nullable: true}

    This function walks the schema tree and collapses any ``anyOf`` that
    contains exactly one non-null sub-schema into the flat 3.0 form.

    Args:
        obj: Any node in the OpenAPI schema tree (dict, list, or scalar).

    Returns:
        The transformed node with nullable anyOf patterns collapsed.
    """
    if isinstance(obj, list):
        return [_downgrade_nullable(item) for item in obj]
    if not isinstance(obj, dict):
        return obj
    if "anyOf" in obj:
        non_null = [s for s in obj["anyOf"] if s != {"type": "null"}]
        has_null = len(non_null) < len(obj["anyOf"])
        if has_null and len(non_null) == 1:
            # Flatten: merge the single non-null schema with nullable: true
            # and carry over any sibling keys (e.g. description, title).
            merged: dict[str, Any] = {**non_null[0], "nullable": True}
            for k, v in obj.items():
                if k != "anyOf":
                    merged.setdefault(k, v)
            return _downgrade_nullable(merged)
    return {k: _downgrade_nullable(v) for k, v in obj.items()}


def downgrade_to_openapi_30(schema: dict[str, Any]) -> dict[str, Any]:
    """Convert a FastAPI-generated OpenAPI 3.1 schema to 3.0.3.

    FastAPI + Pydantic v2 emit OpenAPI 3.1 by default.  oapi-codegen does not
    yet support 3.1 (see https://github.com/oapi-codegen/oapi-codegen/issues/373).
    This function rewrites the schema in-place so that the ``/openapi.json``
    endpoint returns a spec that both oapi-codegen and openapi-typescript can
    consume without warnings.

    Args:
        schema: The raw OpenAPI schema dict produced by FastAPI's
            ``app.openapi()`` method.

    Returns:
        The same dict with the version string set to ``"3.0.3"`` and all
        nullable fields rewritten from 3.1 to 3.0 style.
    """
    schema["openapi"] = "3.0.3"
    result: dict[str, Any] = _downgrade_nullable(schema)
    return result
