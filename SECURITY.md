# Security policy

DelveMoar takes security seriously even at this early stage. This document
is the current contract for how to report vulnerabilities and what to
expect in return.

## Supported versions

DelveMoar is pre-1.0 and ships patch releases off `main`. Only the
latest released version, and the `main` branch it ships from, receive
security fixes. Older releases and pre-release tags do not.

| Version          | Supported |
| ---------------- | --------- |
| `main` (HEAD)    | yes       |
| `0.1.3` (latest) | yes       |
| `< 0.1.3`        | no        |

This table is bumped as part of the release ritual (see the "Cutting a
release" checklist in `CONTRIBUTING.md`).

## Reporting a vulnerability

Please **do not** open a public GitHub issue for a security finding.

The preferred channel is **GitHub Private Vulnerability Reporting
(PVR)**: open the repository's **Security** tab and choose "Report a
vulnerability". PVR keeps the report private until a fix ships and lets
us coordinate the advisory with you in-thread.

If you cannot use PVR, email:

**security@delvemoar.com**

When you report, please include:

- A description of the issue and the affected component (api, web, cli, infra).
- Steps to reproduce, or a proof-of-concept if you have one.
- The impact you believe it has.
- Any suggested mitigation or fix.

## What to expect

- **Acknowledgement**: within 5 business days of your report.
- **Initial assessment**: within 14 days, including severity and rough
  remediation timeline.
- **Disclosure**: we coordinate disclosure with the reporter. Default
  window is 90 days from acknowledgement, sooner if a fix ships earlier,
  longer only with mutual agreement.

We will credit reporters in the release notes unless asked otherwise.

## Scope notes for the current phase

DelveMoar has a public SRD catalog plus user accounts and content
collections (books). Some context that may be useful when deciding
whether something is a security issue:

- The catalog endpoints (`/monsters`, `/spells`, `/items`) serve **public
  SRD data**. Browsing them is read-only and needs no authentication.
  Information disclosure from these endpoints is by design.
- User accounts are live: signup and login, opaque server-side sessions
  in HttpOnly cookies, double-submit CSRF on state-changing requests,
  IP-based rate limiting on the auth endpoints, email verification, and
  password reset. Authentication and authorization findings are in
  scope.
- Per-user data is private to its owner: a user's email and their books
  (collections of catalog content). A user's only public identity is
  their username. Leaking one user's data to another is in scope.
- Per-user homebrew authoring and campaigns are still to come; findings
  in those areas become in scope as the features land.

Cross-cutting concerns that **are** in scope today:

- Server-side request forgery, command injection, SQL injection, or
  similar vulnerabilities in the API or seeders.
- XSS, CSRF, or supply-chain issues in the web app.
- Container or infrastructure misconfiguration in `infra/`.
- Vulnerabilities in dependencies that we ship.

## Out of scope

- Findings that require physical access to a developer machine.
- Denial-of-service via unbounded request volume against any public dev
  instance, if one exists. Dev instances are not production targets.
- Issues already tracked in public GitHub issues.

## Safe harbor

If you make a good-faith effort to follow this policy when reporting, we
will not pursue or support legal action against you. We may ask you to
stop or change a particular line of testing if it impacts other users or
infrastructure.
