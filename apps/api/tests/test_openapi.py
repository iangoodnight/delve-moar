"""Tests for the OpenAPI 3.1 -> 3.0.3 schema downgrade utility.

These tests exercise the schema-tree transformation in isolation without
starting an HTTP server or touching the database.
"""

from typing import Any

from app.openapi import _downgrade_nullable, downgrade_to_openapi_30

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

    def test_multiple_non_null_anyof_left_alone(self) -> None:
        """anyOf with multiple non-null branches is not touched."""
        schema = {
            "anyOf": [{"type": "string"}, {"type": "integer"}, {"type": "null"}]
        }
        result = _downgrade_nullable(schema)
        # Should not be collapsed -- more than one non-null branch.
        assert "anyOf" in result

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
