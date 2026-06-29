import type { Decorator } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
