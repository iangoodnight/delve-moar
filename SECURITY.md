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
| `0.1.2` (latest) | yes       |
| `< 0.1.2`        | no        |

This table is bumped as part of the release ritual (see the "Cutting a
release" checklist in `CONTRIBUTING.md`).

## Reporting a vulnerability

Please **do not** open a public GitHub issue for a security finding.

Send reports by email to:

**security@delvemoar.com**

GitHub Private Vulnerability Reporting (PVR) is the preferred channel for
projects of this kind, but it requires the repository to be public. This
repo is currently private, so PVR is not available. When the repo goes
public, PVR will be enabled and become the preferred channel; email will
remain as a fallback. This document will be updated at that time.

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

DelveMoar is in **Phase 1a** (SRD catalog, read-only). Some context that
may be useful when deciding whether something is a security issue:

- The catalog endpoints (`/monsters`, `/spells`, `/items`) serve **public
  SRD data**. They are read-only and require no authentication in this
  phase. Information disclosure from these endpoints is by design.
- There are no user accounts, sessions, or per-user data in Phase 1a. The
  database is seeded entirely from public SRD content.
- Authentication, authorization, and per-user homebrew arrive in Phase 1b.
  Auth-related findings will become in scope once that phase opens.

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
