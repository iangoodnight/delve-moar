"""Application settings loaded from environment variables and .env file."""

import tomllib
from pathlib import Path
from typing import Annotated
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from pydantic import AfterValidator, BeforeValidator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Resolve paths relative to this file so settings work regardless of the
# current working directory (seed scripts, test runners, container, etc.).
_API_ROOT = Path(__file__).parent.parent  # apps/api/
_PROJECT_ROOT = _API_ROOT.parent.parent  # repo root (dungeon-master/)

# Search order: project-root .env first, then an api-local override if present.
# pydantic-settings applies files left-to-right; later values win, so the
# api-local file can override individual keys without replacing the whole file.
_ENV_FILES = [_PROJECT_ROOT / ".env", _API_ROOT / ".env"]


def _read_version() -> str:
    """Read version from pyproject.toml when present, fall back to 'dev'.

    The container sets VERSION via the environment; pyproject.toml is only
    present during local development.  Either source is fine — pydantic-settings
    will prefer the env var over this default when VERSION is set.
    """
    pyproject = _API_ROOT / "pyproject.toml"
    if pyproject.is_file():
        with pyproject.open("rb") as fh:
            return str(tomllib.load(fh)["project"]["version"])
    return "dev"


def _coerce_database_url(value: str) -> str:
    """Rewrite fly postgres attach URLs to the asyncpg dialect.

    ``fly postgres attach`` sets DATABASE_URL as ``postgres://...?sslmode=disable``.
    SQLAlchemy + asyncpg requires ``postgresql+asyncpg://...``. asyncpg also
    spells the SSL parameter ``ssl`` rather than ``sslmode``, so rename the
    query key. Without this, stripping sslmode lets asyncpg default to SSL
    negotiation, which fails on Fly's internal `.flycast` network.
    """
    if value.startswith("postgres://"):
        value = "postgresql+asyncpg://" + value[len("postgres://") :]
    parsed = urlparse(value)
    if "sslmode" in parsed.query:
        params = {k: v[0] for k, v in parse_qs(parsed.query).items()}
        params["ssl"] = params.pop("sslmode")
        value = urlunparse(parsed._replace(query=urlencode(params)))
    return value


def _parse_csv_list(value: str | list[str]) -> list[str]:
    """Coerce a CSV env-var value into a list of trimmed, non-empty strings.

    Pydantic-settings reads env vars as strings, but some settings are more
    ergonomic as lists. Lists require JSON syntax by default, which is awkward
    in shells. Accepting CSV makes
    ``CORS_ALLOWED_ORIGINS="http://a.com, http://b.com"``
    just work. When the default (already a list flows through), return it
    unchanged.

    Args:
        value: A string from an environment variable, or a default list.

    Returns:
        A list of strings, split and trimmed if the input was a string.

    Examples:
        >>> _parse_csv_list("a, b, c")
        ['a', 'b', 'c']
        >>> _parse_csv_list("  a  ,  b  ,  c  ")
        ['a', 'b', 'c']
        >>> _parse_csv_list("a,b,,c,")
        ['a', 'b', 'c']
        >>> _parse_csv_list(["a", "b", "c"])
        ['a', 'b', 'c']
    """
    if isinstance(value, list):
        return value
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings(BaseSettings):
    """API configuration -- values are read from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        case_sensitive=False,
        # Root .env is shared with postgres/web — ignore unknown keys.
        extra="ignore",
    )

    cors_allowed_origins: Annotated[
        list[str],
        NoDecode,
        BeforeValidator(_parse_csv_list),
    ] = ["http://localhost:5173"]
    database_url: Annotated[str, AfterValidator(_coerce_database_url)] = (
        "postgresql+asyncpg://UNSET:UNSET@localhost:5432/UNSET"
    )
    env: str = "development"
    version: str = _read_version()
    public_url: str = "http://localhost:8000"

    # Auth -- argon2id password-hashing parameters. Defaults are the OWASP
    # minimums; tune upward as hardware allows. They live in config so they
    # can change without a code edit, and check_needs_rehash() upgrades
    # stored hashes on the next login when these change.
    argon2_time_cost: int = 2
    argon2_memory_cost: int = 19456  # KiB (19 MiB)
    argon2_parallelism: int = 1

    # Sessions -- opaque token in an HttpOnly cookie; sliding expiry.
    session_ttl_seconds: int = 1_209_600  # 14 days
    session_cookie_name: str = "dm_session"
    csrf_cookie_name: str = "dm_csrf"
    # None -> derive from env via cookie_secure: Secure everywhere except
    # local development (plain-HTTP, where Secure cookies are never sent).
    session_cookie_secure: bool | None = None
    # Cookie Domain attribute. Leave empty for host-only cookies (local dev,
    # where web and API share localhost). In production set to the shared
    # parent (e.g. ".delvemoar.com") so the web origin can read the CSRF
    # cookie set by the API subdomain.
    session_cookie_domain: str | None = None

    # Rate limiting -- brute-force and abuse protection on auth endpoints,
    # part of the ADR 0010 threat model. Limits use the ``limits`` library
    # notation (e.g. "10/minute" or "5/hour;100/day") and are keyed by client
    # IP. Storage defaults to in-process memory, which is correct for the
    # single-process deploy; point it at "async+redis://..." to share counters
    # across machines if the app ever scales horizontally.
    rate_limit_enabled: bool = True
    rate_limit_storage_uri: str = "async+memory://"
    rate_limit_login: str = "10/minute"
    rate_limit_signup: str = "5/hour"
    # Email-sending endpoints are an abuse vector (mail-bombing a victim's
    # inbox), so the reset-request and resend-verification routes carry their
    # own IP-keyed limits. The token-consuming routes are not limited: the
    # tokens are 256-bit and unbruteforceable.
    rate_limit_password_reset: str = "5/hour"  # noqa: S105 (rate, not a secret)
    rate_limit_resend_verification: str = "5/hour"

    # Email / mailer (#171). Verification and password-reset links are sent
    # through a provider-agnostic seam. ``mailer_transport`` selects the
    # backend: "console" logs the message (zero-config for local dev, CI, and
    # self-hosters) while "smtp" delivers via any SMTP server (Mailpit
    # locally, or a provider's SMTP endpoint in production). Links point at
    # the web app, whose routes are built in #174.
    frontend_base_url: str = "http://localhost:5173"
    mailer_transport: str = "console"
    mailer_from: str = "DelveMoar <no-reply@delvemoar.com>"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_username: str = ""
    smtp_password: str = ""
    # Implicit TLS (port 465). STARTTLS (port 587) upgrades a plaintext
    # connection instead; set at most one. Both off suits a local Mailpit.
    smtp_use_tls: bool = False
    smtp_start_tls: bool = False
    # Single-use token lifetimes. Verification is generous; reset is short
    # since it grants a password change.
    email_verification_ttl_seconds: int = 86_400  # 24 hours
    password_reset_ttl_seconds: int = 3_600  # 1 hour

    @property
    def cookie_secure(self) -> bool:
        """Whether auth cookies carry the ``Secure`` flag.

        Defaults to ``True`` everywhere except local development, where the
        API is served over plain HTTP and a ``Secure`` cookie would never be
        sent back. Set ``SESSION_COOKIE_SECURE`` explicitly to override.

        Returns:
            ``True`` if auth cookies should be marked ``Secure``.
        """
        if self.session_cookie_secure is not None:
            return self.session_cookie_secure
        return self.env != "development"


settings = Settings()
