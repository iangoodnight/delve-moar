import '@radix-ui/themes/styles.css';
import '@/styles/typography.css';
import { Theme, ThemePanel } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import { Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider } from 'react-helmet-async';

import { queryConfig } from '@/lib/react-query';

interface AppProviderProps {
  readonly children: Readonly<ReactNode>;
}

export function AppProvider({ children }: Readonly<AppProviderProps>) {
  const [queryClient] = useState(() => {
    return new QueryClient({
      defaultOptions: queryConfig,
    });
  });

  return (
    <Suspense
      fallback={
        <main>
          <h1>Loading...</h1>
        </main>
      }
    >
      <ErrorBoundary fallback={<div>Something went wrong.</div>}>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            {import.meta.env.DEV && <ReactQueryDevtools />}
            <Theme>
              {import.meta.env.DEV && <ThemePanel defaultOpen={false} />}
              {children}
            </Theme>
          </QueryClientProvider>
        </HelmetProvider>
      </ErrorBoundary>
    </Suspense>
  );
}
