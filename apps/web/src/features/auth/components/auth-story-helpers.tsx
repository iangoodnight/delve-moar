import type { Decorator } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';

import { apiClient } from '@/lib/api-client';
import { AuthProvider } from '@/lib/auth';

// Shared axios mock for the auth stories. Stories configure it in beforeEach
// and the meta resets it between stories.
export const authMock = new MockAdapter(apiClient);

// User fixture for the authenticated stories.
export const DEMO_USER = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'mara',
  email: 'mara@example.com',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

// A reply that never settles, used to park a mutation in its pending state so
// the submitting/loading styling stays on screen.
export function pendingForever(): Promise<never> {
  return new Promise(() => undefined);
}

// Wrap a story in the query + auth providers the components need. The preview
// already supplies Theme and a MemoryRouter. A function expression (not an
// arrow) keeps the module-level no-arrow-const lint rule happy.
export const withAuthProviders: Decorator = function withProviders(Story) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Story />
      </AuthProvider>
    </QueryClientProvider>
  );
};
