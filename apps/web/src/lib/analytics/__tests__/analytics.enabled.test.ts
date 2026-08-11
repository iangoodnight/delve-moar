import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// the global test setup imports the seam against the real env (no domain).
// reset the registry and re-import the seam with a mocked env so it resolves to
// one fresh graph with the analytics domain configured.
describe('analytics (domain set)', () => {
  let initAnalytics: () => void;
  let trackEvent: (
    name: string,
    props?: Record<string, string | number | boolean>,
  ) => void;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('@/config/env', () => ({
      env: {
        ANALYTICS_DOMAIN: 'delvemoar.com',
        ANALYTICS_SRC: 'https://plausible.io/js/script.js',
      },
    }));
    ({ initAnalytics, trackEvent } = await import('../analytics'));
  });

  afterEach(() => {
    document.head.querySelector('script[data-domain]')?.remove();
    Reflect.deleteProperty(window, 'plausible');
    Reflect.deleteProperty(window, 'doNotTrack');
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('injects the Plausible script once with the right attributes', () => {
    // second call is a no-op (module-level guard)
    initAnalytics();
    initAnalytics();

    const scripts = document.head.querySelectorAll('script[data-domain]');
    expect(scripts).toHaveLength(1);
    const script = scripts[0] as HTMLScriptElement;
    expect(script.dataset['domain']).toBe('delvemoar.com');
    expect(script.src).toBe('https://plausible.io/js/script.js');
    expect(script.defer).toBe(true);
  });

  it('does not inject the script when Do Not Track is set', () => {
    window.doNotTrack = '1';

    initAnalytics();

    expect(document.head.querySelector('script[data-domain]')).toBeNull();
  });

  it('trackEvent forwards custom events to Plausible', () => {
    const plausible = vi.fn();
    window.plausible = plausible;

    trackEvent('signup', { plan: 'free' });

    expect(plausible).toHaveBeenCalledWith('signup', {
      props: { plan: 'free' },
    });
  });
});
