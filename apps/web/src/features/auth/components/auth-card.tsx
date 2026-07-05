import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { Box, Flex } from '@/components/ui/layout';

interface AuthCardProps {
  readonly children: Readonly<ReactNode>;
}

export function AuthCard({ children }: Readonly<AuthCardProps>) {
  return (
    <Flex justify="center" py="6">
      <Box maxWidth="calc(var(--container-1) + var(--space-4))" width="100%">
        <Card size="4">{children}</Card>
      </Box>
    </Flex>
  );
}
