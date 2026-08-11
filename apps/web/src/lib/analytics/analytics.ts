import { env } from '@/config/env';

// thin seam over Plausible so features never touch the global directly. Inert
// until VITE_APP_ANALYTICS_DOMAIN is set (unset in dev, CI, tests), and skipped
// entirely when the visitor sends Do Not Track. Plausible is cookieless and
// collects no PII; what is and is not collected lives in docs/analytics.md.

declare global {
  interface Window {
    // injected by the Plausible script once loaded; absent until then
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> },
    ) => void;
    // legacy DNT signal some older browsers expose on window
    doNotTrack?: string | null;
  }
}

// respect an explicit Do Not Track signal from the browser
function doNotTrackEnabled(): boolean {
  return (
    navigator.doNotTrack === '1' ||
    navigator.doNotTrack === 'yes' ||
    window.doNotTrack === '1'
  );
}

let initialized = false;

export function initAnalytics(): void {
  if (initialized || env.ANALYTICS_DOMAIN === undefined) {
    return;
  }
  if (doNotTrackEnabled()) {
    return;
  }
  // Plausible's script auto-tracks pageviews and hooks the History API, so SPA
  // route changes are counted without wiring the router.
  const script = document.createElement('script');
  script.defer = true;
  script.dataset['domain'] = env.ANALYTICS_DOMAIN;
  script.src = env.ANALYTICS_SRC;
  document.head.appendChild(script);
  initialized = true;
}

// custom-event seam for later activation/retention events; a no-op until the
// script has loaded (disabled, DNT, or not yet ready)
export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean>,
): void {
  window.plausible?.(name, props ? { props } : undefined);
}
