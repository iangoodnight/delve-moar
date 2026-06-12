"""Unit tests for the provider-agnostic mailer seam."""

import logging
from email.message import EmailMessage

import aiosmtplib
import pytest

from app import mailer
from app.config import settings


async def test_console_transport_logs_message(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with caplog.at_level(logging.INFO, logger="app.mailer"):
        await mailer.send_email(
            to="dm@example.com",
            subject="Hello",
            text_body="Body line",
        )
    assert "dm@example.com" in caplog.text
    assert "Hello" in caplog.text
    assert "Body line" in caplog.text


async def test_smtp_transport_sends_built_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "mailer_transport", "smtp")
    sent: list[EmailMessage] = []

    async def _fake_send(message: EmailMessage, **kwargs: object) -> None:
        sent.append(message)

    monkeypatch.setattr(aiosmtplib, "send", _fake_send)
    await mailer.send_email(
        to="dm@example.com",
        subject="Reset",
        text_body="Click here",
    )
    assert len(sent) == 1
    message = sent[0]
    assert message["To"] == "dm@example.com"
    assert message["Subject"] == "Reset"
    assert message["From"] == settings.mailer_from
    assert "Click here" in message.get_content()


async def test_verification_email_builds_link(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str] = {}

    async def _capture(*, to: str, subject: str, text_body: str) -> None:
        captured.update(to=to, subject=subject, text_body=text_body)

    monkeypatch.setattr(mailer, "send_email", _capture)
    await mailer.send_verification_email("dm@example.com", "tok123")
    assert captured["to"] == "dm@example.com"
    assert "verify-email?token=tok123" in captured["text_body"]
    assert settings.frontend_base_url in captured["text_body"]


async def test_password_reset_email_builds_link(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str] = {}

    async def _capture(*, to: str, subject: str, text_body: str) -> None:
        captured.update(to=to, subject=subject, text_body=text_body)

    monkeypatch.setattr(mailer, "send_email", _capture)
    await mailer.send_password_reset_email("dm@example.com", "tok456")
    assert captured["to"] == "dm@example.com"
    assert "reset-password?token=tok456" in captured["text_body"]
