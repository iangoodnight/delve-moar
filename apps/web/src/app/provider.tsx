import '@radix-ui/themes/styles.css';
import '@/styles/typography.css';
import { Theme, ThemePanel } from '@radix-ui/themes';
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import { Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider } from 'react-helmet-async';

import { AppToaster } from '@/components/ui/toaster';
import {
  ApiError,
  getApiErrorMessage,
  INLINE_FIELD_ERROR_CODES,
} from '@/lib/api-client';
import { AuthProvider } from '@/lib/auth';
import { notify } from '@/lib/notifications';
import { queryConfig } from '@/lib/react-query';

interface AppProviderProps {
  readonly children: Readonly<ReactNode>;
}

export function AppProvider({ children }: Readonly<AppProviderProps>) {
  const [queryClient] = useState(() => {
    return new QueryClient({
      defaultOptions: queryConfig,
      // toast unexpected mutation failures; skip when the mutation opts out or
      // the code is a field-bound one a form already renders inline.
      mutationCache: new MutationCache({
        onError: (error, _variables, _context, mutation) => {
          if (mutation.meta?.suppressErrorToast === true) {
            return;
          }
          if (
            error instanceof ApiError &&
            INLINE_FIELD_ERROR_CODES.has(error.errorCode)
          ) {
            return;
          }
          notify.error(getApiErrorMessage(error));
        },
      }),
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
              <AuthProvider>{children}</AuthProvider>
              <AppToaster />
            </Theme>
          </QueryClientProvider>
        </HelmetProvider>
      </ErrorBoundary>
    </Suspense>
  );
}
