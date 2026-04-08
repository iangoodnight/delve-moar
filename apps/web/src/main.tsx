import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './app';

const rootEl = document.getElementById('root');

if (rootEl === null) {
  throw new Error(
    'Root element #root not found. Verify index.html contains <div id="root">.',
  );
}

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
