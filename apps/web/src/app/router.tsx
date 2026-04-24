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
}

function convert(queryClient: QueryClientType) {
  return ({
    clientLoader,
    clientAction,
    default: Component,
    ...rest
  }: RouteModule) => ({
    ...rest,
    ...(clientLoader && { loader: clientLoader(queryClient) }),
    ...(clientAction && { action: clientAction(queryClient) }),
    Component,
  });
}

function createAppRouter(queryClient: QueryClientType) {
  return createBrowserRouter([
    {
      path: paths.home.path,
      lazy: () => import('./routes/home-page').then(convert(queryClient)),
    },
    {
      path: '*',
      lazy: () => import('./routes/not-found').then(convert(queryClient)),
    },
  ]);
}

export const AppRouter = () => {
  const queryClient = useQueryClient();
  const router = useMemo(() => createAppRouter(queryClient), [queryClient]);
  return <RouterProvider router={router} />;
};
