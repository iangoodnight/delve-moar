"""End-to-end tests for the #171 email-lifecycle auth endpoints.

Uses the ``db_client`` fixture (the real app on a rolled-back transaction).
The ``sent_emails`` fixture replaces the mailer's compose-and-send helpers
with recorders, so a test can read back what would have been sent (and the
raw token embedded in each) without any SMTP. httpx runs the response's
background tasks within the request, so the recorders have already fired by
the time a call returns.
"""

import pytest
from httpx import AsyncClient

from app import mailer
from app.config import settings

SIGNUP = "/v1/auth/signup"
LOGIN = "/v1/auth/login"
ME = "/v1/auth/me"
VERIFY = "/v1/auth/verify-email"
RESEND = "/v1/auth/resend-verification"
RESET_REQUEST = "/v1/auth/password-reset"
RESET_CONFIRM = "/v1/auth/password-reset/confirm"

PASSWORD = "hunter2hunter"
NEW_PASSWORD = "brandnewpass1"

# Each recorded send is (kind, recipient, raw_token).
SentEmails = list[tuple[str, str, str]]


@pytest.fixture
def sent_emails(monkeypatch: pytest.MonkeyPatch) -> SentEmails:
    """Capture mailer sends instead of delivering them."""
    captured: SentEmails = []

    async def _verify(to: str, token: str) -> None:
        captured.append(("verification", to, token))

    async def _reset(to: str, token: str) -> None:
        captured.append(("reset", to, token))

    monkeypatch.setattr(mailer, "send_verification_email", _verify)
    monkeypatch.setattr(mailer, "send_password_reset_email", _reset)
    return captured


def _signup(
    username: str, email: str, password: str = PASSWORD
) -> dict[str, str]:
    return {"username": username, "email": email, "password": password}


def _csrf_header(client: AsyncClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies[settings.csrf_cookie_name]}


def _token_of(sent: SentEmails, kind: str) -> str:
    return next(token for (k, _to, token) in sent if k == kind)


# ── signup sends verification ────────────────────────────────────────────────


async def test_signup_sends_verification_email(
    db_client: AsyncClient, sent_emails: SentEmails
) -> None:
    resp = await db_client.post(SIGNUP, json=_signup("veridm", "veri@x.com"))
    assert resp.status_code == 201
    assert resp.json()["emailVerified"] is False
    assert len(sent_emails) == 1
    kind, to, token = sent_emails[0]
    assert kind == "verification"
    assert to == "veri@x.com"
    assert token


# ── verify-email ─────────────────────────────────────────────────────────────


async def test_verify_email_marks_account_verified(
    db_client: AsyncClient, sent_emails: SentEmails
) -> None:
    await db_client.post(SIGNUP, json=_signup("markdm", "mark@x.com"))
    token = _token_of(sent_emails, "verification")

    resp = await db_client.post(VERIFY, json={"token": token})
    assert resp.status_code == 204

    me = await db_client.get(ME)
    assert me.json()["emailVerified"] is True


async def test_verify_email_rejects_unknown_token(
    db_client: AsyncClient,
) -> None:
    resp = await db_client.post(VERIFY, json={"token": "nope-not-a-token"})
    assert resp.status_code == 400
    assert resp.json()["errorCode"] == "INVALID_TOKEN"


async def test_verify_email_token_is_single_use(
    db_client: AsyncClient, sent_emails: SentEmails
) -> None:
    await db_client.post(SIGNUP, json=_signup("oncedm", "once@x.com"))
    token = _token_of(sent_emails, "verification")

    assert (
        await db_client.post(VERIFY, json={"token": token})
    ).status_code == 204
    replay = await db_client.post(VERIFY, json={"token": token})
    assert replay.status_code == 400


# ── resend-verification ──────────────────────────────────────────────────────


async def test_resend_verification_invalidates_the_old_link(
    db_client: AsyncClient, sent_emails: SentEmails
) -> None:
    await db_client.post(SIGNUP, json=_signup("resenddm", "resend@x.com"))
    first_token = sent_emails[0][2]

    resp = await db_client.post(RESEND, headers=_csrf_header(db_client))
    assert resp.status_code == 204
    assert len(sent_emails) == 2
    second_token = sent_emails[1][2]
    assert second_token != first_token

    # The superseded link no longer works; the fresh one does.
    assert (
        await db_client.post(VERIFY, json={"token": first_token})
    ).status_code == 400
    assert (
        await db_client.post(VERIFY, json={"token": second_token})
    ).status_code == 204


async def test_resend_verification_is_noop_when_already_verified(
    db_client: AsyncClient, sent_emails: SentEmails
) -> None:
    await db_client.post(SIGNUP, json=_signup("vdoned", "vdone@x.com"))
    await db_client.post(
        VERIFY, json={"token": _token_of(sent_emails, "verification")}
    )
    sent_emails.clear()

    resp = await db_client.post(RESEND, headers=_csrf_header(db_client))
    assert resp.status_code == 204
    assert sent_emails == []  # nothing re-sent


async def test_resend_verification_requires_csrf(
    db_client: AsyncClient, sent_emails: SentEmails
) -> None:
    await db_client.post(SIGNUP, json=_signup("csrfd", "csrf@x.com"))
    resp = await db_client.post(RESEND)  # no X-CSRF-Token header
    assert resp.status_code == 403
    assert resp.json()["errorCode"] == "CSRF_FAILED"


async def test_resend_verification_requires_a_session(
    db_client: AsyncClient,
) -> None:
    # Forge a matching CSRF cookie+header so the CSRF gate passes; with no
    # session cookie the request must still fail as unauthenticated.
    db_client.cookies.set(settings.csrf_cookie_name, "forged")
    resp = await db_client.post(RESEND, headers={"X-CSRF-Token": "forged"})
    assert resp.status_code == 401
    assert resp.json()["errorCode"] == "UNAUTHENTICATED"


# ── password-reset request (enumeration-resistant) ───────────────────────────


async def test_password_reset_request_emails_a_known_account(
    db_client: AsyncClient, sent_emails: SentEmails
) -> None:
    await db_client.post(SIGNUP, json=_signup("resetdm", "reset@x.com"))
    sent_emails.clear()  # drop the signup verification email

    resp = await db_client.post(RESET_REQUEST, json={"identifier": "resetdm"})
    assert resp.status_code == 202
    assert [kind for (kind, _to, _t) in sent_emails] == ["reset"]
    assert sent_emails[0][1] == "reset@x.com"


async def test_password_reset_request_is_enumeration_resistant(
    db_client: AsyncClient, sent_emails: SentEmails
) -> None:
    known = await db_client.post(SIGNUP, json=_signup("seendm", "seen@x.com"))
    assert known.status_code == 201
    sent_emails.clear()

    hit = await db_client.post(RESET_REQUEST, json={"identifier": "seen@x.com"})
    miss = await db_client.post(
        RESET_REQUEST, json={"identifier": "ghost@x.com"}
    )
    # Same status and body whether or not the account exists...
    assert hit.status_code == miss.status_code == 202
    assert hit.json() == miss.json()
    # ...but only the real account is mailed.
    assert [kind for (kind, *_rest) in sent_emails] == ["reset"]


# ── password-reset confirm ───────────────────────────────────────────────────


async def test_password_reset_confirm_rotates_the_password(
    db_client: AsyncClient, sent_emails: SentEmails
) -> None:
    await db_client.post(SIGNUP, json=_signup("rotdm", "rot@x.com"))
    await db_client.post(RESET_REQUEST, json={"identifier": "rotdm"})
    token = _token_of(sent_emails, "reset")

    resp = await db_client.post(
        RESET_CONFIRM, json={"token": token, "password": NEW_PASSWORD}
    )
    assert resp.status_code == 204

    db_client.cookies.clear()
    old = await db_client.post(
        LOGIN, json={"identifier": "rotdm", "password": PASSWORD}
    )
    assert old.status_code == 401
    new = await db_client.post(
        LOGIN, json={"identifier": "rotdm", "password": NEW_PASSWORD}
    )
    assert new.status_code == 200


async def test_password_reset_confirm_revokes_existing_sessions(
    db_client: AsyncClient, sent_emails: SentEmails
) -> None:
    await db_client.post(SIGNUP, json=_signup("revdm", "rev@x.com"))
    assert (await db_client.get(ME)).status_code == 200  # session is live

    await db_client.post(RESET_REQUEST, json={"identifier": "revdm"})
    token = _token_of(sent_emails, "reset")
    await db_client.post(
        RESET_CONFIRM, json={"token": token, "password": NEW_PASSWORD}
    )

    # The session held before the reset is now dead.
    assert (await db_client.get(ME)).status_code == 401


async def test_password_reset_confirm_verifies_the_email(
    db_client: AsyncClient, sent_emails: SentEmails
) -> None:
    await db_client.post(SIGNUP, json=_signup("pvdm", "pv@x.com"))
    await db_client.post(RESET_REQUEST, json={"identifier": "pvdm"})
    token = _token_of(sent_emails, "reset")
    await db_client.post(
        RESET_CONFIRM, json={"token": token, "password": NEW_PASSWORD}
    )

    db_client.cookies.clear()
    await db_client.post(
        LOGIN, json={"identifier": "pvdm", "password": NEW_PASSWORD}
    )
    # Receiving the reset mail proved address control, so it is now verified.
    assert (await db_client.get(ME)).json()["emailVerified"] is True


async def test_password_reset_confirm_rejects_unknown_token(
    db_client: AsyncClient,
) -> None:
    resp = await db_client.post(
        RESET_CONFIRM, json={"token": "bogus", "password": NEW_PASSWORD}
    )
    assert resp.status_code == 400
    assert resp.json()["errorCode"] == "INVALID_TOKEN"


async def test_password_reset_confirm_rejects_short_password(
    db_client: AsyncClient, sent_emails: SentEmails
) -> None:
    await db_client.post(SIGNUP, json=_signup("shortdm", "short@x.com"))
    await db_client.post(RESET_REQUEST, json={"identifier": "shortdm"})
    token = _token_of(sent_emails, "reset")

    resp = await db_client.post(
        RESET_CONFIRM, json={"token": token, "password": "short"}
    )
    assert resp.status_code == 422
