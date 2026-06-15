import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppProvider } from '../provider';
import { AppRouter } from '../router';

// Routes are lazy-loaded, so assertions use async findByRole to wait for
// the dynamic import to resolve and the component to mount.
describe('AppRouter', () => {
  it('renders the home page at /', async () => {
    window.history.pushState({}, '', '/');
    render(
      <AppProvider>
        <AppRouter />
      </AppProvider>,
    );
    // Brand mark is a link to "/", not an h1 (h1 is reserved for page topic).
    expect(
      await screen.findByRole('link', { name: /delvemoar.*home/i }),
    ).toBeInTheDocument();
  });

  it('renders the not-found page for an unknown path', async () => {
    window.history.pushState({}, '', '/this/does/not/exist');
    render(
      <AppProvider>
        <AppRouter />
      </AppProvider>,
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: /not found/i }),
    ).toBeInTheDocument();
  });

  it.each([
    ['/login', /log in/i],
    ['/signup', /create account/i],
    ['/forgot-password', /reset password/i],
    ['/reset-password', /invalid reset link/i],
    ['/verify-email', /invalid verification link/i],
  ])('renders the auth page at %s', async (path, heading) => {
    window.history.pushState({}, '', path);
    render(
      <AppProvider>
        <AppRouter />
      </AppProvider>,
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument();
  });

  it('redirects an anonymous visitor from /account to login', async () => {
    window.history.pushState({}, '', '/account');
    render(
      <AppProvider>
        <AppRouter />
      </AppProvider>,
    );
    // ProtectedRoute sends an unauthenticated visitor to the login page.
    expect(
      await screen.findByRole('heading', { level: 1, name: /log in/i }),
    ).toBeInTheDocument();
  });
});
