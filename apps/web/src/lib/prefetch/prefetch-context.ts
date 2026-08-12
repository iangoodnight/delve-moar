import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, use } from 'react';

export type PathPrefetch = (queryClient: QueryClient) => void;
export type PrefetchRegistry = Readonly<Record<string, PathPrefetch>>;

// component-free module so the provider file can export only its component
// (react-refresh/only-export-components); {} default = nothing registered
export const PrefetchRegistryContext = createContext<PrefetchRegistry>({});

export function usePathPrefetch(path: string): (() => void) | undefined {
  const registry = use(PrefetchRegistryContext);
  const queryClient = useQueryClient();
  const prefetch = registry[path];

  if (prefetch === undefined) {
    return undefined;
  }

  return () => {
    prefetch(queryClient);
  };
}
