import { afterEach, describe, expect, it } from 'vitest';

import { initAnalytics, trackEvent } from '../analytics';

// the test env sets no VITE_APP_ANALYTICS_DOMAIN, so env.ANALYTICS_DOMAIN is
// undefined and the seam stays inert. the active path is covered in
// analytics.enabled.test.
describe('analytics (no domain)', () => {
  afterEach(() => {
    document.head.querySelector('script[data-domain]')?.remove();
  });

  it('does not inject the script when the domain is unset', () => {
    initAnalytics();

    expect(document.head.querySelector('script[data-domain]')).toBeNull();
  });

  it('trackEvent is a no-op when the script has not loaded', () => {
    expect(() => {
      trackEvent('signup');
    }).not.toThrow();
  });
});
