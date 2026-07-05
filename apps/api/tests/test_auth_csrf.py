"""Unit tests for double-submit CSRF helpers."""

from app.auth.csrf import generate_csrf_token, tokens_match


def test_generate_csrf_token_is_unique() -> None:
    assert generate_csrf_token() != generate_csrf_token()


def test_tokens_match_true_for_equal_present_values() -> None:
    assert tokens_match("abc123", "abc123") is True


def test_tokens_match_false_for_mismatch() -> None:
    assert tokens_match("abc123", "xyz789") is False


def test_tokens_match_false_when_either_missing() -> None:
    assert tokens_match(None, "abc123") is False
    assert tokens_match("abc123", None) is False
    assert tokens_match("", "") is False
    assert tokens_match(None, None) is False
