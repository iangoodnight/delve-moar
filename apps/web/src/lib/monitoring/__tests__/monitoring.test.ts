import * as Sentry from '@sentry/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { captureError, initMonitoring, scrubUrlQuery } from '../monitoring';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

// the test env sets no VITE_APP_SENTRY_DSN, so env.SENTRY_DSN is undefined and
// the seam stays inert. The active path is covered in monitoring.enabled.test.
describe('monitoring (no DSN)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not initialize Sentry when the DSN is unset', () => {
    initMonitoring();

    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('does not capture errors when the DSN is unset', () => {
    captureError(new Error('boom'));

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe('scrubUrlQuery', () => {
  it('returns undefined unchanged', () => {
    expect(scrubUrlQuery(undefined)).toBeUndefined();
  });

  it('leaves a URL without a query string alone', () => {
    expect(scrubUrlQuery('https://delvemoar.com/reset-password')).toBe(
      'https://delvemoar.com/reset-password',
    );
  });

  it('strips the query string (where reset/verify tokens live)', () => {
    expect(
      scrubUrlQuery('https://delvemoar.com/reset-password?token=secret123'),
    ).toBe('https://delvemoar.com/reset-password');
  });
});
