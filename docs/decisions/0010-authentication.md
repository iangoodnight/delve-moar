# 0010. Authentication: roll our own with argon2id and server-side sessions

- Status: proposed
- Date: 2026-05-21

## Context

Phase 1a shipped a fully public, read-only SRD catalog with no concept
of a user. Phase 1b ([#153](https://github.com/iangoodnight/delve-moar/issues/153))
introduces user-owned homebrew content, which means the app needs
identity for the first time: a way to sign up, sign in, and attach
created content to an account.

DelveMoar is headed toward open source and is meant to be self-hostable.
That framing shapes the forces:

- A mandatory third-party auth vendor works against "clone it and run
  it." A self-hoster should not need to register for an external
  service to stand up their own instance.
- The team is small and wants low operational weight. Another
  long-running service to run, monitor, and back up is a real cost.
- Auth is security-sensitive surface. We want battle-tested primitives,
  not clever ones.
- The D&D community lives on Discord, so OAuth (Discord first) is
  likely a Phase 2 want. Whatever we build now should not have to be
  torn out to add it.

## Decision

**We will implement authentication ourselves, on standard primitives.**

- **Password hashing: argon2id**, via the actively maintained
  `argon2-cffi` binding. Parameters (memory cost, time cost,
  parallelism) live in config so they can be tuned without a code
  change.
- **Server-side sessions.** On login we mint an opaque, high-entropy
  session token, store its hash in a `sessions` table keyed to the
  user, and return it in an `HttpOnly`, `Secure`, `SameSite` cookie.
  Sessions carry an expiry with sliding renewal. Logout and a
  "sign out everywhere" both work by deleting session rows.
- **Account lifecycle:** email + password signup with email
  verification; password reset via a single-use, expiring token
  delivered by email.
- **CSRF protection** on cookie-authenticated state-changing requests.
- **A clean identity seam.** Endpoints resolve the current user through
  one dependency (e.g. `get_current_user`), never by reading the
  session directly. Adding an OAuth provider or external IdP later is
  then an additive change behind that seam, not a rewrite of every
  handler.

## Considered alternatives

- **Hosted SaaS (Clerk, Auth0, Supabase Auth).** Fastest path to a
  working login and offloads the security burden. Rejected because a
  mandatory external account contradicts the self-host and OSS goals,
  adds vendor pricing and lock-in risk, and complicates local
  development and CI.
- **Self-hosted IdP (Keycloak, Authentik, Ory Kratos).** Full-featured,
  swappable, and OSS-friendly. Rejected for now as too heavy: it is a
  second service to run, monitor, and back up, and it raises the
  self-hoster's bar from "one image" to "configure a realm." Worth
  revisiting only if BYO-IDP becomes a hard requirement.
- **OAuth-only (Discord, Google, GitHub).** No passwords to store, and
  Discord fits the audience. Rejected as the foundation because it
  forces every user (and every self-hoster's users) through a third
  party, offers no first-class email/password path, and still leaves us
  managing sessions. It is a better Phase 2 addition than a Phase 1b
  base.
- **passlib as the hashing facade.** Mature and familiar, but it wraps
  many algorithms we do not need and its maintenance cadence on recent
  Python has lagged. For a single chosen algorithm, depending on
  `argon2-cffi` directly is a smaller, better-maintained surface.

## Consequences

**Easier:**

- No external auth dependency. A self-hoster runs the entire stack from
  our image, and local dev and CI need no third-party accounts.
- We own the `users` and `sessions` schema, so the Phase 1b
  authorization layer (ADR 0011) can be shaped directly around it.
- The identity seam gives us a clean, additive path to OAuth in Phase 2.

**Harder:**

- We own security-sensitive code: hashing parameters, session-fixation
  defense, CSRF, reset-token entropy and expiry, and timing-safe
  comparisons. This code gets reviewed against the OWASP ASVS, not just
  "does login work."
- Email becomes a runtime dependency. Verification and password reset
  need a deliverable mailer, which is new operational surface.

## New constraints

- argon2id parameters become a documented, tuned setting rather than a
  library default.
- Login and password-reset endpoints now *require* rate limiting (a
  separate Phase 1b checkbox in #153), not as a nice-to-have but as
  part of the auth threat model.
- New secrets (mailer credentials, any session-signing key) join the
  environment-config surface and the deploy runbook.

## Links

- [#153](https://github.com/iangoodnight/delve-moar/issues/153) — Phase
  1b scope, which this ADR is the first prerequisite of
- ADR [0011](0011-campaign-model.md) — the campaign model, whose
  authorization rule consumes the `user_id` this ADR establishes
- ADR [0012](0012-visibility-and-sharing.md) — the sharing model that
  builds on authenticated identity
- Resolves the "Auth provider for Phase 1b" entry in
  `planning/open-questions.md`
