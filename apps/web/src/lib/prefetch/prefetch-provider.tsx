import type { ReactNode } from 'react';

import type { PrefetchRegistry } from './prefetch-context';
import { PrefetchRegistryContext } from './prefetch-context';

interface PrefetchRegistryProviderProps {
  readonly children: ReactNode;
  readonly registry: PrefetchRegistry;
}

export function PrefetchRegistryProvider({
  children,
  registry,
}: Readonly<PrefetchRegistryProviderProps>) {
  return (
    <PrefetchRegistryContext value={registry}>
      {children}
    </PrefetchRegistryContext>
  );
}
