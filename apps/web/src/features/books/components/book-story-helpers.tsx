import type { Decorator } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';

import { apiClient } from '@/lib/api-client';
import { AuthProvider } from '@/lib/auth';

import type { BookSummary } from '../api/get-books';

// Book components mount mutation hooks (create/update/delete) that need a
// QueryClient. The preview already supplies Theme and a MemoryRouter. A
// function expression (not an arrow) keeps the no-arrow-const lint rule happy.
export const withQueryClient: Decorator = function withQueryClient(Story) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <Story />
    </QueryClientProvider>
  );
};

// Adds the auth + query providers the AddToBookControl needs (it reads auth
// status and fetches owned books). The preview already supplies MemoryRouter.
export const withAuthProviders: Decorator = function withAuthProviders(Story) {
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

// Shared mock for stories that hit the API; stories configure it in beforeEach
// and the meta resets it between stories.
export const booksApiMock = new MockAdapter(apiClient);

export const DEMO_USER = {
  id: '99999999-9999-9999-9999-999999999999',
  username: 'mara',
  email: 'mara@example.com',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

export const DEMO_BOOK: BookSummary = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Curse of Strahd prep',
  slug: null,
  description: 'Stat blocks and items for the Barovia arc.',
  isPublic: false,
  isSystem: false,
  owner: { username: 'mara' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-06-27T00:00:00Z',
};
