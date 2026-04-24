import type { QueryClient as QueryClientType } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import type { ComponentType } from 'react';
import { useMemo } from 'react';
import type { ActionFunction, LoaderFunction } from 'react-router-dom';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { paths } from '@/config/paths';

interface RouteModule {
  default: ComponentType;
  clientLoader?: (queryClient: QueryClientType) => LoaderFunction;
  clientAction?: (queryClient: QueryClientType) => ActionFunction;
  ErrorBoundary?: ComponentType;
  HydrateFallback?: ComponentType;
}

// Rendered during the initial-load window between router mount and a
// lazy route module's first resolve. Individual route modules may export
// their own HydrateFallback to override this default (see convert()).
function DefaultHydrateFallback() {
  return <div>Loading...</div>;
}

function convert(queryClient: QueryClientType) {
  return ({
    clientLoader,
    clientAction,
    default: Component,
    HydrateFallback,
    ...rest
  }: RouteModule) => ({
    ...rest,
    ...(clientLoader && { loader: clientLoader(queryClient) }),
    ...(clientAction && { action: clientAction(queryClient) }),
    // Only override the static route's HydrateFallback when the module
    // explicitly exports one; otherwise leave the default in place.
    ...(HydrateFallback && { HydrateFallback }),
    Component,
  });
}

function createAppRouter(queryClient: QueryClientType) {
  // HydrateFallback on the static route config is what React Router renders
  // during the lazy-import window itself. The module's own HydrateFallback
  // (merged in by convert()) takes over once the module resolves, and is
  // used for any later pending-loader states.
  return createBrowserRouter([
    {
      path: paths.home.path,
      HydrateFallback: DefaultHydrateFallback,
      lazy: () => import('./routes/home-page').then(convert(queryClient)),
    },
    {
      path: '*',
      HydrateFallback: DefaultHydrateFallback,
      lazy: () => import('./routes/not-found').then(convert(queryClient)),
    },
  ]);
}

export const AppRouter = () => {
  const queryClient = useQueryClient();
  const router = useMemo(() => createAppRouter(queryClient), [queryClient]);
  return <RouterProvider router={router} />;
};
