import type { Breadcrumb, BrowserOptions, ErrorEvent } from '@sentry/react';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The global test setup imports the seam against the real env (no DSN). Reset
// the registry and re-import the seam together with a Sentry mock so both
// resolve to one fresh graph with a DSN configured.
describe('monitoring (DSN set)', () => {
  let initMonitoring: () => void;
  let captureError: (error: unknown) => void;
  let init: Mock<(options: BrowserOptions) => unknown>;
  let captureException: Mock<(error: unknown) => string>;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('@/config/env', () => ({
      env: { SENTRY_DSN: 'https://key@example.test/1' },
    }));
    init = vi.fn();
    captureException = vi.fn(() => 'event-id');
    vi.doMock('@sentry/react', () => ({ init, captureException }));
    ({ initMonitoring, captureError } = await import('../monitoring'));
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('initializes once with tracing off and URL scrubbing wired', () => {
    // second call is a no-op (module-level guard)
    initMonitoring();
    initMonitoring();

    expect(init).toHaveBeenCalledTimes(1);
    const config = init.mock.calls[0]?.[0];
    expect(config?.dsn).toBe('https://key@example.test/1');
    expect(config?.tracesSampleRate).toBe(0);

    const event = {
      request: { url: 'https://delvemoar.com/verify-email?token=secret' },
    } as ErrorEvent;
    expect(config?.beforeSend?.(event, {})).toMatchObject({
      request: { url: 'https://delvemoar.com/verify-email' },
    });

    const crumb: Breadcrumb = {
      data: { url: 'https://delvemoar.com/reset-password?token=secret' },
    };
    expect(config?.beforeBreadcrumb?.(crumb, {})).toMatchObject({
      data: { url: 'https://delvemoar.com/reset-password' },
    });
  });

  it('forwards captured errors to Sentry', () => {
    const error = new Error('boom');

    captureError(error);

    expect(captureException).toHaveBeenCalledWith(error);
  });
});
