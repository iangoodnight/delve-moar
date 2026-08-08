"""Provider-agnostic transactional mailer for account-lifecycle email.

A small seam (like ``app.rate_limit``) the auth routes call to deliver the
verification and password-reset links (#171). The transport is chosen by
``settings.mailer_transport``:

  console -- log the message; zero-config for local dev, CI, tests, and
             self-hosters who have not configured SMTP.
  smtp    -- deliver through any SMTP server (a local Mailpit, or a
             provider's SMTP endpoint in production) via aiosmtplib.

The two compose-and-send helpers build their link against
``settings.frontend_base_url``; the matching web routes are owned by #174.
"""

import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import settings

logger = logging.getLogger("app.mailer")


async def _send_console(message: EmailMessage) -> None:
    """Log an email instead of delivering it (dev / CI transport)."""
    logger.info(
        "[mailer:console] to=%s subject=%s\n%s",
        message["To"],
        message["Subject"],
        message.get_content(),
    )


async def _send_smtp(message: EmailMessage) -> None:
    """Deliver an email through the configured SMTP server."""
    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_username or None,
        password=settings.smtp_password or None,
        use_tls=settings.smtp_use_tls,
        start_tls=settings.smtp_start_tls,
    )


async def send_email(*, to: str, subject: str, text_body: str) -> None:
    """Send a plain-text email through the configured transport.

    Args:
        to: Recipient address.
        subject: Subject line.
        text_body: Plain-text body.
    """
    message = EmailMessage()
    message["From"] = settings.mailer_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text_body)

    if settings.mailer_transport == "smtp":
        await _send_smtp(message)
    else:
        await _send_console(message)


async def send_verification_email(to: str, token: str) -> None:
    """Email a user the link to verify their address.

    Args:
        to: The user's email address.
        token: The raw verification token.
    """
    link = f"{settings.frontend_base_url}/verify-email?token={token}"
    await send_email(
        to=to,
        subject="Verify your DelveMoar email",
        text_body=(
            "Welcome to DelveMoar! Confirm your email address by opening "
            f"the link below:\n\n{link}\n\n"
            "If you did not create an account, you can ignore this message."
        ),
    )


async def send_email_change_email(to: str, token: str) -> None:
    """Email the confirmation link for a requested email change (#175).

    Sent to the *new* address: opening the link proves the user controls
    it, at which point the account's email swaps over.

    Args:
        to: The requested new email address.
        token: The raw email-change token.
    """
    link = f"{settings.frontend_base_url}/confirm-email-change?token={token}"
    await send_email(
        to=to,
        subject="Confirm your new DelveMoar email",
        text_body=(
            "Confirm this address to finish updating your DelveMoar email. "
            f"Open the link below:\n\n{link}\n\n"
            "If you did not request this change you can ignore this message; "
            "your email will not change."
        ),
    )


async def send_password_reset_email(to: str, token: str) -> None:
    """Email a user the link to reset their password.

    Args:
        to: The user's email address.
        token: The raw password-reset token.
    """
    link = f"{settings.frontend_base_url}/reset-password?token={token}"
    await send_email(
        to=to,
        subject="Reset your DelveMoar password",
        text_body=(
            "We received a request to reset your DelveMoar password. Open "
            f"the link below to choose a new one:\n\n{link}\n\n"
            "If you did not request this you can ignore this message; your "
            "password will not change."
        ),
    )
