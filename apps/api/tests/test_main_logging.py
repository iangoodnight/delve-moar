"""The app logger is wired so ``app.*`` records reach the server output."""

import logging

from app.main import _configure_app_logging


def test_configure_app_logging_makes_app_logs_visible() -> None:
    app_logger = logging.getLogger("app")
    saved_handlers = app_logger.handlers
    saved_level = app_logger.level
    saved_propagate = app_logger.propagate
    try:
        app_logger.handlers = []
        app_logger.propagate = True

        _configure_app_logging()

        assert app_logger.level == logging.INFO
        assert app_logger.handlers  # at least one handler is attached
        assert app_logger.propagate is False

        # Idempotent: a second call does not stack more handlers.
        handlers_after_first = list(app_logger.handlers)
        _configure_app_logging()
        assert app_logger.handlers == handlers_after_first
    finally:
        app_logger.handlers = saved_handlers
        app_logger.level = saved_level
        app_logger.propagate = saved_propagate
