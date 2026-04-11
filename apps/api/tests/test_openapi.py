"""Tests for the OpenAPI 3.1 -> 3.0.3 schema downgrade utility.

These tests exercise the schema-tree transformation in isolation without
starting an HTTP server or touching the database.
"""

from typing import Any

from app.openapi import (
    _downgrade_nullable,
    _is_null_schema,
    downgrade_to_openapi_30,
)

# ---------------------------------------------------------------------------
# _downgrade_nullable
# ---------------------------------------------------------------------------


class TestDowngradeNullable:
    """Unit tests for the recursive anyOf-nullable rewriter."""

    def test_scalar_passthrough(self) -> None:
        """Non-dict, non-list values are returned unchanged."""
        assert _downgrade_nullable("hello") == "hello"
        assert _downgrade_nullable(42) == 42
        assert _downgrade_nullable(None) is None

    def test_list_recurses(self) -> None:
        """Lists are traversed and each element processed."""
        schema: list[Any] = [
            {"anyOf": [{"type": "string"}, {"type": "null"}]},
            {"type": "integer"},
        ]
        result = _downgrade_nullable(schema)
        assert result[0] == {"type": "string", "nullable": True}
        assert result[1] == {"type": "integer"}

    def test_simple_string_nullable(self) -> None:
        """str | None collapses to {type: string, nullable: true}."""
        schema = {"anyOf": [{"type": "string"}, {"type": "null"}]}
        assert _downgrade_nullable(schema) == {
            "type": "string",
            "nullable": True,
        }

    def test_integer_nullable_with_constraints(self) -> None:
        """int | None with ge/le constraints preserves those constraints."""
        schema = {
            "anyOf": [
                {"type": "integer", "minimum": 0, "maximum": 9},
                {"type": "null"},
            ]
        }
        assert _downgrade_nullable(schema) == {
            "type": "integer",
            "minimum": 0,
            "maximum": 9,
            "nullable": True,
        }

    def test_number_nullable(self) -> None:
        """Decimal | None (rendered as number) collapses correctly."""
        schema = {"anyOf": [{"type": "number"}, {"type": "null"}]}
        assert _downgrade_nullable(schema) == {
            "type": "number",
            "nullable": True,
        }

    def test_sibling_keys_preserved(self) -> None:
        """Keys alongside anyOf (e.g. description, title) are kept."""
        schema = {
            "anyOf": [{"type": "string"}, {"type": "null"}],
            "description": "A search term.",
            "title": "Search",
        }
        result = _downgrade_nullable(schema)
        assert result["type"] == "string"
        assert result["nullable"] is True
        assert result["description"] == "A search term."
        assert result["title"] == "Search"

    def test_sibling_keys_do_not_overwrite_type_schema_keys(self) -> None:
        """Sibling keys do not clobber keys already in the non-null schema."""
        schema = {
            "anyOf": [{"type": "string", "title": "Inner"}, {"type": "null"}],
            "title": "Outer",
        }
        result = _downgrade_nullable(schema)
        # The non-null schema's title wins (setdefault semantics).
        assert result["title"] == "Inner"

    def test_no_anyof_dict_passthrough(self) -> None:
        """Dicts without anyOf are returned with values recursed but intact."""
        schema = {"type": "string", "description": "plain"}
        assert _downgrade_nullable(schema) == {
            "type": "string",
            "description": "plain",
        }

    # --- _is_null_schema ------------------------------------------------

    def test_is_null_schema_exact_match(self) -> None:
        """Exact {type: null} is identified as a null schema."""
        assert _is_null_schema({"type": "null"}) is True

    def test_is_null_schema_with_extra_keys(self) -> None:
        """A null schema with extra fields (e.g. title) is still identified."""
        assert _is_null_schema({"type": "null", "title": "NoneType"}) is True

    def test_is_null_schema_non_null_type(self) -> None:
        """A dict with a non-null type is not a null schema."""
        assert _is_null_schema({"type": "string"}) is False

    def test_is_null_schema_non_dict(self) -> None:
        """Non-dict values are not null schemas."""
        assert _is_null_schema("null") is False
        assert _is_null_schema(None) is False

    # --- multiple non-null branches -------------------------------------

    def test_decimal_nullable_three_way_anyof(self) -> None:
        """Decimal | None generates a 3-branch anyOf; null is removed.

        Pydantic v2 emits number + string-pattern + null for Decimal | None.
        The null branch should be removed and nullable: true hoisted.
        """
        schema = {
            "anyOf": [
                {"type": "number", "minimum": 0.0},
                {"type": "string", "pattern": "^[+-]?\\d*$"},
                {"type": "null"},
            ],
            "title": "Cr Min",
        }
        result = _downgrade_nullable(schema)
        assert result["nullable"] is True
        assert "anyOf" in result
        assert not any(
            s.get("type") == "null"
            for s in result["anyOf"]
            if isinstance(s, dict)
        )
        assert result["title"] == "Cr Min"

    def test_multi_branch_anyof_null_removed_nullable_hoisted(self) -> None:
        """Multiple non-null branches: null removed, nullable hoisted."""
        schema = {
            "anyOf": [
                {"type": "string"},
                {"type": "integer"},
                {"type": "null"},
            ]
        }
        result = _downgrade_nullable(schema)
        assert result["nullable"] is True
        assert len(result["anyOf"]) == 2
        assert not any(
            s.get("type") == "null"
            for s in result["anyOf"]
            if isinstance(s, dict)
        )

    def test_anyof_without_null_left_alone(self) -> None:
        """anyOf with no null branch is not touched."""
        schema = {"anyOf": [{"type": "string"}, {"type": "integer"}]}
        result = _downgrade_nullable(schema)
        assert "anyOf" in result
        assert "nullable" not in result

    def test_nested_schemas_are_recursed(self) -> None:
        """Nullable anyOf patterns nested inside other dicts are rewritten."""
        schema = {
            "properties": {
                "name": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                "count": {"type": "integer"},
            }
        }
        result = _downgrade_nullable(schema)
        assert result["properties"]["name"] == {
            "type": "string",
            "nullable": True,
        }
        assert result["properties"]["count"] == {"type": "integer"}


# ---------------------------------------------------------------------------
# downgrade_to_openapi_30
# ---------------------------------------------------------------------------


class TestDowngradeToOpenapi30:
    """Unit tests for the top-level schema downgrade function."""

    def test_sets_version_string(self) -> None:
        """The openapi field is set to '3.0.3'."""
        schema: dict[str, Any] = {"openapi": "3.1.0", "info": {}, "paths": {}}
        result = downgrade_to_openapi_30(schema)
        assert result["openapi"] == "3.0.3"

    def test_rewrites_nullable_params_in_paths(self) -> None:
        """Nullable query params inside paths are rewritten end-to-end."""
        schema: dict[str, Any] = {
            "openapi": "3.1.0",
            "paths": {
                "/v1/monsters": {
                    "get": {
                        "parameters": [
                            {
                                "name": "search",
                                "in": "query",
                                "schema": {
                                    "anyOf": [
                                        {"type": "string"},
                                        {"type": "null"},
                                    ]
                                },
                            }
                        ]
                    }
                }
            },
        }
        result = downgrade_to_openapi_30(schema)
        param_schema = result["paths"]["/v1/monsters"]["get"]["parameters"][0][
            "schema"
        ]
        assert param_schema == {"type": "string", "nullable": True}

    def test_rewrites_decimal_nullable_params_in_paths(self) -> None:
        """Decimal | None three-branch anyOf is rewritten end-to-end."""
        schema: dict[str, Any] = {
            "openapi": "3.1.0",
            "paths": {
                "/v1/monsters": {
                    "get": {
                        "parameters": [
                            {
                                "name": "cr_min",
                                "in": "query",
                                "schema": {
                                    "anyOf": [
                                        {"type": "number", "minimum": 0.0},
                                        {"type": "string", "pattern": "^\\d+$"},
                                        {"type": "null"},
                                    ],
                                    "title": "Cr Min",
                                },
                            }
                        ]
                    }
                }
            },
        }
        result = downgrade_to_openapi_30(schema)
        param_schema = result["paths"]["/v1/monsters"]["get"]["parameters"][0][
            "schema"
        ]
        assert param_schema["nullable"] is True
        assert not any(
            s.get("type") == "null"
            for s in param_schema["anyOf"]
            if isinstance(s, dict)
        )

    def test_idempotent(self) -> None:
        """Calling the function twice produces the same result."""
        schema: dict[str, Any] = {
            "openapi": "3.1.0",
            "paths": {
                "/test": {
                    "get": {
                        "parameters": [
                            {
                                "schema": {
                                    "anyOf": [
                                        {"type": "string"},
                                        {"type": "null"},
                                    ]
                                }
                            }
                        ]
                    }
                }
            },
        }
        first = downgrade_to_openapi_30(schema)
        second = downgrade_to_openapi_30(first)
        assert first == second
