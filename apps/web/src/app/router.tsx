import type { QueryClient as QueryClientType } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import type { ComponentType } from 'react';
import { useMemo } from 'react';
import type { ActionFunction, LoaderFunction } from 'react-router-dom';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { paths } from '@/config/paths';

import AppRoot, { ErrorBoundary } from './routes/root';

interface RouteModule {
  default: ComponentType;
  clientLoader?: (queryClient: QueryClientType) => LoaderFunction;
  clientAction?: (queryClient: QueryClientType) => ActionFunction;
  ErrorBoundary?: ComponentType;
  HydrateFallback?: ComponentType;
}

function DefaultHydrateFallback() {
  return <h1>Loading...</h1>;
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
    ...(HydrateFallback && { HydrateFallback }),
    Component,
  });
}

function createAppRouter(queryClient: QueryClientType) {
  return createBrowserRouter([
    {
      Component: AppRoot,
      HydrateFallback: DefaultHydrateFallback,
      ErrorBoundary,
      children: [
        {
          path: paths.home.path,
          HydrateFallback: DefaultHydrateFallback,
          lazy: () => import('./routes/home-page').then(convert(queryClient)),
        },
        {
          path: paths.items.path,
          HydrateFallback: DefaultHydrateFallback,
          lazy: () => import('./routes/items/items').then(convert(queryClient)),
        },
        {
          path: paths.itemDetail.path,
          HydrateFallback: DefaultHydrateFallback,
          lazy: () =>
            import('./routes/items/item-detail').then(convert(queryClient)),
        },
        {
          path: paths.monsters.path,
          HydrateFallback: DefaultHydrateFallback,
          lazy: () =>
            import('./routes/monsters/monsters').then(convert(queryClient)),
        },
        {
          path: paths.monsterDetail.path,
          HydrateFallback: DefaultHydrateFallback,
          lazy: () =>
            import('./routes/monsters/monster-detail').then(
              convert(queryClient),
            ),
        },
        {
          path: paths.spells.path,
          HydrateFallback: DefaultHydrateFallback,
          lazy: () =>
            import('./routes/spells/spells').then(convert(queryClient)),
        },
        {
          path: paths.spellDetail.path,
          HydrateFallback: DefaultHydrateFallback,
          lazy: () =>
            import('./routes/spells/spell-detail').then(convert(queryClient)),
        },
        {
          path: '*',
          HydrateFallback: DefaultHydrateFallback,
          lazy: () => import('./routes/not-found').then(convert(queryClient)),
        },
      ],
    },
  ]);
}

export const AppRouter = () => {
  const queryClient = useQueryClient();
  const router = useMemo(() => createAppRouter(queryClient), [queryClient]);
  return <RouterProvider router={router} />;
};
