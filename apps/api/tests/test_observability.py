"""Unit tests for the Sentry error-tracking seam."""

import logging

import pytest

from app import observability
from app.config import settings


def test_init_is_noop_without_dsn(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "sentry_dsn", "")
    calls: list[dict[str, object]] = []
    monkeypatch.setattr(
        observability.sentry_sdk,
        "init",
        lambda **kwargs: calls.append(kwargs),
    )

    observability.init_observability()

    assert calls == []


def test_init_configures_sdk_when_dsn_set(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setattr(settings, "sentry_dsn", "https://key@example.test/1")
    monkeypatch.setattr(settings, "sentry_environment", "")
    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "sentry_traces_sample_rate", 0.25)
    calls: list[dict[str, object]] = []
    monkeypatch.setattr(
        observability.sentry_sdk,
        "init",
        lambda **kwargs: calls.append(kwargs),
    )

    with caplog.at_level(logging.INFO, logger="app.observability"):
        observability.init_observability()

    assert len(calls) == 1
    kwargs = calls[0]
    assert kwargs["dsn"] == "https://key@example.test/1"
    # environment falls back to env when sentry_environment is empty
    assert kwargs["environment"] == "production"
    assert kwargs["release"] == settings.version
    assert kwargs["traces_sample_rate"] == 0.25
    assert kwargs["send_default_pii"] is False
    assert "Sentry initialized" in caplog.text


def test_environment_override_wins_over_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "sentry_dsn", "https://key@example.test/1")
    monkeypatch.setattr(settings, "sentry_environment", "staging")
    monkeypatch.setattr(settings, "env", "production")
    calls: list[dict[str, object]] = []
    monkeypatch.setattr(
        observability.sentry_sdk,
        "init",
        lambda **kwargs: calls.append(kwargs),
    )

    observability.init_observability()

    assert calls[0]["environment"] == "staging"
