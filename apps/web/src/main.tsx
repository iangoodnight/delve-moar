import './styles/reset.css';
import './styles/tokens.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { env } from '@/config/env';

import { App } from './app';

if (env.FONT_SOURCE === 'google') {
  await import('./styles/fonts.google.css');
} else {
  await import('./styles/fonts.local.css');
}

if (import.meta.env.DEV) {
  const { default: axe } = await import('@axe-core/react');
  const { default: React } = await import('react');
  const { default: ReactDOM } = await import('react-dom');
  await axe(React, ReactDOM, 1000);
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
