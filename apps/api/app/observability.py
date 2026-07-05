"""Error tracking seam (#167).

A small seam (like ``app.mailer``) that initializes Sentry for the API. It
stays inert until ``settings.sentry_dsn`` is set, so local dev, CI, and tests
never emit events; production sets ``SENTRY_DSN`` as a secret.

``send_default_pii`` is left off: the user model now holds emails and argon2id
hashes, and request bodies carry credentials, so nothing user-identifying is
attached to events. Tracing defaults off (errors only) to stay within the free
quota. The FastAPI/Starlette/SQLAlchemy/asyncpg integrations are auto-enabled
by the SDK.
"""

import logging

import sentry_sdk

from app.config import settings

logger = logging.getLogger("app.observability")


def init_observability() -> None:
    """Initialize Sentry when a DSN is configured; otherwise do nothing.

    Idempotent enough for the single startup call: with no DSN the SDK is never
    initialized, so the app runs exactly as before.
    """
    if not settings.sentry_dsn:
        return

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment or settings.env,
        release=settings.version,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        send_default_pii=False,
    )
    logger.info(
        "[observability] Sentry initialized (environment=%s, release=%s)",
        settings.sentry_environment or settings.env,
        settings.version,
    )
