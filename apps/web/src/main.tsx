import '@radix-ui/themes/styles.css';
import '@/styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { env } from '@/config/env';
import { initAnalytics } from '@/lib/analytics';
import { initMonitoring } from '@/lib/monitoring';

import { App } from './app';

// initialize error tracking + analytics before the app renders; each is a
// no-op until its env var is set
initMonitoring();
initAnalytics();

if (env.FONT_SOURCE === 'google') {
  await import('@/styles/fonts.google.css');
} else {
  await import('@/styles/fonts.local.css');
}

const rootEl = document.getElementById('root');

if (rootEl === null) {
  throw new Error(
    'Root element #root not found. Verify index.html contains <div id="root">.',
  );
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// import axe last, so we don't get false positives before the app renders
if (import.meta.env.DEV) {
  const { default: axe } = await import('@axe-core/react');
  const { default: React } = await import('react');
  const { default: ReactDOM } = await import('react-dom');
  await axe(React, ReactDOM, 1_000);
}
