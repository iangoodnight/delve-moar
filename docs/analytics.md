# Analytics

DelveMoar can report privacy-friendly, aggregate usage analytics so we can
measure activation and retention. It is **off by default**, carries no personal
data, and is built to be disabled cleanly, so self-hosters and privacy-conscious
visitors are never opted in without choosing to be.

We use [Plausible](https://plausible.io): cookieless, no cross-site tracking,
and no consent banner required.

## How it is turned on

The web app reads two build-time environment variables (see
[`apps/web/.env.example`](../apps/web/.env.example)):

| Variable                    | Purpose                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `VITE_APP_ANALYTICS_DOMAIN` | The Plausible site domain. **Unset = analytics off.**                                               |
| `VITE_APP_ANALYTICS_SRC`    | The Plausible script URL. Defaults to Plausible cloud; self-hosters point it at their own instance. |

When `VITE_APP_ANALYTICS_DOMAIN` is empty or unset (the default for local dev,
CI, and any self-hoster who has not configured it), the app loads no script,
makes no network calls, and logs nothing. Production sets the domain in the
Vercel project.

The integration is a thin seam at
[`apps/web/src/lib/analytics`](../apps/web/src/lib/analytics), mirroring the
error-tracking seam: it is initialised once in `main.tsx` and is inert until
configured. Features never touch the analytics global directly.

## Do Not Track

If the visitor's browser sends a Do Not Track signal, the app does not load the
analytics script at all, regardless of configuration.

## What is collected

All of it is aggregate and cannot be tied back to an individual:

- Which pages are visited (the URL path), and the referring source.
- Browser, operating system, and device type (from the User-Agent).
- Approximate country or region, derived from the IP address, which is then
  discarded and never stored.
- Aggregate counts: visits, durations, entry and exit pages.

Single-page navigations are counted because Plausible's script hooks the History
API; no per-route wiring is needed.

## What is not collected

- No cookies and no browser-storage identifiers.
- No IP addresses at rest (used only in-memory to derive a country).
- No cross-site or cross-device tracking, and no persistent visitor identifier
  or fingerprint. Unique visitors are counted with a hash that rotates daily and
  cannot be reversed to a person.
- No personal data (PII). Any future custom events must keep to the same rule:
  no names, emails, tokens, or free-text in event properties.

## Retention

Retention of the aggregate data is a property of the Plausible instance: the
cloud plan's retention for the hosted deployment, or the operator's
configuration for a self-hosted one. The project-wide data-retention policy
(sessions, analytics, and user content together) is tracked in
[#363](https://github.com/iangoodnight/delve-moar/issues/363).

## Self-hosting

Self-hosters are opted out by default. To enable analytics against your own
Plausible instance, set `VITE_APP_ANALYTICS_DOMAIN` to your site and
`VITE_APP_ANALYTICS_SRC` to your instance's script URL. To keep it off, leave
`VITE_APP_ANALYTICS_DOMAIN` unset.
