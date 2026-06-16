import type { Breadcrumb, ErrorEvent } from '@sentry/react';
import * as Sentry from '@sentry/react';

import { env } from '@/config/env';

// Strip query strings before anything reaches Sentry. The verify-email and
// reset-password routes carry single-use tokens in the query, and breadcrumbs
// + the event request URL would otherwise leak them.
export function scrubUrlQuery(url: string): string;
export function scrubUrlQuery(url: string | undefined): string | undefined;
export function scrubUrlQuery(url?: string): string | undefined {
  if (url === undefined) {
    return undefined;
  }
  const queryIndex = url.indexOf('?');
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
}

function beforeSend(event: ErrorEvent): ErrorEvent {
  if (event.request?.url !== undefined) {
    event.request.url = scrubUrlQuery(event.request.url);
  }
  return event;
}

function beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const data = breadcrumb.data;
  if (data === undefined) {
    return breadcrumb;
  }
  for (const key of ['url', 'from', 'to'] as const) {
    const value: unknown = data[key];
    if (typeof value === 'string') {
      data[key] = scrubUrlQuery(value);
    }
  }
  return breadcrumb;
}

let initialized = false;

// thin seam over @sentry/react so features never import it directly. Inert
// until VITE_APP_SENTRY_DSN is set (unset in dev, CI, tests). Session Replay is
// intentionally not enabled (it captures the DOM); tracing is off (errors only)
// to stay within the free quota.
export function initMonitoring(): void {
  if (initialized || env.SENTRY_DSN === undefined) {
    return;
  }
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend,
    beforeBreadcrumb,
  });
  initialized = true;
}

export function captureError(error: unknown): void {
  if (env.SENTRY_DSN === undefined) {
    return;
  }
  Sentry.captureException(error);
}
